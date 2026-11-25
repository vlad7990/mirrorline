/**
 * The xAI adapter, with the network and the disk replaced by fakes.
 *
 * What is worth testing here is not "does fetch work" but the four judgements
 * that are easy to get wrong and expensive to get wrong:
 *
 * 1. which provider error is a **refusal** (never retried) and which is a
 *    **failure** (retried),
 * 2. whether the recorded cost uses the duration that came **back** or the one
 *    we asked for,
 * 3. whether a poll that never finishes gives up rather than holding a job
 *    lease open,
 * 4. whether the key can escape into a `reason` that goes to the database.
 *
 * None of those needs a credential, and none of them would ever be checked if
 * the only way to run this adapter were to call the real API.
 */

import { describe, expect, test } from 'vitest'

import type { BrandKit, GenerationRequest } from '../types'
import {
  CLIP_POLL_TIMEOUT_MS,
  XAI_ADAPTER_NAME,
  XAI_CLIP_MODEL,
  XAI_IMAGE_MODEL,
  clipRequestBody,
  createXaiAdapter,
  imageRequestBody,
  isKeyRejection,
  isRefusalCode,
  parseClipPoll,
  xaiErrorCode,
  xaiErrorMessage,
} from './xai'

const KEY = 'test-key'

const BRAND: BrandKit = {
  brandName: 'Pawsitive Steps',
  look: 'muted sage and warm cream',
  captionStyle: 'bold lower-third',
  avoid: ['choke chains'],
}

const CLIP: GenerationRequest = {
  workspaceId: 'ws-1',
  beat: { ideaTitle: 'Three leash mistakes', label: 'Call to action' },
  prompt: 'A worn tennis ball on wet grass, shallow depth of field',
  brand: BRAND,
  kind: 'clip',
  aspectRatio: '9:16',
  seconds: 5,
  resolution: '720p',
}

const IMAGE: GenerationRequest = { ...CLIP, kind: 'image' }

/** A JSON response, as `fetch` would give one. */
function json(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response
}

/** A binary response carrying three bytes, so a download is observable. */
function bytes(ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => null,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  } as unknown as Response
}

interface Harness {
  readonly adapter: ReturnType<typeof createXaiAdapter>
  readonly calls: string[]
  readonly saved: { name: string; length: number }[]
}

/**
 * An adapter wired to scripted responses.
 *
 * `routes` is consulted in order of first match on the URL, so a test writes
 * only the responses it cares about. The clock advances by the poll interval on
 * every `sleep`, which is what lets the timeout be tested in microseconds
 * rather than in ninety seconds.
 */
function harness(
  routes: readonly { match: string; responses: Response[] }[],
  env: Record<string, string | undefined> = { XAI_API_KEY: KEY },
): Harness {
  const calls: string[] = []
  const saved: { name: string; length: number }[] = []
  const cursors = new Map<string, number>()
  let clock = 0

  const adapter = createXaiAdapter({
    fetchImpl: (async (input: string | URL | Request) => {
      const url = String(input)
      calls.push(url)

      const route = routes.find((candidate) => url.includes(candidate.match))
      if (!route) throw new Error(`no scripted response for ${url}`)

      const index = cursors.get(route.match) ?? 0
      cursors.set(route.match, index + 1)
      return route.responses[Math.min(index, route.responses.length - 1)] as Response
    }) as unknown as typeof fetch,
    saveBytes: async (payload, name) => {
      saved.push({ name, length: payload.length })
      return `/tmp/fake/${name}`
    },
    sleep: async (ms) => {
      clock += ms
    },
    now: () => new Date(clock),
    env,
  })

  return { adapter, calls, saved }
}

describe('the request bodies', () => {
  test('a clip asks for the model, the shape, the resolution and the duration', () => {
    expect(clipRequestBody(CLIP)).toMatchObject({
      model: XAI_CLIP_MODEL,
      aspect_ratio: '9:16',
      resolution: '720p',
      duration: 5,
    })
  })

  test('the prompt sent is the framed one, not the raw scene', () => {
    // `scenePrompt` appends the allow-list. Sending `request.prompt` instead
    // would drop it, and the first symptom would be a face in a clip rather
    // than anything that looks like a bug.
    const body = clipRequestBody(CLIP)

    expect(String(body.prompt)).toContain(CLIP.prompt)
    expect(String(body.prompt).toLowerCase()).toContain('no identifiable faces')
    expect(String(body.prompt).toLowerCase()).toContain('no logos')
  })

  test('an image asks for the low tier, because that is what the cap priced', () => {
    // `spend.ts` prices `low`. Asking for `medium` here would make the ledger
    // disagree with the invoice by 50% on every image, silently.
    expect(imageRequestBody(IMAGE)).toMatchObject({
      model: XAI_IMAGE_MODEL,
      quality: 'low',
      n: 1,
    })
  })

  test('an image body carries no duration, because a still has none', () => {
    expect(imageRequestBody(IMAGE)).not.toHaveProperty('duration')
  })
})

describe('isRefusalCode', () => {
  test('treats invalid_argument as a refusal', () => {
    // xAI folds "content blocked by moderation" into this code along with a
    // malformed request. Read as a refusal on purpose: the wrong guess costs
    // one wasted call, where the opposite retries a declined prompt and bills
    // for each attempt.
    expect(isRefusalCode('invalid_argument')).toBe(true)
  })

  test.each([['permission_denied'], ['failed_precondition'], ['service_unavailable'], [null]])(
    'treats %s as a failure rather than a refusal',
    (code) => {
      expect(isRefusalCode(code)).toBe(false)
    },
  )
})

describe('parseClipPoll', () => {
  test('reads a finished clip', () => {
    const result = parseClipPoll({
      status: 'done',
      video: { url: 'https://example.test/clip.mp4', duration: 4.8 },
    })

    expect(result).toMatchObject({
      status: 'done',
      url: 'https://example.test/clip.mp4',
      seconds: 4.8,
    })
  })

  test('reads a failure and its code', () => {
    const result = parseClipPoll({ status: 'failed', error: { code: 'invalid_argument' } })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('invalid_argument')
  })

  test.each([[null], ['nonsense'], [{}], [{ status: 'something-new' }]])(
    'treats the unrecognisable response %s as still pending, never as done',
    (raw) => {
      // Waiting one more interval costs three seconds. Treating an unfinished
      // render as finished produces an asset with no bytes behind it.
      expect(parseClipPoll(raw).status).toBe('pending')
    },
  )

  test('ignores a duration that is not a positive number', () => {
    expect(parseClipPoll({ status: 'done', video: { url: 'u', duration: 0 } }).seconds).toBeNull()
    expect(
      parseClipPoll({ status: 'done', video: { url: 'u', duration: 'five' } }).seconds,
    ).toBeNull()
  })
})

describe('generating a clip', () => {
  const ok = [
    { match: '/videos/generations', responses: [json({ request_id: 'req-1' })] },
    {
      match: '/videos/req-1',
      responses: [
        json({ status: 'pending' }),
        json({ status: 'done', video: { url: 'https://example.test/clip.mp4', duration: 4.8 } }),
      ],
    },
    { match: 'example.test/clip.mp4', responses: [bytes()] },
  ]

  test('submits, polls until done, downloads and labels the result', async () => {
    const { adapter, saved } = harness(ok)

    const result = await adapter.generate(CLIP)
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)

    expect(result.asset.label).toBe('AI-generated')
    expect(result.asset.source).toBe('ai-scene')
    expect(result.asset.provenance.adapter).toBe(XAI_ADAPTER_NAME)
    expect(result.asset.provenance.model).toBe(XAI_CLIP_MODEL)
    expect(result.asset.provenance.providerRequestId).toBe('req-1')
    expect(saved).toHaveLength(1)
    expect(saved[0]?.length).toBe(3)
  })

  test('bills the duration that came back, not the one we asked for', async () => {
    const { adapter } = harness(ok)

    const result = await adapter.generate(CLIP)
    if (result.status !== 'ok') throw new Error('expected ok')

    // 4.8 seconds at $0.03, not the 5 we requested. The difference is small and
    // the direction is the point: a ledger recording the request rather than
    // the response would drift from the invoice everywhere, invisibly.
    expect(result.asset.seconds).toBe(4.8)
    expect(result.asset.provenance.usd).toBeCloseTo(4.8 * 0.03, 10)
  })

  test('says nothing about a watermark, because the provider does not', async () => {
    const { adapter } = harness(ok)

    const result = await adapter.generate(CLIP)
    if (result.status !== 'ok') throw new Error('expected ok')

    expect(result.asset.provenance.providerWatermark).toBeNull()
  })

  test('a moderation block at submission is a refusal, costing nothing', async () => {
    const { adapter } = harness([
      {
        match: '/videos/generations',
        responses: [json({ error: { code: 'invalid_argument' } }, false, 400)],
      },
    ])

    const result = await adapter.generate(CLIP)

    expect(result.status).toBe('refused')
    if (result.status !== 'refused') throw new Error('unreachable')
    expect(result.provenance?.usd).toBe(0)
    expect(result.message).toMatch(/reword/i)
  })

  test('a moderation block while rendering is also a refusal', async () => {
    const { adapter } = harness([
      { match: '/videos/generations', responses: [json({ request_id: 'req-1' })] },
      {
        match: '/videos/req-1',
        responses: [json({ status: 'failed', error: { code: 'invalid_argument' } })],
      },
    ])

    expect((await adapter.generate(CLIP)).status).toBe('refused')
  })

  test('a server error is a failure, because that one is worth retrying', async () => {
    const { adapter } = harness([
      {
        match: '/videos/generations',
        responses: [json({ error: { code: 'service_unavailable' } }, false, 503)],
      },
    ])

    expect((await adapter.generate(CLIP)).status).toBe('failed')
  })

  test('gives up rather than polling forever, so a job lease is never held open', async () => {
    // The clip never finishes. Without a ceiling this loop would run until the
    // worker's lease expired and a second worker claimed the same job — two
    // renders, two bills, one button press. D136 is the scar tissue.
    const { adapter, calls } = harness([
      { match: '/videos/generations', responses: [json({ request_id: 'req-1' })] },
      { match: '/videos/req-1', responses: [json({ status: 'pending' })] },
    ])

    const result = await adapter.generate(CLIP)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('unreachable')
    expect(result.reason).toContain(String(CLIP_POLL_TIMEOUT_MS / 1000))
    // Bounded, and bounded by the interval rather than by luck.
    expect(calls.length).toBeLessThanOrEqual(CLIP_POLL_TIMEOUT_MS / 3000 + 2)
  })

  test('a clip that rendered but would not download is a failure, not a broken asset', async () => {
    const { adapter, saved } = harness([
      { match: '/videos/generations', responses: [json({ request_id: 'req-1' })] },
      {
        match: '/videos/req-1',
        responses: [
          json({ status: 'done', video: { url: 'https://example.test/clip.mp4', duration: 5 } }),
        ],
      },
      { match: 'example.test/clip.mp4', responses: [bytes(false, 404)] },
    ])

    expect((await adapter.generate(CLIP)).status).toBe('failed')
    // Nothing was written, so no asset points at an empty file.
    expect(saved).toHaveLength(0)
  })
})

/**
 * The error shape, pinned against what the live API really sends.
 *
 * Added after the first real call, on 25 November 2026, which answered:
 *
 * ```json
 * { "code": "invalid-argument", "error": "Incorrect API key provided." }
 * ```
 *
 * Two things in this adapter were written against the other shape and were
 * wrong in the same silent way: the code was read from `error.code`, which does
 * not exist there, and compared against `invalid_argument` with an underscore.
 * Both failures land on the *same* side — a provider refusal reported as
 * `failed` — and `failed` is the one outcome this product retries. Every test
 * in this file passed throughout.
 *
 * So both shapes are asserted. The nested one is what the SDKs document and may
 * still arrive; the flat one is what we have seen.
 */
describe('the error shape, both of them', () => {
  test('reads a top-level code, which is what the live API sends', () => {
    expect(xaiErrorCode({ code: 'invalid-argument', error: 'Incorrect API key provided.' })).toBe(
      'invalid-argument',
    )
  })

  test('reads a nested code, which is what the documentation shows', () => {
    expect(xaiErrorCode({ error: { code: 'invalid_argument', message: 'nope' } })).toBe(
      'invalid_argument',
    )
  })

  test('prefers the top-level one when a body somehow carries both', () => {
    expect(xaiErrorCode({ code: 'service-unavailable', error: { code: 'invalid_argument' } })).toBe(
      'service-unavailable',
    )
  })

  test('is null rather than undefined for a body with no code at all', () => {
    expect(xaiErrorCode({})).toBeNull()
    expect(xaiErrorCode(null)).toBeNull()
    expect(xaiErrorCode('a string')).toBeNull()
  })

  test('reads the message from either shape', () => {
    expect(xaiErrorMessage({ error: 'Incorrect API key provided.' })).toBe(
      'Incorrect API key provided.',
    )
    expect(xaiErrorMessage({ error: { message: 'filtered' } })).toBe('filtered')
    expect(xaiErrorMessage({})).toBeNull()
  })

  test('matches the refusal code in both spellings', () => {
    // The whole bug, in two assertions: the second used to be false.
    expect(isRefusalCode('invalid_argument')).toBe(true)
    expect(isRefusalCode('invalid-argument')).toBe(true)
  })

  test('does not match a code that merely looks similar', () => {
    expect(isRefusalCode('invalid_argument_type')).toBe(false)
    expect(isRefusalCode('service-unavailable')).toBe(false)
    expect(isRefusalCode(null)).toBe(false)
  })

  test('parseClipPoll reads a failure in the flat shape too', () => {
    const result = parseClipPoll({
      status: 'failed',
      code: 'invalid-argument',
      error: 'moderation declined this scene',
    })

    expect(result.errorCode).toBe('invalid-argument')
    expect(result.errorMessage).toBe('moderation declined this scene')
  })
})

describe('a rejected key, which wears a refusal’s clothes', () => {
  test('is told apart from a moderation block by its sentence', () => {
    expect(isKeyRejection('Incorrect API key provided. You can obtain an API key from …')).toBe(
      true,
    )
    expect(isKeyRejection('incorrect API KEY provided')).toBe(true)
    expect(isKeyRejection('moderation declined this scene')).toBe(false)
    expect(isKeyRejection(null)).toBe(false)
  })

  test('a clip submission answered that way fails rather than blaming the scene', async () => {
    const { adapter } = harness([
      {
        match: '/videos/generations',
        responses: [
          json({ code: 'invalid-argument', error: 'Incorrect API key provided.' }, false, 400),
        ],
      },
    ])

    const result = await adapter.generate(CLIP)

    // Not `refused`. A refusal would put "reword it" on screen and send
    // somebody to rewrite a prompt that was never the problem.
    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('unreachable')
    expect(result.reason).toContain('rejected the API key')
    expect(result.message).not.toMatch(/reword/i)
  })

  test('so does an image request', async () => {
    const { adapter } = harness([
      {
        match: '/images/generations',
        responses: [
          json({ code: 'invalid-argument', error: 'Incorrect API key provided.' }, false, 400),
        ],
      },
    ])

    const result = await adapter.generate({ ...CLIP, kind: 'image' })

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('unreachable')
    expect(result.reason).toContain('rejected the API key')
  })

  test('a moderation block is still a refusal, in the shape the API really uses', async () => {
    const { adapter } = harness([
      {
        match: '/videos/generations',
        responses: [
          json({ code: 'invalid-argument', error: 'the prompt was declined' }, false, 400),
        ],
      },
    ])

    const result = await adapter.generate(CLIP)

    expect(result.status).toBe('refused')
    if (result.status !== 'refused') throw new Error('unreachable')
    expect(result.provenance?.usd).toBe(0)
  })
})

describe('generating an image', () => {
  test('downloads and labels the result', async () => {
    const { adapter } = harness([
      {
        match: '/images/generations',
        responses: [json({ data: [{ url: 'https://example.test/still.jpg' }] })],
      },
      { match: 'example.test/still.jpg', responses: [bytes()] },
    ])

    const result = await adapter.generate(IMAGE)
    if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)

    expect(result.asset.kind).toBe('image')
    expect(result.asset.seconds).toBeNull()
    expect(result.asset.provenance.usd).toBeCloseTo(0.04, 10)
    expect(result.asset.label).toBe('AI-generated')
  })

  test('respect_moderation false is a refusal', async () => {
    const { adapter } = harness([
      {
        match: '/images/generations',
        responses: [
          json({ data: [{ url: 'https://example.test/x.jpg', respect_moderation: false }] }),
        ],
      },
    ])

    const result = await adapter.generate(IMAGE)

    expect(result.status).toBe('refused')
    if (result.status !== 'refused') throw new Error('unreachable')
    expect(result.provenance?.usd).toBe(0)
  })
})

describe('the key never escapes', () => {
  test('a thrown error contributes its class and nothing else', async () => {
    const adapter = createXaiAdapter({
      env: { XAI_API_KEY: KEY },
      fetchImpl: (async () => {
        // The shape of a real network error: a message carrying the URL it was
        // given. Copying a thrown message straight into `reason` is how a
        // bearer token reaches `agent_runs` and then a log aggregator.
        throw new TypeError(`fetch failed for ${KEY}`)
      }) as unknown as typeof fetch,
    })

    const result = await adapter.generate(CLIP)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('unreachable')
    expect(result.reason).toContain('TypeError')
    expect(result.reason).not.toContain(KEY)
    expect(result.message).not.toContain(KEY)
  })

  test('hasKey reads its own variable and not somebody else’s', () => {
    const adapter = createXaiAdapter()

    expect(adapter.hasKey({ XAI_API_KEY: 'k' })).toBe(true)
    expect(adapter.hasKey({ XAI_API_KEY: '   ' })).toBe(false)
    expect(adapter.hasKey({})).toBe(false)
    expect(adapter.hasKey({ ANTHROPIC_API_KEY: 'k' })).toBe(false)
  })

  test('asked to generate with no key, it fails rather than throwing', async () => {
    // Unreachable through the registry, which only picks an adapter whose
    // `hasKey` is true — but an adapter signals with its return value, and a
    // throw here would become an unhandled rejection in a worker.
    const { adapter } = harness([], {})

    const result = await adapter.generate(CLIP)

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('unreachable')
    expect(result.reason).toMatch(/no key/i)
  })
})

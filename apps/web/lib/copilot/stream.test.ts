/**
 * The browser's reader, driven by a fake `fetch`.
 *
 * Four things are worth holding here, and none of them is visible from the
 * server side of the contract:
 *
 * 1. **A rate limit is not a stream.** `respond.ts` answers 429 with JSON and
 *    a `retry-after`, so a reader that assumed NDJSON on every response would
 *    show nothing at all for the one failure visitors will actually hit.
 *    §3.3 asks it to say so rather than fail silently.
 * 2. **A cancelled read is not a failure.** Closing a tab mid-answer must not
 *    produce an error for nobody to see.
 * 3. **The question goes in the body.** Not the query string — §3.3 forbids
 *    logging questions against an identifier, and a URL is the most logged
 *    thing there is.
 * 4. **The surface picks the endpoint, and only the endpoint.** This reader
 *    was hard-coded to the site route; the studio uses the same wire format
 *    through the same `respond.ts`. The test that each surface asks its own
 *    route is what stops the generalisation quietly collapsing back to one.
 */

import { describe, expect, test } from 'vitest'

import type { CopilotEvent } from './events'
import { SITE_COPILOT_COPY } from './site-copilot-copy'
import {
  SITE_ENDPOINT,
  STATUS_ENDPOINT,
  STUDIO_ENDPOINT,
  readCopilotMode,
  streamCopilotAnswer,
  type AskCopilotOptions,
} from './stream'

function streamingResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

  return new Response(body, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}

async function collect(stream: AsyncGenerator<CopilotEvent>): Promise<CopilotEvent[]> {
  const events: CopilotEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

/**
 * The website's arguments, since most of these cases are about transport
 * rather than about which surface asked. The surface-specific tests pass
 * their own.
 */
function askSite(
  options: Omit<AskCopilotOptions, 'surface' | 'copy'>,
): AsyncGenerator<CopilotEvent> {
  return streamCopilotAnswer({ surface: 'site', copy: SITE_COPILOT_COPY, ...options })
}

/** Deliberately not the website's words, so a mix-up is visible. */
const STUDIO_COPY = {
  transportFailure: 'studio transport',
  rateLimited: 'studio rate limit',
} as const

const DONE_LINE = `${JSON.stringify({
  type: 'done',
  answer: {
    surface: 'site',
    mode: 'sample',
    text: 'The Growth plan includes twenty posts a month.',
    citations: [{ label: 'Plans', href: '/pricing' }],
    proposals: [],
    refusal: null,
    handoff: null,
  },
  usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0 },
  spendSummary: null,
})}\n`

describe('asking', () => {
  test('posts the question in the body, to the site endpoint', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = []
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return streamingResponse([DONE_LINE])
    }) as unknown as typeof fetch

    await collect(askSite({ question: 'What is the Growth plan?', fetchImpl }))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(SITE_ENDPOINT)
    expect(calls[0]?.init?.method).toBe('POST')
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ question: 'What is the Growth plan?' }))
    // The question never appears in the URL.
    expect(calls[0]?.url).not.toContain('Growth')
  })

  test('the studio asks its own endpoint, with the same reader', async () => {
    const calls: string[] = []
    const fetchImpl = (async (url: string) => {
      calls.push(url)
      return streamingResponse([DONE_LINE])
    }) as unknown as typeof fetch

    const events = await collect(
      streamCopilotAnswer({
        surface: 'studio',
        question: 'How is this week going?',
        copy: STUDIO_COPY,
        fetchImpl,
      }),
    )

    expect(calls).toEqual([STUDIO_ENDPOINT])
    // Same parsing, same events: the only thing the surface changed is the URL.
    expect(events.map((event) => event.type)).toEqual(['done'])
  })

  test('yields the events in the order they arrived, across chunk boundaries', async () => {
    const fetchImpl = (async () =>
      streamingResponse([
        '{"type":"meta","mode":"sample","notice":"Sample answer."}\n{"type":"delta","te',
        'xt":"The Growth plan"}\n',
        DONE_LINE,
      ])) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events.map((event) => event.type)).toEqual(['meta', 'delta', 'done'])
    expect(events[1]).toEqual({ type: 'delta', text: 'The Growth plan' })
  })

  test('reads a final line that arrives without a trailing newline', async () => {
    const fetchImpl = (async () =>
      streamingResponse([DONE_LINE.trimEnd()])) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events.map((event) => event.type)).toEqual(['done'])
  })
})

describe('when the request does not get through', () => {
  test('a rate limit is reported in the server’s own words', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ ok: false, error: 'Try again in a minute.' }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '41' },
      })) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events).toEqual([
      { type: 'error', kind: 'rate-limited', message: 'Try again in a minute.' },
    ])
  })

  test('a rate limit with an unreadable body falls back to the caller’s words', async () => {
    const fetchImpl = (async () =>
      new Response('<html>429</html>', { status: 429 })) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events).toEqual([
      { type: 'error', kind: 'rate-limited', message: SITE_COPILOT_COPY.rateLimited },
    ])
  })

  test('the studio’s fallback words are the studio’s, not the website’s', async () => {
    // The point of `copy` being an argument: the website offers a call and the
    // studio does not, and a lookup table inside the reader would have put
    // website prose in a module the studio imports.
    const fetchImpl = (async () =>
      new Response('<html>429</html>', { status: 429 })) as unknown as typeof fetch

    const events = await collect(
      streamCopilotAnswer({
        surface: 'studio',
        question: 'plans?',
        copy: STUDIO_COPY,
        fetchImpl,
      }),
    )

    expect(events).toEqual([{ type: 'error', kind: 'rate-limited', message: 'studio rate limit' }])
  })

  test('any other failure status becomes an error the panel can show', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ ok: false, error: 'We could not read that request.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch

    const events = await collect(askSite({ question: ' ', fetchImpl }))

    expect(events).toEqual([
      { type: 'error', kind: 'failed', message: 'We could not read that request.' },
    ])
  })

  test('a network failure is reported rather than thrown at the component', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events).toEqual([
      { type: 'error', kind: 'unreachable', message: SITE_COPILOT_COPY.transportFailure },
    ])
  })

  test('a 200 with no stream on it is a transport failure, not an empty answer', async () => {
    const fetchImpl = (async () =>
      ({ ok: true, status: 200, body: null }) as unknown as Response) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events).toEqual([
      { type: 'error', kind: 'unreachable', message: SITE_COPILOT_COPY.transportFailure },
    ])
  })

  test('an abort ends the stream quietly, because cancelling is not failing', async () => {
    const fetchImpl = (async () => {
      const aborted = new Error('The operation was aborted.')
      aborted.name = 'AbortError'
      throw aborted
    }) as unknown as typeof fetch

    const events = await collect(askSite({ question: 'plans?', fetchImpl }))

    expect(events).toEqual([])
  })
})

describe('reading the mode', () => {
  test('reports what the server says, from one endpoint for both surfaces', async () => {
    const calls: string[] = []
    const fetchImpl = (async (url: string) => {
      calls.push(url)
      return new Response(JSON.stringify({ mode: 'sample', capUsd: 20 }), { status: 200 })
    }) as unknown as typeof fetch

    expect(await readCopilotMode(fetchImpl)).toBe('sample')
    // Mode is a property of the server, not of a surface, which is why this
    // function lost the "site" in its name along with the hard-coded route.
    expect(calls).toEqual([STATUS_ENDPOINT])
  })

  test('returns null rather than guessing when the status call fails', async () => {
    // Null renders no badge at all. Guessing "live" would present a scripted
    // answer as a generated one, and guessing "sample" would do the reverse.
    const failing = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    expect(await readCopilotMode(failing)).toBeNull()

    const throwing = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    expect(await readCopilotMode(throwing)).toBeNull()
  })

  test('returns null for a mode it does not recognise', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ mode: 'demo' }), { status: 200 })) as unknown as typeof fetch

    expect(await readCopilotMode(fetchImpl)).toBeNull()
  })
})

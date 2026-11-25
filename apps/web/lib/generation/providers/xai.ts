/**
 * The xAI Grok Imagine adapter, and the only reader of `XAI_API_KEY`.
 *
 * Primary provider per D140. `grok-imagine-video-1.5-lite` for clips and
 * `grok-imagine-image-2.0` for images, both at 720p by default — see
 * `Resolution`'s header for why 1080p is not an option.
 *
 * ============================================================================
 * Everything except the network is testable, on purpose
 * ============================================================================
 *
 * An adapter that calls `fetch` and writes files directly can only be tested by
 * calling the real API, which costs money and needs a key — so in practice it
 * does not get tested, and the parts easiest to get wrong are the parts nobody
 * checks: which error code means "refused" rather than "failed", whether a poll
 * that never finishes gives up, whether the recorded cost uses the duration that
 * came back or the one we asked for.
 *
 * So the impure things are seams. `createXaiAdapter` takes a `fetchImpl`, a
 * `saveBytes` sink and a `sleep`, each with a real default, and `xai.test.ts`
 * passes fakes. The live call is then the only untested line, which is the
 * smallest that surface can be made.
 *
 * ============================================================================
 * The key is read here and nowhere else
 * ============================================================================
 *
 * `server-only.test.ts` asserts it by name over the real import graph, in the
 * "exactly one, named" form `lib/copilot/server-only.test.ts` uses for
 * `ANTHROPIC_API_KEY`. The key is never returned, never logged and never put in
 * an error message: a thrown `Error` carrying a bearer token ends up in a log
 * aggregator, which is the one place it must never be.
 */

import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { generationOutputDirectory } from '../asset-file'
import { promptRef } from '../prompt-ref'
import { scenePrompt } from '../safety'
import { billedGenerationUsd, projectGenerationUsd } from '../spend'
import {
  DEFAULT_CLIP_SECONDS,
  dimensionsFor,
  type EnvLike,
  type GenerationAdapter,
  type GenerationOutcome,
  type GenerationRequest,
  type Provenance,
} from '../types'

export const XAI_ADAPTER_NAME = 'xai'

export const XAI_CLIP_MODEL = 'grok-imagine-video-1.5-lite'
export const XAI_IMAGE_MODEL = 'grok-imagine-image-2.0'

const API_BASE = 'https://api.x.ai/v1'

/**
 * How long to keep asking before giving up on a clip.
 *
 * Clips are asynchronous: submit, then poll. Ninety seconds is generous for the
 * six-second clips we ask for and short enough to stay well inside the job
 * lease — `JOB_LEASE_SECONDS` is 1200 and `budget.test.ts` adds the agents'
 * budgets up against it, so a poll loop with no ceiling is how two workers end
 * up rendering and billing the same clip twice. That inequality has already
 * been got wrong once (D136); this is the half of it that lives here.
 */
export const CLIP_POLL_TIMEOUT_MS = 90_000

/** Between polls. Short enough to feel immediate, long enough not to hammer. */
export const CLIP_POLL_INTERVAL_MS = 3_000

/**
 * The image quality tier we buy.
 *
 * `low` at 1K is $0.04 against `medium`'s $0.06 — and a B-roll still is a
 * background behind captions, not a hero shot. `spend.ts` prices `low`, so
 * sending anything else here would make the cap disagree with the invoice.
 */
const IMAGE_QUALITY = 'low'

export interface XaiAdapterOptions {
  /** Defaults to global `fetch`. */
  readonly fetchImpl?: typeof fetch
  /**
   * Where the bytes go. Returns the location recorded on the asset.
   *
   * A seam rather than a hardcoded path because slice 1 has **no storage
   * bucket** — none exists in the tree, and `20261123020000_jobs.sql` is
   * explicit that adding one is "its own review". The default writes to a local
   * directory; when the VIDEO session's bucket lands, this is the one function
   * that changes and `location` becomes their `storagePath`.
   */
  readonly saveBytes?: (bytes: Uint8Array, suggestedName: string) => Promise<string>
  readonly sleep?: (ms: number) => Promise<void>
  /** Injectable so a test is not time-dependent. */
  readonly now?: () => Date
  /**
   * Where the key comes from. Defaults to `process.env`.
   *
   * A seam for the same reason `hasAnthropicKey` takes an `EnvLike`, and the
   * generation sweep made it mandatory rather than merely tidy: without it, a
   * test had to write `process.env.XAI_API_KEY = …` to exercise this adapter,
   * which made the *test file* a reader of the key — and
   * `server-only.test.ts` asserts that the readers are exactly one file, by
   * name. It failed, correctly, and the honest fix was this rather than an
   * exemption.
   *
   * It is better design independently. Mutating `process.env` in a test leaks
   * across files in the same worker, so the old shape was one `delete` away
   * from a neighbouring suite seeing a key it never set.
   */
  readonly env?: EnvLike
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Write to `GENERATION_OUTPUT_DIR`, or to the system temp directory.
 *
 * The directory moved to `asset-file.ts` in step 6, and took the reasoning that
 * used to be written here with it. Not tidiness: the route that serves these
 * bytes back has to resolve the same directory, and two expressions computing
 * "where did we put it" is a preview that 404s on a file sitting on disk — a
 * failure with no error attached to it.
 */
async function defaultSaveBytes(bytes: Uint8Array, suggestedName: string): Promise<string> {
  const directory = generationOutputDirectory()
  await mkdir(directory, { recursive: true })

  const file = path.join(directory, suggestedName)
  await writeFile(file, bytes)
  return file
}

/** The request body for a clip. Separated so a test can read it. */
export function clipRequestBody(request: GenerationRequest): Record<string, unknown> {
  return {
    model: XAI_CLIP_MODEL,
    // `scenePrompt`, never `request.prompt`. It appends the allow-list framing
    // — no identifiable faces, no logos, no on-screen text — which is cheaper
    // than being refused, and is the "told as well as checked" half of
    // `safety.ts`.
    prompt: scenePrompt(request),
    aspect_ratio: request.aspectRatio,
    resolution: request.resolution,
    duration: request.seconds ?? DEFAULT_CLIP_SECONDS,
  }
}

/** The request body for an image. */
export function imageRequestBody(request: GenerationRequest): Record<string, unknown> {
  return {
    model: XAI_IMAGE_MODEL,
    prompt: scenePrompt(request),
    aspect_ratio: request.aspectRatio,
    quality: IMAGE_QUALITY,
    n: 1,
  }
}

/**
 * Which failures are refusals.
 *
 * `invalid_argument` is xAI's documented code for "the request input is
 * invalid, such as an unsupported duration, an invalid image or video input, a
 * prompt that is too long, conflicting request modes, **or content blocked by
 * moderation**." So one code covers both a malformed request and a refused one.
 *
 * It is read as a **refusal**, and that is the cautious direction rather than
 * the convenient one. A refusal is never retried, so misreading a malformed
 * request as a refusal costs one wasted call and a slightly wrong sentence on a
 * screen; misreading a moderation block as a transient failure would retry a
 * prompt the provider has already declined, three times, and bill for each. The
 * other codes are unambiguous: `permission_denied` and `failed_precondition`
 * are ours to fix, and `service_unavailable` is worth another go.
 */
export function isRefusalCode(code: string | null): boolean {
  // Normalised, because the wire says `invalid-argument` and the documentation
  // says `invalid_argument`. Observed on 25 November 2026 against the real API:
  // `{"code":"invalid-argument","error":"Incorrect API key provided…"}`. Testing
  // one spelling meant the comparison never matched, so every provider refusal
  // came back as `failed` — and `failed` is the one outcome this product
  // retries. The module's own comment three paragraphs up says why that is the
  // expensive direction; it was describing a bug it had.
  return code !== null && code.replace(/-/g, '_') === 'invalid_argument'
}

/**
 * The error code in a response, whichever shape it arrived in.
 *
 * Two shapes, and we have now seen one of them. xAI's REST errors put the code
 * at the **top level** beside a string `error`:
 *
 * ```json
 * { "code": "invalid-argument", "error": "Incorrect API key provided." }
 * ```
 *
 * The OpenAI-compatible envelope — `{ "error": { "code": …, "message": … } }` —
 * is what the SDKs document and what this adapter was written against, and it
 * may still arrive from the chat-compatible endpoints. Both are read, top level
 * first, because that is the one observed from `/videos/generations`.
 *
 * Exported so a test can pin both, which is the only way this stays fixed: the
 * failure mode is silent, and a wrong answer here turns a refusal into a retry.
 */
export function xaiErrorCode(raw: unknown): string | null {
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  if (typeof body.code === 'string') return body.code

  const nested = (typeof body.error === 'object' && body.error !== null ? body.error : {}) as Record<
    string,
    unknown
  >

  return typeof nested.code === 'string' ? nested.code : null
}

/**
 * The provider's own sentence, for the log and never for a screen.
 *
 * Same two shapes: a string `error`, or a nested `error.message`.
 */
export function xaiErrorMessage(raw: unknown): string | null {
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  if (typeof body.error === 'string') return body.error

  const nested = (typeof body.error === 'object' && body.error !== null ? body.error : {}) as Record<
    string,
    unknown
  >

  return typeof nested.message === 'string' ? nested.message : null
}

/**
 * Is this `invalid-argument` about our credential rather than about the scene.
 *
 * **The one case where reading the message is the lesser evil.** xAI answers a
 * rejected API key with exactly the code it uses for a moderation block, so the
 * code alone cannot tell them apart — and they are opposite facts. A rejected
 * key reported as a refusal puts "the generator would not make that scene" on
 * screen and sends somebody to rewrite a prompt that was never the problem,
 * while the real fault is one line of configuration.
 *
 * Matching on the sentence is fragile and is why this is narrow: one phrase,
 * case-insensitive, and a miss costs only the wrong one of two no-cost
 * messages. Observed verbatim as "Incorrect API key provided."
 */
export function isKeyRejection(message: string | null): boolean {
  return message !== null && /incorrect api key/i.test(message)
}

interface ClipPollResult {
  readonly status: 'pending' | 'done' | 'failed'
  readonly url: string | null
  readonly seconds: number | null
  readonly errorCode: string | null
  readonly errorMessage: string | null
}

/**
 * Read a poll response without trusting its shape.
 *
 * Defensive for the reason `lib/engine/types.ts` gives about `summary.json`:
 * two sides, one format, no generated client between them. An unknown `status`
 * becomes `pending` rather than `done`, because the cost of waiting one more
 * interval is three seconds and the cost of treating an unfinished render as
 * finished is an asset with no bytes behind it.
 */
export function parseClipPoll(raw: unknown): ClipPollResult {
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const status = body.status === 'done' || body.status === 'failed' ? body.status : 'pending'

  const video = (typeof body.video === 'object' && body.video !== null ? body.video : {}) as Record<
    string,
    unknown
  >
  const seconds = Number(video.duration)

  return {
    status,
    url: typeof video.url === 'string' ? video.url : null,
    seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null,
    // Both shapes, through the shared readers. This used to reach for
    // `error.code` only, which is `undefined` against the shape the live API
    // actually sends.
    errorCode: xaiErrorCode(body),
    errorMessage: xaiErrorMessage(body),
  }
}

/** The one place `XAI_API_KEY` is read. `server-only.test.ts` asserts it. */
function apiKey(env: EnvLike): string | null {
  const key = env.XAI_API_KEY?.trim()
  return key ? key : null
}

/** What the client is told when a provider declines a scene. One sentence, one place. */
const DECLINED_MESSAGE =
  'The generator would not make that scene. Reword it — a different subject, or a wider shot, usually goes through.'

const UNREACHABLE_MESSAGE = 'We could not reach the generator just now. Try again shortly.'

/**
 * What a rejected key says, and it says nothing about the scene.
 *
 * The same sentence the no-key branch uses, because they are the same fact from
 * a client's point of view: generation is not configured here. The difference —
 * no key at all against a key the provider will not take — is in `reason`,
 * where whoever has to fix it will read it.
 */
const MISCONFIGURED_MESSAGE = 'Generation is not configured on this environment.'

export function createXaiAdapter(options: XaiAdapterOptions = {}): GenerationAdapter {
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  const saveBytes = options.saveBytes ?? defaultSaveBytes
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? (() => new Date())
  const environment = options.env ?? process.env

  function provenanceFor(request: GenerationRequest, usd: number, id: string | null): Provenance {
    return {
      adapter: XAI_ADAPTER_NAME,
      model: request.kind === 'clip' ? XAI_CLIP_MODEL : XAI_IMAGE_MODEL,
      requestedAt: now().toISOString(),
      usd,
      providerRequestId: id,
      // Not `false`, and not `true`. xAI's AUP forbids stripping "embedded
      // provenance metadata or watermarks", which implies something is there;
      // their watermarking documentation covers text and audio and says nothing
      // about images or video. `null` is the only honest answer, and the UI
      // reads it as "we label this ourselves".
      providerWatermark: null,
    }
  }

  async function post(
    endpoint: string,
    body: Record<string, unknown>,
    key: string,
  ): Promise<{ ok: boolean; status: number; json: unknown }> {
    const response = await doFetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    })

    const json = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, json }
  }

  async function finishClip(
    request: GenerationRequest,
    result: ClipPollResult,
    requestId: string,
    key: string,
  ): Promise<GenerationOutcome> {
    const reference = promptRef(request.prompt)

    const downloaded = await doFetch(result.url as string, {
      headers: { authorization: `Bearer ${key}` },
    })
    if (!downloaded.ok) {
      // The clip exists and has been billed. `failed` with a reason that does
      // not pretend nothing was spent is the honest version.
      return {
        status: 'failed',
        reason: `the clip rendered but could not be downloaded (HTTP ${downloaded.status})`,
        message: 'That scene rendered but we could not fetch it. Try again.',
        provenance: provenanceFor(request, 0, requestId),
      }
    }

    const bytes = new Uint8Array(await downloaded.arrayBuffer())
    const beatSlug = request.beat.label.toLowerCase().replace(/\s+/g, '-')
    const location = await saveBytes(bytes, `${reference}-${beatSlug}.mp4`)

    // **The duration that came back, not the one we asked for.** Per-second
    // billing means a five-second request can return 4.8 seconds, and a ledger
    // recording the guess would drift from the invoice in the direction hardest
    // to notice.
    const seconds = result.seconds ?? request.seconds ?? DEFAULT_CLIP_SECONDS
    const { width, height } = dimensionsFor(request.aspectRatio, request.resolution)

    return {
      status: 'ok',
      asset: {
        id: `${reference}-${beatSlug}`,
        kind: 'clip',
        location,
        width,
        height,
        seconds,
        beat: request.beat,
        promptRef: reference,
        source: 'ai-scene',
        label: 'AI-generated',
        provenance: provenanceFor(
          request,
          billedGenerationUsd('clip', request.resolution, seconds),
          requestId,
        ),
      },
    }
  }

  async function generateClip(request: GenerationRequest, key: string): Promise<GenerationOutcome> {
    const started = now().getTime()
    const submitted = await post('/videos/generations', clipRequestBody(request), key)

    const submittedBody = (
      typeof submitted.json === 'object' && submitted.json !== null ? submitted.json : {}
    ) as Record<string, unknown>
    const requestId = typeof submittedBody.request_id === 'string' ? submittedBody.request_id : null

    if (!submitted.ok || !requestId) {
      const code = xaiErrorCode(submittedBody)
      const detail = xaiErrorMessage(submittedBody)

      // A rejected credential wears the same code as a moderation block, and
      // calling it a refusal would send somebody to rewrite a prompt that was
      // never the problem. Checked before the refusal branch, because the
      // refusal branch would otherwise swallow it.
      if (isKeyRejection(detail)) {
        return {
          status: 'failed',
          reason: 'the provider rejected the API key',
          message: MISCONFIGURED_MESSAGE,
          provenance: provenanceFor(request, 0, null),
        }
      }

      return isRefusalCode(code)
        ? {
            status: 'refused',
            reason: 'the provider declined the scene at submission',
            message: DECLINED_MESSAGE,
            provenance: provenanceFor(request, 0, null),
          }
        : {
            status: 'failed',
            reason: `submitting the clip failed with HTTP ${submitted.status}${code ? ` (${code})` : ''}`,
            message: UNREACHABLE_MESSAGE,
            provenance: provenanceFor(request, 0, null),
          }
    }

    while (now().getTime() - started < CLIP_POLL_TIMEOUT_MS) {
      const polled = await doFetch(`${API_BASE}/videos/${requestId}`, {
        headers: { authorization: `Bearer ${key}` },
      })
      const result = parseClipPoll(await polled.json().catch(() => null))

      if (result.status === 'failed') {
        if (isKeyRejection(result.errorMessage)) {
          return {
            status: 'failed',
            reason: 'the provider rejected the API key mid-render',
            message: MISCONFIGURED_MESSAGE,
            provenance: provenanceFor(request, 0, requestId),
          }
        }

        return isRefusalCode(result.errorCode)
          ? {
              status: 'refused',
              reason: 'the provider declined the scene while rendering it',
              message: DECLINED_MESSAGE,
              provenance: provenanceFor(request, 0, requestId),
            }
          : {
              status: 'failed',
              reason: `the clip failed while rendering${result.errorCode ? ` (${result.errorCode})` : ''}`,
              message: 'That scene did not render. Try again, or reword it.',
              provenance: provenanceFor(request, 0, requestId),
            }
      }

      if (result.status === 'done' && result.url) {
        return finishClip(request, result, requestId, key)
      }

      await sleep(CLIP_POLL_INTERVAL_MS)
    }

    return {
      status: 'failed',
      reason: `the clip was still rendering after ${CLIP_POLL_TIMEOUT_MS / 1000}s and was abandoned`,
      message: 'That scene took too long to render. Try again, or make it simpler.',
      provenance: provenanceFor(request, 0, requestId),
    }
  }

  async function generateImage(request: GenerationRequest, key: string): Promise<GenerationOutcome> {
    const response = await post('/images/generations', imageRequestBody(request), key)
    const body = (
      typeof response.json === 'object' && response.json !== null ? response.json : {}
    ) as Record<string, unknown>

    const first = Array.isArray(body.data) ? body.data[0] : null
    const image = (typeof first === 'object' && first !== null ? first : {}) as Record<
      string,
      unknown
    >

    // `respect_moderation` is the documented flag on an image response: false
    // means the picture was filtered. A refusal, not an error.
    const moderated = image.respect_moderation === false || body.respect_moderation === false
    if (moderated) {
      return {
        status: 'refused',
        reason: 'the provider’s moderation filtered the image',
        message: DECLINED_MESSAGE,
        provenance: provenanceFor(request, 0, null),
      }
    }

    const url = typeof image.url === 'string' ? image.url : null
    if (!response.ok || !url) {
      const code = xaiErrorCode(body)
      const detail = xaiErrorMessage(body)

      // Before the refusal branch, for the reason the clip path gives: the two
      // arrive under one code and mean opposite things.
      if (isKeyRejection(detail)) {
        return {
          status: 'failed',
          reason: 'the provider rejected the API key',
          message: MISCONFIGURED_MESSAGE,
          provenance: provenanceFor(request, 0, null),
        }
      }

      return isRefusalCode(code)
        ? {
            status: 'refused',
            reason: 'the provider declined the image',
            message: DECLINED_MESSAGE,
            provenance: provenanceFor(request, 0, null),
          }
        : {
            status: 'failed',
            reason: `the image request failed with HTTP ${response.status}${code ? ` (${code})` : ''}`,
            message: UNREACHABLE_MESSAGE,
            provenance: provenanceFor(request, 0, null),
          }
    }

    const downloaded = await doFetch(url, { headers: { authorization: `Bearer ${key}` } })
    if (!downloaded.ok) {
      return {
        status: 'failed',
        reason: `the image was made but could not be downloaded (HTTP ${downloaded.status})`,
        message: 'That image was made but we could not fetch it. Try again.',
        provenance: provenanceFor(request, 0, null),
      }
    }

    const reference = promptRef(request.prompt)
    const beatSlug = request.beat.label.toLowerCase().replace(/\s+/g, '-')
    const bytes = new Uint8Array(await downloaded.arrayBuffer())
    const location = await saveBytes(bytes, `${reference}-${beatSlug}.jpg`)
    const { width, height } = dimensionsFor(request.aspectRatio, request.resolution)

    return {
      status: 'ok',
      asset: {
        id: `${reference}-${beatSlug}`,
        kind: 'image',
        location,
        width,
        height,
        seconds: null,
        beat: request.beat,
        promptRef: reference,
        source: 'ai-scene',
        label: 'AI-generated',
        provenance: provenanceFor(
          request,
          billedGenerationUsd('image', request.resolution, null),
          null,
        ),
      },
    }
  }

  return {
    name: XAI_ADAPTER_NAME,

    models: { clip: XAI_CLIP_MODEL, image: XAI_IMAGE_MODEL },

    hasKey: (candidate: EnvLike = environment) => apiKey(candidate) !== null,

    projectUsd: projectGenerationUsd,

    generate: async (request: GenerationRequest): Promise<GenerationOutcome> => {
      const key = apiKey(environment)
      if (!key) {
        // Unreachable through the registry, which only picks an adapter whose
        // `hasKey` is true. Returning rather than throwing keeps the contract —
        // an adapter signals with its return value — and `failed` rather than
        // `refused`, because nothing refused anything: we are misconfigured.
        return {
          status: 'failed',
          reason: 'the xAI adapter was asked to generate with no key configured',
          message: 'Generation is not configured on this environment.',
          provenance: null,
        }
      }

      try {
        return request.kind === 'clip'
          ? await generateClip(request, key)
          : await generateImage(request, key)
      } catch (error) {
        // **The message is ours, never the thrown one.** A network error can
        // carry a URL with a query string, and a thrown object from a fetch
        // layer can carry request headers — which is where the bearer token
        // lives. `reason` goes to `agent_runs.reason` and has to be safe to
        // read in a log, so only the error's *class* travels.
        return {
          status: 'failed',
          reason: `the generation call threw (${error instanceof Error ? error.name : 'unknown'})`,
          message: UNREACHABLE_MESSAGE,
          provenance: null,
        }
      }
    },
  }
}

/** The adapter the registry uses. */
export const xaiAdapter = createXaiAdapter()

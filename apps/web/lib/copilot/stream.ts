/**
 * The browser's half of **either** co-pilot: one POST, read line by line.
 *
 * Everything here runs in a tab. It never imports `adapter.ts` — not even for
 * a type — because that module reads the API key and `server-only.test.ts`
 * fails the build if a client module can reach it at any depth. The event
 * shape comes from `events.ts`, which exists for exactly this reason.
 *
 * ## One reader, two endpoints
 *
 * This was `site-stream.ts` and was hard-coded to `/api/copilot/site`. The
 * studio needs the same reader against `/api/copilot/studio`, and the wire
 * format is identical — `respond.ts` is shared, so the NDJSON, the 429 shape
 * and the `done` event are the same on both. Copying the file would have
 * meant two places to fix the next transport bug, and the `done` event is the
 * one carrying the whole answer.
 *
 * So the surface picks the endpoint and nothing else here knows which one it
 * is. The one genuine difference is **the words shown when the request does
 * not get through** — the website offers a call, the studio does not — and
 * that arrives as `copy` from the caller rather than being looked up here.
 * A lookup table would have put website prose inside a module the studio
 * imports, which is how a shared module quietly stops being shared.
 *
 * ## Why a generator
 *
 * The caller is a React component that wants to re-render per event, and an
 * `AsyncGenerator` is the smallest thing that gives it that: `for await` in
 * the component, no callbacks to unsubscribe, and cancellation is the
 * `AbortSignal` the DOM already has. It also makes this testable without a
 * browser — a fake `fetch` returning a stream of chunks drives the whole
 * thing.
 *
 * ## What is an event, and what is not
 *
 * A refusal, a handoff and "I cannot answer that from our pages" all arrive
 * as ordinary `done` events, because they are answers (18 §3.1). The only
 * things this module turns into an `error` event are the ways the request
 * itself does not get through: it was refused before it started (429), it
 * came back as something other than a stream, or the connection died
 * mid-answer. `transcript.ts` is where that distinction is rendered.
 */

import type { CopilotMode, CopilotSurface } from './canned'
import { type CopilotEvent, parseEventLine, splitLines } from './events'

export const SITE_ENDPOINT = '/api/copilot/site'
export const STUDIO_ENDPOINT = '/api/copilot/studio'
export const STATUS_ENDPOINT = '/api/copilot/status'

/**
 * Which route a surface asks.
 *
 * A `Record` over the surface union rather than a ternary, so adding a third
 * surface is a type error here instead of a silent fall-through to the site.
 */
export const COPILOT_ENDPOINTS: Readonly<Record<CopilotSurface, string>> = {
  site: SITE_ENDPOINT,
  studio: STUDIO_ENDPOINT,
}

/**
 * The two sentences a transport failure can need.
 *
 * Structural, so both copy modules satisfy it without importing anything from
 * here. These are the only words this module says, and it says neither of
 * them in its own voice.
 */
export interface TransportCopy {
  readonly transportFailure: string
  readonly rateLimited: string
}

export interface AskCopilotOptions {
  readonly surface: CopilotSurface
  readonly question: string
  /** What to say if the request does not get through. */
  readonly copy: TransportCopy
  /** Aborting stops the stream silently: a cancelled read is not a failure. */
  readonly signal?: AbortSignal
  /** Injected in tests. The browser's own `fetch` otherwise. */
  readonly fetchImpl?: typeof fetch
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Was this the caller cancelling, or something going wrong?
 *
 * Checked by `name`, which is what both the DOM and Node set on an abort, and
 * never by matching message text — the same rule 18 §7 sets for the SDK's
 * typed errors, for the same reason: message text is not an API.
 */
function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function transportFailure(copy: TransportCopy): CopilotEvent {
  return { type: 'error', kind: 'unreachable', message: copy.transportFailure }
}

/**
 * A non-200 turned into an event the panel can show.
 *
 * `respond.ts` answers a rate limit with JSON and a `retry-after`, not with a
 * stream, so this is where that lands. The server's own wording wins when
 * there is one — it knows how long the window has left — and the caller's copy
 * is the fallback for a response with nothing readable in it.
 */
async function httpFailure(response: Response, copy: TransportCopy): Promise<CopilotEvent> {
  let message: string | null = null
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && typeof body.error === 'string') message = body.error
  } catch {
    // A body that is not JSON tells us nothing we can show.
  }

  if (response.status === 429) {
    return {
      type: 'error',
      kind: 'rate-limited',
      message: message ?? copy.rateLimited,
    }
  }

  return {
    type: 'error',
    kind: 'failed',
    message: message ?? copy.transportFailure,
  }
}

/** Ask, and yield each event as it arrives. */
export async function* streamCopilotAnswer(
  options: AskCopilotOptions,
): AsyncGenerator<CopilotEvent> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const { copy } = options

  let response: Response
  try {
    response = await fetchImpl(COPILOT_ENDPOINTS[options.surface], {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: options.question }),
      signal: options.signal,
    })
  } catch (error: unknown) {
    if (isAbort(error)) return
    yield transportFailure(copy)
    return
  }

  if (!response.ok) {
    yield await httpFailure(response, copy)
    return
  }

  if (!response.body) {
    // A 200 with no stream is not something a visitor can act on, so it is
    // reported as the transport failure it is rather than as an empty answer.
    yield transportFailure(copy)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffered = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffered += decoder.decode(value, { stream: true })
      const split = splitLines(buffered)
      buffered = split.rest

      for (const line of split.lines) {
        const event = parseEventLine(line)
        if (event) yield event
      }
    }
  } catch (error: unknown) {
    if (isAbort(error)) return
    yield transportFailure(copy)
    return
  }

  // A last line with no newline after it. `respond.ts` terminates every line,
  // so this is belt and braces — and it is one line of code against losing
  // the `done` event, which is the one that carries the whole answer.
  const last = parseEventLine(buffered)
  if (last) yield last
}

/**
 * Which mode the server is in, or null when we could not find out.
 *
 * **Null is not "live".** §4 requires the UI to say when it is in sample
 * mode, and the only thing that knows is the server — the key never reaches a
 * bundle. So a failed status call renders no badge at all rather than a
 * guess, because the wrong guess in either direction is a lie: claiming a
 * sample answer was generated, or labelling a real answer as scripted.
 *
 * Was `readSiteMode`, and the name was already wrong: mode is a property of
 * the server, not of a surface, and `/api/copilot/status` has always answered
 * for both. Both panels read this one function.
 */
export async function readCopilotMode(fetchImpl?: typeof fetch): Promise<CopilotMode | null> {
  const run = fetchImpl ?? globalThis.fetch

  try {
    const response = await run(STATUS_ENDPOINT, { headers: { accept: 'application/json' } })
    if (!response.ok) return null

    const body: unknown = await response.json()
    const mode = isRecord(body) ? body.mode : null
    return mode === 'sample' || mode === 'live' ? mode : null
  } catch {
    return null
  }
}

/**
 * The browser's half of the website co-pilot: one POST, read line by line.
 *
 * Everything here runs in a tab. It never imports `adapter.ts` — not even for
 * a type — because that module reads the API key and `server-only.test.ts`
 * fails the build if a client module can reach it at any depth. The event
 * shape comes from `events.ts`, which exists for exactly this reason.
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

import type { CopilotMode } from './canned'
import { type CopilotEvent, parseEventLine, splitLines } from './events'
import { SITE_COPILOT_COPY } from './site-copilot-copy'

export const SITE_ENDPOINT = '/api/copilot/site'
export const STATUS_ENDPOINT = '/api/copilot/status'

export interface AskSiteOptions {
  readonly question: string
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

function transportFailure(): CopilotEvent {
  return { type: 'error', kind: 'unreachable', message: SITE_COPILOT_COPY.transportFailure }
}

/**
 * A non-200 turned into an event the panel can show.
 *
 * `respond.ts` answers a rate limit with JSON and a `retry-after`, not with a
 * stream, so this is where that lands. The server's own wording wins when
 * there is one — it knows how long the window has left — and our copy is the
 * fallback for a response with nothing readable in it.
 */
async function httpFailure(response: Response): Promise<CopilotEvent> {
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
      message: message ?? SITE_COPILOT_COPY.rateLimited,
    }
  }

  return {
    type: 'error',
    kind: 'failed',
    message: message ?? SITE_COPILOT_COPY.transportFailure,
  }
}

/** Ask, and yield each event as it arrives. */
export async function* streamSiteAnswer(options: AskSiteOptions): AsyncGenerator<CopilotEvent> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  let response: Response
  try {
    response = await fetchImpl(SITE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: options.question }),
      signal: options.signal,
    })
  } catch (error: unknown) {
    if (isAbort(error)) return
    yield transportFailure()
    return
  }

  if (!response.ok) {
    yield await httpFailure(response)
    return
  }

  if (!response.body) {
    // A 200 with no stream is not something a visitor can act on, so it is
    // reported as the transport failure it is rather than as an empty answer.
    yield transportFailure()
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
    yield transportFailure()
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
 */
export async function readSiteMode(fetchImpl?: typeof fetch): Promise<CopilotMode | null> {
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

/**
 * Events in, one question-and-answer out. Pure, so it can be tested.
 *
 * The panel is a `.tsx` file and therefore unreachable from Vitest
 * (`jsx: "preserve"`), so every rule about what the visitor ends up looking
 * at lives here instead of in the component. The component's whole job is to
 * render what this returns.
 *
 * ## The rule this module exists to hold
 *
 * **A refusal is an answer.** 18 §3.1: "I don't know, here is a person" is a
 * success state, and §3.2 calls the four refusals "the product". So a `done`
 * event carrying `refusal: 'guarantee'` and a handoff finishes as `answered`,
 * exactly like a quote from the pricing page does. Only an `error` event —
 * the model unreachable, the cap reached, the rate limit tripped — finishes
 * as `failed`. Getting this backwards would paint our most carefully written
 * answers red and tell the visitor that the thing which worked is broken.
 *
 * ## And the one it exists to make boring
 *
 * The deltas are a preview; `done.answer.text` is the answer. The stream is
 * replaced by it rather than appended to, so a dropped or duplicated chunk
 * cannot leave half a sentence on screen. Everything visible after `done` is
 * rebuilt from the one event that carries the whole thing.
 */

import type { Citation, CopilotMode, Handoff, RefusalKind } from './canned'
import type { CopilotErrorKind, CopilotEvent } from './events'

export type ExchangeStatus = 'streaming' | 'answered' | 'failed'

export interface ExchangeError {
  readonly kind: CopilotErrorKind
  readonly message: string
}

export interface Exchange {
  readonly id: string
  readonly question: string
  /** What to show now: the deltas while streaming, the answer once it lands. */
  readonly text: string
  readonly citations: readonly Citation[]
  /** Set when the answer is one of §3.2's refusals. Not a failure. */
  readonly refusal: RefusalKind | null
  readonly handoff: Handoff | null
  readonly status: ExchangeStatus
  readonly error: ExchangeError | null
  /** From the `meta` event: `sample` or `live`, never inferred by the client. */
  readonly mode: CopilotMode | null
  /** The sample-mode notice, when there is one. */
  readonly notice: string | null
}

export function startExchange(id: string, question: string): Exchange {
  return {
    id,
    question,
    text: '',
    citations: [],
    refusal: null,
    handoff: null,
    status: 'streaming',
    error: null,
    mode: null,
    notice: null,
  }
}

function withCitation(citations: readonly Citation[], citation: Citation): readonly Citation[] {
  // Deduped by destination: the same page cited twice in one answer is one
  // chip, and `done` repeats every citation the stream already sent.
  const already = citations.some(
    (entry) => entry.href === citation.href && entry.label === citation.label,
  )
  return already ? citations : [...citations, citation]
}

function mergeCitations(
  citations: readonly Citation[],
  incoming: readonly Citation[],
): readonly Citation[] {
  return incoming.reduce<readonly Citation[]>(
    (merged, citation) => withCitation(merged, citation),
    citations,
  )
}

/**
 * The next state of one exchange. Never mutates the one it is given.
 *
 * An event that arrives after the exchange has finished is ignored rather
 * than applied: the stream is closed by then, and the only ways to see one
 * are a duplicate or a late line, neither of which should rewrite a finished
 * answer.
 */
export function applyEvent(exchange: Exchange, event: CopilotEvent): Exchange {
  if (exchange.status !== 'streaming') return exchange

  switch (event.type) {
    case 'meta':
      return { ...exchange, mode: event.mode, notice: event.notice }

    case 'delta':
      return { ...exchange, text: exchange.text + event.text }

    case 'citation':
      return { ...exchange, citations: withCitation(exchange.citations, event.citation) }

    case 'proposal':
      // The website co-pilot may "answer, cite, hand off" and nothing else
      // (18 §1), and a proposal needs an Approve button wired to a real
      // mutation — which exists in the studio and nowhere on a public page.
      // So one is dropped here rather than rendered as a card that cannot do
      // anything. Proposals belong to the studio surface, which is C3.
      return exchange

    case 'done':
      return {
        ...exchange,
        text: event.answer.text,
        citations: mergeCitations(exchange.citations, event.answer.citations),
        refusal: event.answer.refusal,
        handoff: event.answer.handoff,
        mode: event.answer.mode ?? exchange.mode,
        // A refusal is an answer. §3.2 is the product, not the error path.
        status: 'answered',
      }

    case 'error':
      return {
        ...exchange,
        status: 'failed',
        error: { kind: event.kind, message: event.message },
      }

    default:
      return exchange
  }
}

/** Fold a whole stream at once. The same rules, for tests and replays. */
export function applyEvents(exchange: Exchange, events: readonly CopilotEvent[]): Exchange {
  return events.reduce(applyEvent, exchange)
}

/**
 * The failure the stream never got to report.
 *
 * A connection that drops mid-answer emits no `error` line — there is nothing
 * left to emit it on — so the caller would otherwise hold an exchange stuck
 * at `streaming` for ever. This closes it as failed, in the surface's own
 * words.
 */
export function failExchange(exchange: Exchange, error: ExchangeError): Exchange {
  if (exchange.status !== 'streaming') return exchange
  return { ...exchange, status: 'failed', error }
}

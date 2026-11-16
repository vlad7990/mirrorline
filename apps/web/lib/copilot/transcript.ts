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
 *
 * ## Proposals are kept, and the decision is kept with them
 *
 * This module used to **drop** `proposal` events, on the correct reasoning
 * that the website has no Approve button to wire one to. The studio does, so
 * the branch is now "accumulate" and the website panel simply renders nothing
 * for them — which is the right shape for a module shared by two surfaces:
 * it holds what arrived, and each panel decides what to show.
 *
 * The approve-or-dismiss decision lives here too, rather than in the panel's
 * own state, for the reason this whole file exists: the panel is a `.tsx` and
 * cannot be tested. 18 §2.3 is that the co-pilot "proposes; the person
 * disposes", and "nothing ran until Approve was pressed" has to be a test
 * rather than a promise. A decision that is already made cannot be remade, so
 * a second click on Approve cannot run an action twice.
 */

import type { Citation, CopilotMode, Handoff, Proposal, RefusalKind } from './canned'
import type { CopilotErrorKind, CopilotEvent } from './events'

export type ExchangeStatus = 'streaming' | 'answered' | 'failed'

export interface ExchangeError {
  readonly kind: CopilotErrorKind
  readonly message: string
}

/** What the person did with a proposal. `null` until they do something. */
export type ProposalDecision = 'approved' | 'dismissed'

/**
 * A proposal and what became of it.
 *
 * The proposal itself stays exactly as it arrived — §2.3's `requiresApproval`
 * is the literal `true` and carries no handler by design (D56) — so the
 * decision is held *beside* it rather than written into it. Nothing here can
 * turn a proposal into an action; the panel does that, once, on `approved`.
 */
export interface TrackedProposal {
  readonly proposal: Proposal
  readonly decision: ProposalDecision | null
}

export interface Exchange {
  readonly id: string
  readonly question: string
  /** What to show now: the deltas while streaming, the answer once it lands. */
  readonly text: string
  readonly citations: readonly Citation[]
  /**
   * What the co-pilot proposed, and what the person decided.
   *
   * Always accumulated, on both surfaces. The website panel renders none of
   * them — it has no Approve button and the server sends it none, which
   * `canned.test.ts` holds — so the empty array is the ordinary case there
   * rather than a special one.
   */
  readonly proposals: readonly TrackedProposal[]
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
    proposals: [],
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
 * The same identity question as a citation, and the same reason for asking it.
 *
 * The stream sends each proposal as its own event and `done` then repeats all
 * of them, so without this every proposal would appear twice — two Approve
 * buttons for one move, which is the worst possible duplicate to render.
 * Compared by content rather than by an id because a proposal has none: it is
 * three strings and a literal `true`.
 */
function isSameProposal(a: Proposal, b: Proposal): boolean {
  return a.kind === b.kind && a.summary === b.summary && a.detail === b.detail
}

function withProposal(
  tracked: readonly TrackedProposal[],
  proposal: Proposal,
): readonly TrackedProposal[] {
  // A repeat never resets a decision. If `done` re-sends a proposal the person
  // has already dismissed, it stays dismissed.
  const already = tracked.some((entry) => isSameProposal(entry.proposal, proposal))
  return already ? tracked : [...tracked, { proposal, decision: null }]
}

function mergeProposals(
  tracked: readonly TrackedProposal[],
  incoming: readonly Proposal[],
): readonly TrackedProposal[] {
  return incoming.reduce<readonly TrackedProposal[]>(
    (merged, proposal) => withProposal(merged, proposal),
    tracked,
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
      // Accumulated, not dropped. This branch used to return `exchange`
      // unchanged, because the website co-pilot may "answer, cite, hand off"
      // and nothing else (18 §1) and has no Approve button to wire one to.
      // That is still true of the website — and is now held where it belongs,
      // on the server: `canned.test.ts` asserts no site answer carries a
      // proposal, so the website panel is never handed one to ignore. A
      // client-side drop was protecting the website from a thing the server
      // does not send, at the cost of the studio needing its own transcript.
      return { ...exchange, proposals: withProposal(exchange.proposals, event.proposal) }

    case 'done':
      return {
        ...exchange,
        text: event.answer.text,
        citations: mergeCitations(exchange.citations, event.answer.citations),
        proposals: mergeProposals(exchange.proposals, event.answer.proposals),
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

/**
 * Record what the person decided about one proposal.
 *
 * **Returns the same exchange, unchanged, when there is nothing to decide** —
 * an index that does not exist, or a proposal already decided. That is the
 * load-bearing part, and the caller reads it: the panel only performs the
 * action when this returns a *changed* exchange, so a double-click, a
 * duplicated event or a re-render cannot run a move twice. 18 §2.3 asks for
 * "nothing ran until Approve" to be a test; this is the half of it that can
 * be one.
 *
 * Addressed by index rather than by a proposal id because proposals have no
 * id — §2.3's schema is three strings and a literal `true`, and inventing one
 * client-side would be inventing a key the server could not agree with.
 */
export function decideProposal(
  exchange: Exchange,
  index: number,
  decision: ProposalDecision,
): Exchange {
  const existing = exchange.proposals[index]
  if (!existing || existing.decision !== null) return exchange

  return {
    ...exchange,
    proposals: exchange.proposals.map((entry, at) =>
      at === index ? { ...entry, decision } : entry,
    ),
  }
}

/** Every proposal still waiting on a person. */
export function openProposals(exchange: Exchange): readonly TrackedProposal[] {
  return exchange.proposals.filter((entry) => entry.decision === null)
}

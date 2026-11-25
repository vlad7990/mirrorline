/**
 * The ideas that were written and not delivered (D131).
 *
 * ============================================================================
 * The bug this exists to make impossible
 * ============================================================================
 *
 * The first live report put **one** video under a heading that read "Your first
 * 3 videos · Three to film this week". Both halves were wrong the same way: the
 * agent is asked for four ideas, `screenIdeas` refused three of them, and the
 * screen described the plan rather than the result.
 *
 * Vlad's instruction allowed two answers — regenerate until three pass, or
 * "show the honest line". This is the second, and it is the one that still holds
 * once the first exists: a rewrite loop bounded by a time and a money budget can
 * still end with two, and the heading must not lie on that day either.
 *
 * ============================================================================
 * Read off the drafts rather than recomputed
 * ============================================================================
 *
 * D129 already stores every judged draft, refused ones included, with the
 * verdict beside it. So the withheld list is a projection of rows that exist
 * rather than a second record that could disagree with them — the same reason
 * `GateVerdict` renders the stored verdict instead of re-deriving the number.
 *
 * `null` from the read is not an empty list. A failed read means we cannot say
 * what was withheld, and the report says so rather than implying nothing was —
 * `04 §4`'s rule about invisible refusals, applied to the sentence that counts
 * them.
 */

import type { OriginalityOutcome } from '../originality/gate'

import type { DraftStatus, DraftSummary } from './types'

/** The statuses that mean "this never reached the client". */
const WITHHELD: readonly DraftStatus[] = ['rejected', 'blocked']

export interface WithheldIdea {
  readonly id: string
  readonly title: string
  /**
   * Why, in the gate's own words, or null when the row cannot say.
   *
   * From `body`, which holds the reason on a refused row. Null renders as a
   * refusal with no reason rather than as no refusal at all.
   */
  readonly reason: string | null
  /**
   * `blocked` is the gate's terminal state; `rejected` covers an originality
   * failure that could be rewritten, and a fact check that refused a draft the
   * gate had passed. Carried so the report can name which check spoke.
   */
  readonly status: DraftStatus
  readonly outcome: OriginalityOutcome | null
}

/**
 * Which of this report's drafts were withheld, oldest first.
 *
 * The order is the read's order, which is the order the ideas were written in —
 * so the list matches the numbering a reader would have seen had they all
 * passed.
 */
export function withheldFrom(drafts: readonly DraftSummary[]): readonly WithheldIdea[] {
  return drafts
    .filter((draft) => WITHHELD.includes(draft.status))
    .map((draft) => ({
      id: draft.id,
      title: draft.title,
      reason: draft.body,
      status: draft.status,
      outcome: draft.originality?.outcome ?? null,
    }))
}

/**
 * Which check refused this one, as a phrase for the sentence that names them.
 *
 * The gate runs before the fact check, so a draft carrying a **passing** verdict
 * was refused by the fact check and nothing else — that asymmetry is why
 * `write-drafts.ts` decides a status from the screening rather than from the
 * verdict, and it is the only way to tell the two apart after the fact.
 */
export function refusedBy(idea: WithheldIdea): string {
  if (idea.outcome === 'blocked' || idea.outcome === 'rewritten') return 'the Originality Gate'
  if (idea.outcome === 'passed') return 'the fact check'
  // No verdict at all. Honest about not knowing rather than picking one.
  return 'a check that recorded no verdict'
}

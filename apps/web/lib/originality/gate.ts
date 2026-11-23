/**
 * The Originality Gate (V3, D126).
 *
 * `04 §Originality Gate` calls it "the Compliance agent's first check, and the
 * one that decides whether a draft exists at all". This module is that
 * decision: given a draft and the things it must not resemble, it returns an
 * outcome, a number, the limit, and every line it objected to.
 *
 * ============================================================================
 * Three rules, and why one number was not enough
 * ============================================================================
 *
 * 1. **No sentence word for word.** V2's rule, and the only one that is not a
 *    threshold question: a lifted sentence is copying at any length over
 *    `MIN_SENTENCE_WORDS`, however small a share of the draft it is.
 * 2. **No long run of consecutive words.** The check a sentence comparison
 *    cannot make — ten identical words inside two sentences that differ at the
 *    eleventh. Rewording the end of a line is how copying happens by accident,
 *    and how it is disguised on purpose.
 * 3. **Phrasing overlap under the limit.** The headline percentage, against
 *    the closest source. Catches the draft that lifted nothing whole but was
 *    assembled out of the source's phrasing.
 *
 * Any one of the three fails the draft. They are not averaged into a single
 * score, because averaging lets a flagrant failure on one rule be paid for by
 * innocence on the others — and the three describe genuinely different ways of
 * copying something.
 *
 * ============================================================================
 * It fails closed, in four directions
 * ============================================================================
 *
 * A gate's defaults are its real policy, so: an empty draft fails, a draft
 * with **nothing to compare against** fails, an attempt number past the limit
 * is blocked rather than wrapped round to another rewrite, and a corpus that is
 * empty is reported as *not compared* rather than quietly counted as compared
 * and clean. `04 §4` is the reason — "a gate whose failures are invisible is
 * indistinguishable from a gate that never fires, which is precisely what the
 * predecessor project had."
 *
 * ============================================================================
 * There is no override, and that is a deliberate conflict resolution
 * ============================================================================
 *
 * `04 §Shared rules` says "Humans can override any decision, and the override
 * is logged." `04 §Originality Gate` says the opposite about this one check:
 * "there is no override — not from the Remake studio and not from anywhere
 * else", and `BACKEND_PHASE §V3` repeats it as "no warn-and-continue and no
 * override, from anywhere". The specific rule wins over the general one, so
 * **this module exports no way to turn a failure into a pass**: no `force`, no
 * `override`, no options bag. A caller who wants a draft approved has to
 * change the draft.
 *
 * `12 §3` adds the other half: "Blocked items are rewritten, never perturbed
 * to slip under the threshold." Nothing here suggests an edit that would lower
 * the number — the reasons name what was copied, and leave the writing to the
 * writer.
 */

import {
  longestSharedPhrase,
  MIN_SENTENCE_WORDS,
  normaliseForComparison,
  type SharedPhrase,
  sharedSentences,
  shingleOverlap,
} from './similarity'

/**
 * The phrasing-overlap limit, as a percentage of the draft.
 *
 * 30 is the number the studio has been showing since the Remake screens were
 * built (`components/remake/remake-plans.ts`), so it is adopted rather than
 * invented — a gate quietly using a different limit from the one on screen
 * would make the screen a lie. It is deliberately **not** tuned against a
 * corpus we do not have: when there are real drafts to measure, this is the
 * constant to revisit, with the measurement written down beside it.
 */
export const SIMILARITY_LIMIT = 30

/**
 * The longest run of consecutive words a draft may share with one source.
 *
 * Eight is a little past coincidence and well short of a lifted line.
 * `MIN_SENTENCE_WORDS` is five, and this sits above it on purpose: the
 * sentence rule already covers an exact short sentence, and this rule is for
 * the long near-miss.
 */
export const PHRASE_WORD_LIMIT = 8

/**
 * Two goes, then blocked.
 *
 * `04 §3`: "A draft that fails twice is blocked, and the Concierge is told.
 * Two failures mean the recipe is too close to its source to remake, not that
 * the writer was unlucky."
 */
export const MAX_ATTEMPTS = 2

/** How many words a sentence needs before the gate will call it copied. */
export { MIN_SENTENCE_WORDS }

/** One body of text a draft must not resemble, with the name to show a client. */
export interface ComparisonCorpus {
  /**
   * How to describe it to the client, in the second person — this is printed
   * in the studio as part of "compared against …".
   */
  readonly label: string
  /**
   * The texts themselves. **Expression only**: written lines, captions,
   * descriptions. Never beat labels — see the module header.
   */
  readonly texts: readonly string[]
}

/**
 * What the gate did.
 *
 * `passed` — approvable. `rewritten` — over the limit, goes back to V2 with
 * the reasons, and is not approvable. `blocked` — failed twice; terminal, and
 * the Concierge is told.
 *
 * These three names are the studio's existing vocabulary
 * (`components/remake/remake-plans.ts`), kept so that one idea has one set of
 * words.
 */
export type OriginalityOutcome = 'passed' | 'rewritten' | 'blocked'

export interface OriginalityVerdict {
  readonly outcome: OriginalityOutcome
  /** Phrasing overlap with the closest source, 0–100. The headline number. */
  readonly similarity: number
  /** The limit that number is judged against, carried so the UI cannot drift. */
  readonly limit: number
  /** The longest run of words shared with any one source. */
  readonly longestPhrase: SharedPhrase
  /** The limit `longestPhrase.words` is judged against. */
  readonly phraseWordLimit: number
  /** Sentences reused word for word, in the draft's own wording. */
  readonly copiedSentences: readonly string[]
  /** Every objection, in words a writer can act on. Empty when it passed. */
  readonly reasons: readonly string[]
  /** Which attempt this was. 1-based. */
  readonly attempt: number
  /** True when nothing further will happen: passed, or blocked for good. */
  readonly isTerminal: boolean
  /** Labels of the corpora that actually had text in them. */
  readonly comparedAgainst: readonly string[]
  /**
   * Labels of the corpora that were asked for and turned out empty.
   *
   * Reported rather than dropped, because `04 §1` says the comparison against
   * the client's own posts "matters as much as the first" — and we do not hold
   * those posts yet. A gate that silently omitted the half it could not do
   * would be claiming a check it never ran.
   */
  readonly notComparedAgainst: readonly string[]
}

export interface JudgeInput {
  /** The written draft: hook, lines, captions. Not the beat labels. */
  readonly draft: string
  readonly corpora: readonly ComparisonCorpus[]
  /** 1-based. At `MAX_ATTEMPTS` or beyond, a failure is terminal. */
  readonly attempt: number
}

/** Quote a line the way the reasons list quotes it. */
function quoted(text: string): string {
  return `"${text}"`
}

/** Does this corpus hold anything worth comparing against? */
function hasText(corpus: ComparisonCorpus): boolean {
  return corpus.texts.some((text) => normaliseForComparison(text) !== '')
}

/**
 * Judge a draft. Pure, deterministic, and with no way to pass a failure.
 *
 * Same draft, same corpora, same verdict — every time. Approval depends on this
 * verdict, so a sampled or time-dependent answer would turn "submit it again"
 * into a route through the gate.
 */
export function judgeOriginality({
  draft,
  corpora,
  attempt,
}: JudgeInput): OriginalityVerdict {
  const comparedAgainst = corpora.filter(hasText).map((corpus) => corpus.label)
  const notComparedAgainst = corpora
    .filter((corpus) => !hasText(corpus))
    .map((corpus) => corpus.label)

  const sources = corpora
    .flatMap((corpus) => corpus.texts)
    .filter((text) => normaliseForComparison(text) !== '')

  const copiedSentences = sharedSentences(draft, sources)
  const longestPhrase = longestSharedPhrase(draft, sources)
  const similarity = shingleOverlap(draft, sources)

  const reasons: string[] = []

  if (normaliseForComparison(draft) === '') {
    reasons.push('There is no draft to check.')
  }

  if (sources.length === 0) {
    reasons.push(
      'There was nothing to compare this draft against, so it cannot be cleared.',
    )
  }

  if (copiedSentences.length > 0) {
    const lines = copiedSentences.map(quoted).join('; ')
    reasons.push(
      copiedSentences.length === 1
        ? `This sentence appears in a source word for word: ${lines}. Write it again in your own words.`
        : `These sentences appear in a source word for word: ${lines}. Write them again in your own words.`,
    )
  }

  if (longestPhrase.words > PHRASE_WORD_LIMIT) {
    reasons.push(
      `${longestPhrase.words} consecutive words match a source, and the limit is ${PHRASE_WORD_LIMIT}: ${quoted(longestPhrase.phrase)}.`,
    )
  }

  if (similarity > SIMILARITY_LIMIT) {
    reasons.push(
      `${similarity}% of this draft's phrasing also appears in a source, and the limit is ${SIMILARITY_LIMIT}%.`,
    )
  }

  const measured = {
    similarity,
    limit: SIMILARITY_LIMIT,
    longestPhrase,
    phraseWordLimit: PHRASE_WORD_LIMIT,
    copiedSentences,
    attempt,
    comparedAgainst,
    notComparedAgainst,
  } as const

  if (reasons.length === 0) {
    return { ...measured, outcome: 'passed', reasons: [], isTerminal: true }
  }

  // `>=`, not `===`. A caller that lost count must not be able to buy a third
  // attempt, so anything at or past the limit is blocked rather than wrapped
  // round into another rewrite.
  const blocked = attempt >= MAX_ATTEMPTS

  return {
    ...measured,
    outcome: blocked ? 'blocked' : 'rewritten',
    reasons: blocked
      ? [
          ...reasons,
          'This draft has now failed the Originality Gate twice, so it is blocked and will not be rewritten again. The format is too close to its source to remake.',
        ]
      : reasons,
    isTerminal: blocked,
  }
}

/**
 * Is this verdict allowed to be approved? The only question a caller should
 * ask, and the one a server action asks before it writes anything.
 *
 * A function rather than an inline comparison so that "what counts as
 * approvable" has exactly one definition. `rewritten` and `blocked` are both
 * false, and there is no fourth answer.
 */
export function isApprovable(
  verdict: Pick<OriginalityVerdict, 'outcome'>,
): boolean {
  return verdict.outcome === 'passed'
}

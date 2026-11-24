/**
 * What a video idea is, and the two rules that decide whether it may ship.
 *
 * `BACKEND_PHASE §V2`: "a script generated from a recipe shares the recipe's
 * beat structure and **no sentence** with the source example, and a script
 * with no business fact is rejected rather than shipped."
 *
 * Both halves are implemented here as functions over data, not as instructions
 * in a prompt. A prompt is a request; a check is a rule. The model is told the
 * rules as well — a draft that passes first time is cheaper than one that gets
 * rejected — but the gate is this file.
 *
 * ## Why sentence-level, and why normalised
 *
 * D112's B8 principle and `12 §3`: we recreate **patterns, never expression**.
 * The beats are the pattern — "hook, setup, payoff, call to action" is nobody's
 * property — and the sentences are the expression. So the check is
 * sentence-level overlap against everything we hold from the source: its
 * description, its hook type, its beats.
 *
 * Normalisation (case, punctuation, whitespace) is what stops the check being
 * theatre: "The myth is on screen before the first word." and "the myth is on
 * screen before the first word" are the same sentence, and a strict comparison
 * calls them different.
 *
 * ## Where the comparison itself lives now (V3, D126)
 *
 * This file used to carry its own `normaliseSentence` and `sentencesOf`. V3's
 * gate needs the same notion of "the same sentence", and two normalisers would
 * be two answers to one question — so they moved to
 * `../originality/similarity`, which this file imports. The rules below are
 * unchanged; only the measuring stick is shared.
 */

import {
  type ComparisonCorpus,
  isApprovable,
  judgeOriginality,
  type OriginalityVerdict,
  parseVerdict,
} from '../originality/gate'
import { normaliseForComparison } from '../originality/similarity'

/** Four beats, in order. The recipe's shape, with the client's content. */
export interface VideoBeat {
  /** "Hook", "Setup", "Payoff", "Call to action". */
  readonly label: string
  /** What the client does or says in this beat. Their words, not a source's. */
  readonly text: string
}

export interface VideoIdea {
  readonly title: string
  /** The format this was built from, by name, so the report can link them. */
  readonly formatName: string
  /** The line that opens the video. */
  readonly hook: string
  readonly beats: readonly VideoBeat[]
  /** What they have to film. Plain instructions, not a shot list in jargon. */
  readonly footage: readonly string[]
  /**
   * The business fact this script stands on, taken from the profile.
   *
   * Required. `§V2`'s "at least one real business fact per script" is the
   * difference between a script about dog training and a script about *this*
   * trainer, and it is the one field that cannot be written without having
   * read the profile — which is why it is the field the gate checks.
   */
  readonly fact: string
  /**
   * What the Originality Gate said about this idea, or `null` (V3, D126).
   *
   * `null` means **not checked**, and the studio says exactly that rather than
   * leaving the space blank: a report written before V3 existed has no verdict,
   * and an absent verdict must never read as a clean one. `04 §4` — a gate
   * whose failures are invisible is indistinguishable from a gate that never
   * fires.
   *
   * Only `passed` verdicts are ever stored on a kept idea, because a failed
   * idea does not become a kept one. The field carries the number and the limit
   * so the studio shows the gate's own arithmetic rather than repeating it.
   */
  readonly originality: OriginalityVerdict | null
}

export interface RejectedIdea {
  readonly title: string
  readonly reason: string
}

export interface ScreenedIdeas {
  readonly kept: readonly VideoIdea[]
  /** Named and counted, never silently dropped. */
  readonly rejected: readonly RejectedIdea[]
}

function str(value: unknown, max = 400): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function parseBeat(value: unknown): VideoBeat | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  const label = str(row.label, 40)
  const text = str(row.text, 400)
  if (!label || !text) return null
  return { label, text }
}

export function parseVideoIdea(value: unknown): VideoIdea | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const title = str(row.title, 120)
  const formatName = str(row.formatName ?? row.format_name, 120)
  const hook = str(row.hook, 240)
  const fact = str(row.fact, 240)
  if (!title || !formatName || !hook || !fact) return null

  const beats = Array.isArray(row.beats)
    ? row.beats
        .map(parseBeat)
        .filter((beat): beat is VideoBeat => beat !== null)
        .slice(0, 6)
    : []

  const footage = Array.isArray(row.footage)
    ? row.footage
        .map((entry) => str(entry, 200))
        .filter((entry): entry is string => entry !== null)
        .slice(0, 6)
    : []

  // Fewer than three beats is not a recipe, it is a sentence. §V2 asks a
  // script to share the *structure* of the format it was built from.
  if (beats.length < 3) return null

  return {
    title,
    formatName,
    hook,
    beats,
    footage,
    fact,
    // Absent on a model's reply (it never writes this) and on any report
    // stored before V3. `parseVerdict` returns null rather than inventing one.
    originality: parseVerdict(row.originality),
  }
}

export function parseVideoIdeas(value: unknown): readonly VideoIdea[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseVideoIdea)
    .filter((idea): idea is VideoIdea => idea !== null)
    .slice(0, 6)
}

/**
 * Everything an idea actually says, as one piece of text for the gate.
 *
 * Title, hook, the beats' *text* and the footage notes — the written
 * expression. **The beats' labels are deliberately left out**: "Hook",
 * "Setup", "Payoff" and "Call to action" are the recipe's structure, which
 * `12 §3` says we are supposed to take, and feeding them to a similarity
 * measure would mean scoring a remake for doing its job (D126).
 */
export function ideaDraft(idea: VideoIdea): string {
  return [
    idea.title,
    idea.hook,
    ...idea.beats.map((beat) => beat.text),
    ...idea.footage,
  ].join('\n')
}

/**
 * Does the idea's `fact` actually come from the profile?
 *
 * Substring in either direction, on the normalised text: the model will write
 * "her reactive-dog intensive, $450 for four sessions" from a profile holding
 * "Reactive dog intensive" and "$450 for 4 sessions", and that is a fact used
 * properly rather than a new one invented. What it refuses is the fact that
 * appears nowhere in the profile — "she has trained over 500 dogs" — which is
 * exactly the plausible, unverifiable sentence a client would be quoted on.
 */
export function factIsGrounded(fact: string, facts: readonly string[]): boolean {
  const claimed = normaliseForComparison(fact)
  if (!claimed) return false

  return facts.some((known) => {
    const normalised = normaliseForComparison(known)
    if (normalised.length < 3) return false
    return claimed.includes(normalised) || normalised.includes(claimed)
  })
}

export interface ScreenInput {
  readonly ideas: readonly VideoIdea[]
  /**
   * What the draft must not resemble, each body of text with the name to show
   * the client. V3's shape: a labelled corpus rather than a bare string list,
   * so the studio can say *what* was compared — and so an empty one can be
   * reported as not compared rather than passing silently (D126).
   */
  readonly corpora: readonly ComparisonCorpus[]
  /** The client's own facts, from `profileFacts`. */
  readonly facts: readonly string[]
}

/**
 * The gate. Nothing reaches the report without passing both rules.
 *
 * No warn-and-continue and no override — `§V3` is explicit that a gate whose
 * failures are invisible is the predecessor project's gate. A rejected idea
 * comes back with its reason, so the run can log it and the report can say how
 * many were refused.
 *
 * **The originality half is V3's gate now** (D126). This function used to run
 * its own sentence-overlap check; `judgeOriginality` subsumes it and adds the
 * two rules a sentence comparison cannot make — the long near-miss and the
 * phrasing percentage. One draft, one gate, one vocabulary for the verdict.
 *
 * Every kept idea carries the verdict that cleared it, so the number the
 * studio shows is the number the gate used rather than a second computation
 * that could disagree with it.
 *
 * `attempt: 1` is correct here and is not a placeholder: these are freshly
 * drafted ideas, and the first failure is a rewrite. The rewrite loop that
 * would pass `2` needs somewhere to store an attempt count between runs, which
 * is the next piece of V3 and not this one — so today a failed idea is
 * refused and logged rather than silently retried, which is the safe half of
 * the behaviour.
 */
export function screenIdeas({ ideas, corpora, facts }: ScreenInput): ScreenedIdeas {
  const kept: VideoIdea[] = []
  const rejected: RejectedIdea[] = []

  for (const idea of ideas) {
    const verdict = judgeOriginality({
      draft: ideaDraft(idea),
      corpora,
      attempt: 1,
    })

    if (!isApprovable(verdict)) {
      rejected.push({ title: idea.title, reason: verdict.reasons.join(' ') })
      continue
    }

    if (!factIsGrounded(idea.fact, facts)) {
      rejected.push({
        title: idea.title,
        reason: `the fact "${idea.fact}" is not in the client's profile`,
      })
      continue
    }

    kept.push({ ...idea, originality: verdict })
  }

  return { kept, rejected }
}

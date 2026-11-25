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

import { factIsGrounded } from './fact-check'

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
  /**
   * What the gate said, carried on the refusal as well as on the keeper (D129).
   *
   * It used to be dropped, and that is what made V3's first done-when true of
   * the mechanism and false of the screen: a blocked draft never reached the
   * database, so the studio could render a block perfectly and was never given
   * one. `write-drafts.ts` stores this, and the client sees the number and the
   * limit on the draft that failed rather than a count in a log line.
   *
   * **It is not always a failing verdict.** The gate runs first, so an idea
   * refused for an ungrounded fact carries a *passing* originality verdict —
   * which is why the status a refused draft gets is decided by whether it was
   * refused, not by reading this field.
   */
  readonly originality: OriginalityVerdict | null
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

/**
 * The label the beats are asked to carry for the opening line.
 *
 * `SCRIPT_SYSTEM` tells the model "four beats, labelled Hook, Setup, Payoff and
 * Call to action", and `VideoIdea.hook` is a *separate* field holding the same
 * opening line. So a correctly-written idea has the word in two places, and the
 * report printed both: "Hook:" twice on every video (D131).
 */
const HOOK_LABEL = 'hook'

/**
 * A label the model wrote into the value as well as into the key.
 *
 * `"hook": "Hook: your dog is not stubborn"` is the other way the word doubles
 * up, and it is the same bug one layer down — a field that already says what it
 * is, saying it again. Stripped at parse time so neither the screen nor the
 * gate's `ideaDraft` carries it: a label is structure, and D126 is explicit that
 * structure is not what a similarity check should be measuring.
 */
function stripLeadingLabel(text: string, label: string): string {
  const prefix = new RegExp(`^\\s*${label}\\s*[:—–-]\\s*`, 'i')
  const stripped = text.replace(prefix, '').trim()
  // A hook that was *only* the word "Hook:" is not improved by becoming empty.
  return stripped.length > 0 ? stripped : text
}

/**
 * Do these two lines say the same thing?
 *
 * Normalised containment in either direction, the same latitude
 * `factIsGrounded` allows: the Hook beat is often the hook line with a stage
 * direction attached, and "say it straight to camera: your dog is not stubborn"
 * contains the hook rather than equalling it.
 *
 * Deliberately **not** a similarity score. This decides whether a line is
 * redundant on a screen, and a threshold would mean a beat disappearing because
 * it was 0.8 of the way to being a duplicate.
 */
export function saysTheSameAs(text: string, other: string): boolean {
  const left = normaliseForComparison(text)
  const right = normaliseForComparison(other)
  if (left.length === 0 || right.length === 0) return false
  return left.includes(right) || right.includes(left)
}

export interface SplitBeats {
  /**
   * The Hook-labelled beat, when it says something the hook line does not.
   *
   * Null both when there is no such beat and when it merely repeats the hook —
   * the caller renders one hook line either way, and only has to decide whether
   * there is a second sentence to put under it.
   */
  readonly hookBeat: VideoBeat | null
  /** Every other beat, in order. What the numbered list renders. */
  readonly rest: readonly VideoBeat[]
}

/**
 * Pull the Hook beat out of the list so the word is printed once (D131).
 *
 * The report gives the hook its own line on purpose — "the hook is the video" —
 * and then listed the beats underneath, including the one labelled Hook. Both
 * halves are worth keeping: the line is what a client reads first, and the beat
 * sometimes carries a direction the line does not. What is not worth keeping is
 * the label, twice, four lines apart.
 *
 * Only the first Hook-labelled beat is lifted. A second one is a malformed idea,
 * and dropping it silently would hide content; it stays in `rest`, where it is
 * visible.
 */
export function splitHookBeat(beats: readonly VideoBeat[], hook: string): SplitBeats {
  const index = beats.findIndex((beat) => beat.label.trim().toLowerCase() === HOOK_LABEL)
  if (index === -1) return { hookBeat: null, rest: beats }

  const beat = beats[index]
  const rest = beats.filter((_, position) => position !== index)

  return {
    hookBeat: beat !== undefined && !saysTheSameAs(beat.text, hook) ? beat : null,
    rest,
  }
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
  const written = str(row.hook, 240)
  const fact = str(row.fact, 240)
  if (!title || !formatName || !written || !fact) return null

  // Stripped here rather than in the component, so a report stored with the
  // doubled label reads correctly on the screen it was already saved for.
  const hook = stripLeadingLabel(written, HOOK_LABEL)

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
 * **Moved to `fact-check.ts` (D133).** It used to be two-directional substring
 * containment right here, and that refused three of Maya Torres Coaching's own
 * facts on the first live run — "Private reactive-dog sessions **are** $150 per
 * session" against a profile holding "Private reactive-dog sessions, $150 per
 * session" is one inserted word apart and fails containment both ways.
 *
 * Re-exported rather than relocated silently, because `screenIdeas` below is the
 * only caller that matters and the name is the one `§V2` is written about.
 */
export { factIsGrounded }

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
      rejected.push({
        title: idea.title,
        reason: verdict.reasons.join(' '),
        originality: verdict,
      })
      continue
    }

    if (!factIsGrounded(idea.fact, facts)) {
      rejected.push({
        title: idea.title,
        reason: `the fact "${idea.fact}" is not in the client's profile`,
        // The gate passed this one; the fact check did not. Carried anyway, so
        // the studio can show that the originality half was run and what it
        // found — a verdict omitted because a *different* rule refused the
        // draft would read as a check that never happened.
        originality: verdict,
      })
      continue
    }

    kept.push({ ...idea, originality: verdict })
  }

  return { kept, rejected }
}

/**
 * Every idea's fate, one line each, for the log (D131).
 *
 * "Log the per-idea outcome" — Vlad, after the first live report delivered one
 * video out of four drafted. What existed was a `console.warn` per refusal and a
 * count in `agent_runs.reason`, which answers "how many" and not "which, and
 * why". Reading the Railway log for that scan told you three were refused and
 * nothing about what the gate objected to in any of them.
 *
 * Two things are logged that the old lines could not say:
 *
 *  * **The kept ideas, with their numbers.** A passing verdict is evidence the
 *    gate ran, and a report that shows three videos with no log of the three
 *    verdicts is a report whose gate cannot be audited after the fact.
 *  * **The ones held back by the cap.** `IDEAS_KEPT` slices the survivors, so a
 *    run that passed four and kept three dropped one *for no quality reason*.
 *    That is fine and it must not look like a refusal.
 *
 * Returned rather than printed, so this is a pure function the tests can read.
 * The caller prefixes and emits.
 */
export function outcomeLines(
  drafted: readonly VideoIdea[],
  screened: ScreenedIdeas,
  kept: readonly VideoIdea[],
): readonly string[] {
  const spare = screened.kept.length - kept.length

  const summary =
    `drafted ${drafted.length} · kept ${kept.length} · refused ${screened.rejected.length}` +
    (spare > 0 ? ` · ${spare} passed and were held back by the cap` : '')

  const keptLines = kept.map((idea) => {
    const verdict = idea.originality
    const numbers = verdict
      ? `${verdict.similarity}% shared, limit ${verdict.limit}%`
      : 'no verdict recorded'
    return `kept "${idea.title}" — ${numbers}`
  })

  const refusedLines = screened.rejected.map(
    (rejection) => `refused "${rejection.title}" — ${rejection.reason}`,
  )

  return [summary, ...keptLines, ...refusedLines]
}

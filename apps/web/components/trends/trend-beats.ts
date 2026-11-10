/**
 * Labels shared by the S4 trend board and the S5 remake studio: the beats of
 * a format, and the client's first name.
 *
 * A beat is a description of a format, never a piece of anyone's video.
 * CLAUDE.md non-negotiable 1 and DESIGN.md "Don't": "Don't show a trend as
 * someone else's video; show the format as an abstract storyboard."
 *
 * The fixtures write beats in running case ("common belief"); screens show
 * them as labels, so the first letter is lifted here rather than in the data.
 */

import { workspace, type TrendBeat } from '@mirrorline/mock'

/** Leading quotes in a label, e.g. '"here\'s what\'s true"'. */
const QUOTE_CHARS = new Set(['"', '“', "'", '‘'])

/** DESIGN.md "Trend card": "an abstract 4-frame storyboard". */
const MAX_STORYBOARD_FRAMES = 4

/**
 * Lifts the first letter, leaving anything that is not a letter alone, so
 * "3-word reframe" keeps its lower-case w.
 */
export function sentenceCase(text: string): string {
  const first = text[0]
  if (first === undefined) return text

  const at = QUOTE_CHARS.has(first) ? 1 : 0
  const letter = text[at]
  if (letter === undefined) return text
  // Digits and punctuation have no case of their own; leave them as written.
  if (letter.toLowerCase() === letter.toUpperCase()) return text

  return text.slice(0, at) + letter.toUpperCase() + text.slice(at + 1)
}

/**
 * "Maya", for "Fit for Maya" and "Maya's version". Derived from the fixture
 * so the demo client is named in exactly one place.
 */
export const OWNER_FIRST_NAME: string =
  workspace.ownerName.split(' ')[0] ?? workspace.ownerName

/** The label a screen prints for one beat. */
export function beatName(beat: TrendBeat): string {
  return sentenceCase(beat.label)
}

export interface StoryboardBeatLabel {
  readonly label: string
}

/**
 * The frames for one trend card. The storyboard stays a single row of four,
 * so a longer recipe keeps its opening beats and its ending; the full set of
 * beats is listed, with timings, in the remake studio.
 */
export function storyboardBeats(beats: readonly TrendBeat[]): readonly StoryboardBeatLabel[] {
  const named = beats.map((beat) => ({ label: beatName(beat) }))
  if (named.length <= MAX_STORYBOARD_FRAMES) return named

  const last = named[named.length - 1]
  if (last === undefined) return named

  return [...named.slice(0, MAX_STORYBOARD_FRAMES - 1), last]
}

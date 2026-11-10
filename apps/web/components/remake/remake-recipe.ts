/**
 * Column 1 of S5: the format recipe, as a timed list of beats.
 *
 * The beats come from the trend itself, so the recipe and the storyboard on
 * the trend board always describe the same format. Only the timings and the
 * one-line notes are added here — a format recipe is a description, never a
 * copy of anyone's video (CLAUDE.md non-negotiable 1).
 */

import type { TrendBeat } from '@mirrorline/mock'

import { beatName } from '@/components/trends/trend-beats'

export interface RecipeBeat {
  /** "0–2 s". */
  readonly timeLabel: string
  /** "Hook question". */
  readonly name: string
  /** One line on what the beat has to do. */
  readonly note: string
  readonly startSeconds: number
  readonly endSeconds: number
}

/** A remake is 40 seconds long, whatever the beat count. */
export const REMAKE_SECONDS = 40

/**
 * Seconds per beat, by how many beats the format has. Each row adds up to
 * REMAKE_SECONDS; the five-beat row is the one 03_SCREENS_SPEC.md names
 * (Hook 0–2 s, Problem 2–8 s, Reframe 8–20 s, Proof 20–35 s, Call to action
 * 35–40 s).
 */
const BEAT_SECONDS: Record<number, readonly number[]> = {
  3: [2, 20, 18],
  4: [2, 8, 20, 10],
  5: [2, 6, 12, 15, 5],
}

/**
 * One line per kind of beat, keyed by the fixture label. Shared across
 * formats, so "call to action" reads the same wherever it appears.
 */
const BEAT_NOTES: Record<string, string> = {
  'hook question': 'A yes/no question the viewer feels.',
  'common belief': 'What most people in the niche think.',
  '3-word reframe': 'Short, quotable, on screen in big type.',
  'one example': 'A concrete thing to try this week.',
  'call to action': 'One next step, linked.',
  'bold claim': 'One line that makes the viewer stop.',
  '3 quick cuts': 'Three short shots, one idea each.',
  payoff: 'What the viewer gets for staying.',
  'myth on screen': 'The myth in plain text, named first.',
  "here's what's true": 'The correction, and where it comes from.',
  proof: 'Evidence from your own work.',
  'pov text': 'A point of view the viewer recognises.',
  '3 scenes': 'Three beats of the same day.',
  twist: 'The moment the story turns.',
  lesson: 'What you would tell them now.',
  'time-lapse': 'The work, sped up, with no claims.',
  '3 captions': 'Three lines over the footage.',
  reflection: 'One honest line about the day.',
  question: 'The question a client actually asks.',
  'why it works': 'The reason behind the question.',
  'how to ask it': 'The exact words to use.',
  'question on screen': 'The question, quoted and anonymised.',
  answer: 'Your answer in two sentences.',
  example: 'One case, with the names removed.',
  'before line': 'How it sounds today.',
  reframe: 'The same thing, said better.',
  'after line': 'How it sounds once it lands.',
  invite: 'An open door, not a push.',
}

const FALLBACK_NOTE = 'One beat of the format.'

/** DESIGN.md asks for pacing and caption style under the recipe. */
export const RECIPE_FOOTER = 'Pacing: a cut every 2–3 s. Captions: two lines, key word highlighted.'

/** Quotes are part of a few fixture labels; the note key drops them. */
function noteKey(label: string): string {
  return label.toLowerCase().replace(/^["'“‘]+|["'”’]+$/g, '')
}

/** Even slices, for a beat count the table does not cover. */
function evenSeconds(count: number): readonly number[] {
  if (count < 1) return []
  const each = Math.round(REMAKE_SECONDS / count)
  const head = Array.from({ length: count - 1 }, () => each)
  return [...head, REMAKE_SECONDS - each * (count - 1)]
}

/** "0:40" — the length under the preview. */
export function clockLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** The timed recipe for one trend. Pure: it builds a new list every time. */
export function buildRecipe(beats: readonly TrendBeat[]): readonly RecipeBeat[] {
  const durations = BEAT_SECONDS[beats.length] ?? evenSeconds(beats.length)

  let start = 0
  return beats.map((beat, index) => {
    const duration = durations[index] ?? 0
    const end = start + duration
    const row: RecipeBeat = {
      timeLabel: `${start}–${end} s`,
      name: beatName(beat),
      note: BEAT_NOTES[noteKey(beat.label)] ?? FALLBACK_NOTE,
      startSeconds: start,
      endSeconds: end,
    }
    start = end
    return row
  })
}

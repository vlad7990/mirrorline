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
 */

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

  return { title, formatName, hook, beats, footage, fact }
}

export function parseVideoIdeas(value: unknown): readonly VideoIdea[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseVideoIdea)
    .filter((idea): idea is VideoIdea => idea !== null)
    .slice(0, 6)
}

/** Lower case, no punctuation, single spaces. The comparison unit. */
export function normaliseSentence(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sentences worth comparing: a four-word fragment is not evidence of copying. */
const MIN_SENTENCE_WORDS = 5

export function sentencesOf(text: string): readonly string[] {
  return text
    .split(/[.!?\n]+/)
    .map(normaliseSentence)
    .filter((sentence) => sentence.split(' ').length >= MIN_SENTENCE_WORDS)
}

/** Every sentence of an idea, in one list: title, hook, beats, footage. */
export function ideaSentences(idea: VideoIdea): readonly string[] {
  return [idea.title, idea.hook, ...idea.beats.map((beat) => beat.text), ...idea.footage].flatMap(
    sentencesOf,
  )
}

/**
 * The sentence an idea shares with the source material, or `null`.
 *
 * Returns the offending sentence rather than a boolean, because `§V3` requires
 * the gate's failures to name what failed: "the draft goes back to V2 with the
 * offending lines named". A boolean makes a rejection unarguable in both
 * directions.
 */
export function sharedSentence(idea: VideoIdea, sourceTexts: readonly string[]): string | null {
  const source = new Set(sourceTexts.flatMap(sentencesOf))
  if (source.size === 0) return null

  return ideaSentences(idea).find((sentence) => source.has(sentence)) ?? null
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
  const claimed = normaliseSentence(fact)
  if (!claimed) return false

  return facts.some((known) => {
    const normalised = normaliseSentence(known)
    if (normalised.length < 3) return false
    return claimed.includes(normalised) || normalised.includes(claimed)
  })
}

export interface ScreenInput {
  readonly ideas: readonly VideoIdea[]
  /** Everything we hold from the sources: descriptions, hook types, beats. */
  readonly sourceTexts: readonly string[]
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
 */
export function screenIdeas({ ideas, sourceTexts, facts }: ScreenInput): ScreenedIdeas {
  const kept: VideoIdea[] = []
  const rejected: RejectedIdea[] = []

  for (const idea of ideas) {
    const copied = sharedSentence(idea, sourceTexts)
    if (copied) {
      rejected.push({ title: idea.title, reason: `shares a sentence with a source: "${copied}"` })
      continue
    }

    if (!factIsGrounded(idea.fact, facts)) {
      rejected.push({
        title: idea.title,
        reason: `the fact "${idea.fact}" is not in the client's profile`,
      })
      continue
    }

    kept.push(idea)
  }

  return { kept, rejected }
}

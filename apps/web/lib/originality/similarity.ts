/**
 * How close is this text to that text (V3, D126).
 *
 * Pure functions and no model call. That is deliberate three times over:
 *
 * 1. **The V-item contract says every agent "works with no key"**, and
 *    non-negotiable 6 says *every* video passes the Compliance agent before it
 *    can be scheduled. A check that needs a key is a check with an off switch,
 *    and a gate with an off switch is not a gate.
 * 2. **A verdict has to be arguable.** `04 §Originality Gate` requires the
 *    client to be shown the number, the limit and what the gate did, and the
 *    writer to be handed the offending lines. "The model found it derivative"
 *    is neither a number nor a line.
 * 3. **The same draft must get the same verdict twice.** Approval depends on
 *    it, so a sampled temperature would make "run it again" a way through.
 *
 * ============================================================================
 * What it looks at, and the thing it must not look at
 * ============================================================================
 *
 * It compares **expression** — words in their order. It never compares
 * structure, because structure is what a remake is *for*: `12 §3` takes the
 * recipe's beats (hook → setup → payoff → CTA) and leaves its footage and
 * audio alone, and D112 states the principle as patterns, never expression.
 *
 * That cuts both ways, and it is the easiest way to get this wrong: a naive
 * score over everything would flag every *correct* remake, and the tempting
 * fix — raise the limit until the complaints stop — ends in a gate that fires
 * on nothing, which is the gate the predecessor project had. So beat *labels*
 * never reach these functions. Callers pass written lines.
 *
 * ============================================================================
 * This module owns the primitives V2 had its own copies of
 * ============================================================================
 *
 * `normaliseSentence` and `sentencesOf` lived in `../scripts/video-idea.ts`
 * (PR #22) and are now `normaliseForComparison` and `comparableSentences`
 * here, because V3 needs the same notion of "the same sentence" and two
 * normalisers would be two answers to one question. `video-idea.ts` imports
 * them.
 *
 * One behaviour changed in the move, and it is a fix: the old normaliser
 * replaced an apostrophe with a space, so `dog's` became the two words `dog`
 * and `s`. That is harmless for set-membership on whole sentences and wrong
 * for anything that counts words or builds shingles — `s` is not a word. The
 * apostrophe is now kept, and its curly and straight forms are unified so
 * `dog's` and `dog’s` still agree.
 */

/**
 * Sentences shorter than this are not evidence of copying.
 *
 * V2's rule, kept: four words in common is a coincidence of English, not a
 * lifted line. Exported because the gate has to be able to say *why* a short
 * match was not counted.
 */
export const MIN_SENTENCE_WORDS = 5

/**
 * Words per shingle.
 *
 * Five is long enough that ordinary phrasing ("in the first three seconds")
 * does not collide by chance, and short enough to still catch a lifted line
 * that had a word or two swapped.
 */
export const SHINGLE_WORDS = 5

/**
 * One comparable form of a piece of text: lower case, apostrophes unified,
 * everything else that is not a letter, digit or space turned into a space,
 * and runs of space collapsed.
 *
 * Punctuation goes because moving a comma is not writing a new sentence.
 */
export function normaliseForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The normalised words of a piece of text, in order. */
function wordsOf(text: string): readonly string[] {
  const normalised = normaliseForComparison(text)
  return normalised === '' ? [] : normalised.split(' ')
}

/**
 * The sentences of a script, as the writer typed them.
 *
 * A script is written in lines at least as often as in prose, so a newline
 * ends a sentence as surely as a full stop does. The lookahead is what keeps
 * `2.5` and `e.g.` in one piece: a full stop only ends a sentence when
 * whitespace and then a capital, a digit or an opening quote follow it.
 *
 * Returns the writer's own text, unnormalised and unfiltered — this is the
 * function for showing a human a line. For comparing lines, use
 * `comparableSentences`.
 */
export function sentencesOf(text: string): readonly string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["'“‘([]?[\p{Lu}\p{N}])|\s*\n+\s*/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => normaliseForComparison(sentence) !== '')
}

/** How many words a normalised sentence has. */
function wordCount(normalised: string): number {
  return normalised === '' ? 0 : normalised.split(' ').length
}

/**
 * The sentences of a text in comparable form: normalised, and long enough to
 * mean something. This is V2's `sentencesOf`, under a name that says which of
 * the two it is.
 */
export function comparableSentences(text: string): readonly string[] {
  return sentencesOf(text)
    .map(normaliseForComparison)
    .filter((sentence) => wordCount(sentence) >= MIN_SENTENCE_WORDS)
}

/**
 * Sentences of the draft that appear, word for word, in at least one source.
 *
 * Returned in the **draft's** own wording, because the point of the list is
 * that somebody can search the draft for the line and rewrite it — `04 §2`
 * requires the draft to go back "with the offending lines named". Each line is
 * reported once however many sources carry it: the question is whether it was
 * copied, not from how many places.
 */
export function sharedSentences(
  draft: string,
  sources: readonly string[],
): readonly string[] {
  const sourceSentences = new Set(
    sources.flatMap((source) => [...comparableSentences(source)]),
  )
  if (sourceSentences.size === 0) return []

  const seen = new Set<string>()

  return sentencesOf(draft).filter((sentence) => {
    const key = normaliseForComparison(sentence)
    if (wordCount(key) < MIN_SENTENCE_WORDS) return false
    if (!sourceSentences.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** The longest run of consecutive words a draft shares with any one source. */
export interface SharedPhrase {
  /** How many words long. 0 when there is nothing to compare. */
  readonly words: number
  /** The run itself, normalised, so it can be quoted back to the writer. */
  readonly phrase: string
}

/**
 * The longest run of consecutive words the draft shares with any one source.
 *
 * This is the check a sentence-equality test cannot make: ten identical words
 * in a row, inside two sentences that are not equal because the eleventh word
 * changed. Rewording the end of a lifted line is the most natural way to copy
 * something by accident — and the most natural way to copy it on purpose.
 *
 * The classic dynamic programme over the two word lists, kept to one row
 * because only the previous one is ever read. A script is hundreds of words
 * and the sources are a handful, so the quadratic cost is irrelevant at this
 * size; if that stops being true, this is the function to index rather than
 * the loop to micro-optimise.
 */
export function longestSharedPhrase(
  draft: string,
  sources: readonly string[],
): SharedPhrase {
  const draftWords = wordsOf(draft)
  let best: SharedPhrase = { words: 0, phrase: '' }

  for (const source of sources) {
    const sourceWords = wordsOf(source)
    let previous: readonly number[] = new Array<number>(
      sourceWords.length + 1,
    ).fill(0)

    for (let i = 1; i <= draftWords.length; i += 1) {
      const current = new Array<number>(sourceWords.length + 1).fill(0)
      const draftWord = draftWords[i - 1]

      for (let j = 1; j <= sourceWords.length; j += 1) {
        if (draftWord !== sourceWords[j - 1]) continue

        // `?? 0` is for the worker's `noUncheckedIndexedAccess`, which is
        // stricter than the app's tsconfig and is the only thing standing
        // between a bad merge and a dead queue (D125). The index is always in
        // range; the fallback is the compiler's price, not a real branch.
        const run = (previous[j - 1] ?? 0) + 1
        current[j] = run

        if (run > best.words) {
          best = {
            words: run,
            phrase: draftWords.slice(i - run, i).join(' '),
          }
        }
      }

      previous = current
    }
  }

  return best
}

/** The set of word-level shingles in a piece of text. */
function shinglesOf(text: string): Set<string> {
  const words = wordsOf(text)
  const shingles = new Set<string>()

  for (let i = 0; i + SHINGLE_WORDS <= words.length; i += 1) {
    shingles.add(words.slice(i, i + SHINGLE_WORDS).join(' '))
  }

  return shingles
}

/**
 * How much of the draft's phrasing also appears in its closest source, 0–100.
 *
 * This is the number the client is shown. Three decisions inside it:
 *
 * **Against the closest source, not the average.** The question is whether
 * the draft is too close to *something*. Averaging would let a lifted line be
 * diluted by padding the comparison set with unrelated sources, which is a way
 * through rather than a measurement.
 *
 * **The share of the draft, not a symmetric similarity.** A one-line draft
 * lifted whole out of a long source is 100% copied, and Jaccard would call it
 * 3%. The denominator is the draft because the draft is what we are deciding
 * about.
 *
 * **0, not 100, when the draft is shorter than one shingle.** A two-word
 * script has no 5-gram, so this number cannot speak about it — and for a gate
 * "cannot speak" has to read as 0, because the alternative is a one-word hook
 * scoring full marks against any source containing that word. The
 * verbatim-sentence rule is what covers a short lift; this number is honest
 * about not covering it.
 */
export function shingleOverlap(
  draft: string,
  sources: readonly string[],
): number {
  const draftShingles = shinglesOf(draft)
  if (draftShingles.size === 0) return 0

  let closest = 0

  for (const source of sources) {
    const sourceShingles = shinglesOf(source)
    let shared = 0

    for (const shingle of draftShingles) {
      if (sourceShingles.has(shingle)) shared += 1
    }

    closest = Math.max(closest, shared / draftShingles.size)
  }

  return Math.round(closest * 100)
}

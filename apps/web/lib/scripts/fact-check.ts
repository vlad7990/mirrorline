/**
 * Does this script's fact actually come from the client's profile? (D133)
 *
 * ============================================================================
 * The bug: it matched literally, so it refused true things
 * ============================================================================
 *
 * `§V2` requires every script to carry "at least one real business fact", and
 * the check was two-directional normalised **substring containment**. That reads
 * as generous and is not: it breaks on any inserted word.
 *
 * Three facts were withheld from Maya Torres Coaching tonight, all three of them
 * true and all three in the profile:
 *
 * | The script wrote | The profile holds |
 * |---|---|
 * | "Private reactive-dog sessions **are** $150 per session" | "Private reactive-dog sessions, $150 per session" |
 * | "Reactive Rover 6-week package **is** $750" | "Reactive Rover 6-week package, $750" |
 * | "Method **is** positive reinforcement, force-free, **with** no prong, choke or e-collars" | "positive reinforcement, force-free, no prong, choke or e-collars" |
 *
 * The services are stored as one string each, because `parseServiceLine` splits
 * a service from its price on a **spaced dash** and these were typed with
 * commas. So the stored fact is the whole line — and "sessions, $150" versus
 * "sessions **are** $150" is one word apart and fails containment in both
 * directions. A gate that refuses a client's own price list is not strict, it is
 * broken.
 *
 * ============================================================================
 * The fix: substance, with numbers kept strict
 * ============================================================================
 *
 * Vlad: "Match on substance (normalised service/number/method against profile
 * facts …) — still strict on invented facts." Two rules, and the second is what
 * keeps the first honest:
 *
 * 1. **Token coverage, not substring.** A profile fact grounds a claim when
 *    almost all of its content words appear in the claim, in any order. Inserted
 *    words, dropped commas and reordered clauses stop mattering, because none of
 *    them changes which words are being asserted.
 *
 * 2. **Every number in the claim must be a number in the profile.** This is the
 *    rule that still refuses "she has trained over 500 dogs": 500 appears
 *    nowhere, so it does not matter how plausible the sentence is. It is checked
 *    against the *whole* profile rather than against the one covering fact,
 *    because "$450 for 4 sessions" legitimately splits across a name and a
 *    price.
 *
 * ============================================================================
 * Two things deliberately not done
 * ============================================================================
 *
 * **The reverse direction is restricted.** A claim shorter than the fact it
 * quotes is legitimate — "positive reinforcement" out of a longer method — so it
 * is allowed. But not when the fact carries a **negation**: a method reading
 * "no prong, choke or e-collars" would otherwise ground the claim "with prong
 * collars", whose every word does appear in it. That is the one way substance
 * matching could invert a client's method in public, so it is closed explicitly
 * rather than left to the threshold.
 *
 * **The agent does not cite a field.** Vlad offered that as the other half of an
 * "and/or": have the script name the profile field it used and verify it
 * structurally. It is the more robust design and it needs a schema field, a
 * prompt change and a migration's worth of plumbing through `drafts`. Coverage
 * plus strict numbers gets all three of tonight's cases passing while still
 * refusing invented ones, so it ships first and the citation stays available if
 * a later failure needs it.
 */

import 'server-only'

import { normaliseForComparison } from '../originality/similarity'

/**
 * Words that carry no assertion.
 *
 * Removed from both sides, so they can never be the reason a fact matches or
 * fails. Negations are deliberately **absent** from this list — see `NEGATIONS`.
 */
const STOPWORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'am',
  'of',
  'for',
  'to',
  'in',
  'on',
  'at',
  'with',
  'and',
  'or',
  'but',
  'my',
  'our',
  'your',
  'their',
  'his',
  'her',
  'its',
  'it',
  'this',
  'that',
  'these',
  'those',
  'i',
  'we',
  'you',
  'they',
  'she',
  'he',
  'from',
  'by',
  'as',
  'if',
  'then',
  'so',
  'there',
  'here',
  'also',
  'just',
  'about',
  'into',
  'has',
  'have',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'do',
  'does',
  'did',
])

/**
 * Words whose absence flips a meaning.
 *
 * Kept as content words, and checked separately: a fact containing one of these
 * may only ground a claim that contains one too. Without this, "no prong, choke
 * or e-collars" would ground "with prong collars".
 */
const NEGATIONS: ReadonlySet<string> = new Set(['no', 'not', 'never', 'without', 'free', 'zero'])

/**
 * Spelled numbers a client or a model may write either way.
 *
 * Only up to twelve, and only exact words. A model writing "four sessions" from
 * a profile holding "4 sessions" is using the fact properly; beyond this range
 * both sides write digits in practice.
 */
const SPELLED_NUMBERS: Readonly<Record<string, string>> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
}

/**
 * How much of a profile fact has to show up in the claim.
 *
 * 0.8 rather than 1.0, so one dropped or stemmed word does not refuse a true
 * fact — "sessions" against "session" is the common case, and a client's own
 * price line should not hinge on a plural. Low enough to forgive phrasing, high
 * enough that a claim has to be about the same thing: a fact of five content
 * words still needs four of them.
 */
export const MIN_COVERAGE = 0.8

/**
 * The shortest **claim** worth calling a fact, in content words.
 *
 * A one-word fact is not a fact about a business. "Austin" as a script's whole
 * business fact says nothing a reader could check.
 */
const MIN_CLAIM_WORDS = 2

/**
 * What a **one-word profile fact** may ground.
 *
 * A service area is often a single word, and "based in Miami" from a profile
 * holding "Miami" is the same fact said in more words — the old check allowed it
 * and it should stay allowed.
 *
 * What must not follow is a single word licensing anything: "Miami" grounding
 * "the most trusted trainer in Miami" would turn a service area into a
 * permission slip for a rating, which is exactly what non-negotiable 7 forbids.
 * So a one-word fact can only support a claim that is essentially that word —
 * three content words, enough for connective tissue and no more.
 */
const SHORT_FACT_MAX_CLAIM_TOKENS = 3

export function contentTokens(text: string): readonly string[] {
  const normalised = normaliseForComparison(text)
  if (normalised === '') return []

  return normalised
    .split(' ')
    .map((word) => SPELLED_NUMBERS[word] ?? word)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word))
}

/**
 * The numbers a piece of text asserts, as digit strings.
 *
 * `$150` and `150` are the same number; `6-week` yields `6`. Spelled numbers are
 * mapped first, so "four sessions" and "4 sessions" agree.
 */
export function numbersIn(text: string): readonly string[] {
  return contentTokens(text).flatMap((token) => token.match(/\d+/g) ?? [])
}

function hasNegation(tokens: readonly string[]): boolean {
  return tokens.some((token) => NEGATIONS.has(token))
}

/** What fraction of `wanted` appears in `present`? */
function coverage(wanted: readonly string[], present: ReadonlySet<string>): number {
  if (wanted.length === 0) return 0
  const found = wanted.filter((token) => present.has(token)).length
  return found / wanted.length
}

/**
 * Does one profile fact ground this claim?
 *
 * Forward first — the fact's words inside the claim — because that is what a
 * model does when it uses a fact: it keeps the words and adds a verb. The
 * reverse is allowed for a claim that quotes part of a longer fact, and closed
 * when the fact carries a negation the claim has dropped.
 */
function factCovers(claimTokens: readonly string[], factTokens: readonly string[]): boolean {
  const first = factTokens[0]
  if (first === undefined) return false

  const claimed = new Set(claimTokens)

  // A one-word fact: a city, a handle. It grounds a claim that is essentially
  // that word, and nothing longer — see `SHORT_FACT_MAX_CLAIM_TOKENS`.
  if (factTokens.length === 1) {
    if (claimTokens.length > SHORT_FACT_MAX_CLAIM_TOKENS) return false
    return claimed.has(first)
  }

  if (coverage(factTokens, claimed) >= MIN_COVERAGE) return true

  // The claim is shorter than the fact: a partial quote of a long method. Closed
  // when the fact carries a negation the claim has dropped, because that is how
  // "no prong, choke or e-collars" would ground "with prong collars".
  if (hasNegation(factTokens) && !hasNegation(claimTokens)) return false

  return coverage(claimTokens, new Set(factTokens)) >= MIN_COVERAGE
}

/**
 * Is this fact the client's, rather than the model's?
 *
 * The numbers rule is checked across the whole profile and the coverage rule
 * against each fact in turn, because the two answer different questions: "did
 * anybody tell us this number" and "is this claim about something we were told".
 * A claim can only pass by satisfying both.
 */
export function factIsGrounded(fact: string, facts: readonly string[]): boolean {
  const claimTokens = contentTokens(fact)
  if (claimTokens.length < MIN_CLAIM_WORDS) return false

  // Every number asserted has to be one the client gave us. Checked first
  // because it is the cheap, decisive half: no amount of coverage rescues a
  // sentence that invented a figure.
  const known = new Set(facts.flatMap((entry) => numbersIn(entry)))
  const claimedNumbers = numbersIn(fact)
  if (claimedNumbers.some((number) => !known.has(number))) return false

  return facts.some((entry) => factCovers(claimTokens, contentTokens(entry)))
}

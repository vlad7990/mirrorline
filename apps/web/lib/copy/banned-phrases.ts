/**
 * Wording this product is not allowed to use.
 *
 * **These patterns used to live inside `banned-phrases.test.ts`**, which was
 * right while the only thing that needed them was a sweep over our source
 * files. It stopped being right when the co-pilot arrived: spec 18 §3.2 ends
 * with "the banned phrase list the site already tests against applies to
 * generated text too", and a list a test keeps to itself cannot be applied to
 * anything. So the list moved here and the test imports it — one copy, two
 * readers, which is the arrangement D54 settled on for the email check for the
 * same reason.
 *
 * Nothing about the rules changed in the move. What follows is the reasoning
 * that came with them:
 *
 * **It exists because the wording came back.** D38 removed "for coaches,
 * consultants and local service businesses" from the home page in PR2, and on
 * 13 November the same sentence was still live in the privacy policy — a page
 * nobody rereads, which is exactly where a claim survives. A review catches
 * what a reviewer looks at. The sweep looks at everything, every run.
 *
 * **Negations are allowed, and that is the hardest part of this file.** "We do
 * not guarantee views" is the sentence we most want on the site; "guaranteed
 * results" is the one we must never ship. Each pattern therefore matches the
 * *claim*, not the word.
 *
 * **This file is itself swept**, because it sits under `apps/web/lib`. It
 * holds the patterns by definition, so it carries the exemption that used to
 * belong to the test — and a third test fails if that exemption stops being
 * needed.
 */

export interface BannedPattern {
  readonly id: string
  readonly pattern: RegExp
  /** What is wrong with it, quoted back in the failure message. */
  readonly why: string
}

export const BANNED_PATTERNS: readonly BannedPattern[] = [
  {
    id: 'guarantee',
    // The claim is "guaranteed <outcome>", so the outcome has to follow.
    // "we do not guarantee views" and "never guarantees" are the sentences we
    // want on the site, and the lookbehinds keep them.
    pattern:
      /\b(?<!not )(?<!never )(?<!no )(?<!any )guarantee(?:s|d)?\s+(?:of\s+|a\s+)?(?:results?|views?|followers?|leads?|sales?|growth|rankings?|incomes?)\b/i,
    why: 'Non-negotiable 7: no guarantees of views, followers, compliance or anything else.',
  },
  {
    id: 'go-viral',
    pattern: /\bgo(?:es|ing)? viral\b/i,
    why: 'P2: nobody can promise a video goes viral, and that promise is the pitch we are not making.',
  },
  {
    id: 'multiplier-claim',
    // "10x your reach". A bare "10x" in a measurement is fine; the claim is
    // the thing being multiplied.
    pattern: /\b\d+x\s+(?:your|their)\b/i,
    why: 'A multiplier on someone’s results is a claim about an outcome nobody can measure in advance.',
  },
  {
    id: 'number-one',
    pattern: /#1\b/,
    why: 'A ranking claim about ourselves with nothing behind it.',
  },
  {
    id: 'best-in-the-world',
    pattern: /\bbest in the (?:world|business|industry)\b/i,
    why: 'A superlative with no measurement behind it.',
  },
  {
    id: 'competitor-brand',
    // Categories only (11 §evidence). Naming a competitor invites a comparison
    // we would then have to keep accurate for ever.
    pattern: /\b(?:opus ?clip|submagic|vizard|klap|repurpose\.io|munch|crayo|descript)\b/i,
    why: '11: the public site paraphrases the complaint and names categories, never a brand.',
  },
  {
    id: 'industry-exclusive',
    pattern:
      /\b(?:built for|made for|designed for|for)\s+(?:coaches|consultants|clinics|dentists|realtors|restaurants|salons|gyms|lawyers|plumbers)\b/i,
    why: '16 §1 and D38: the product is industry-agnostic. An industry in the copy is a customer turned away.',
  },
  {
    id: 'local-machine-claim',
    pattern:
      /\b(?:runs?|happens?|happened)\s+(?:here and now,?\s+)?(?:locally,?\s+)?on this machine\b/i,
    why: 'Untrue for a visitor on a deployment. Removed once already; see the changelog entry for 12 November.',
  },
]

export interface BannedFinding {
  readonly id: string
  readonly why: string
  /** The sentence around the match, so a failure names it rather than the file. */
  readonly context: string
}

const CONTEXT_CHARS = 60

/**
 * Every banned claim in a piece of text.
 *
 * Takes text rather than a path so it can be pointed at anything: a source
 * file (after `stripComments`), the co-pilot's corpus, or an answer a model
 * just produced. It does **not** strip comments itself — a model's answer has
 * none, and stripping would be wrong there.
 */
export function findBannedClaims(text: string): readonly BannedFinding[] {
  const findings: BannedFinding[] = []

  for (const banned of BANNED_PATTERNS) {
    const match = banned.pattern.exec(text)
    if (!match) continue

    const start = Math.max(0, match.index - CONTEXT_CHARS)
    findings.push({
      id: banned.id,
      why: banned.why,
      context: text
        .slice(start, match.index + match[0].length + CONTEXT_CHARS)
        .replaceAll('\n', ' ')
        .trim(),
    })
  }

  return findings
}

/**
 * Strip comments, so the rule is about what a visitor reads.
 *
 * Line-based and deliberately crude: a real parser would be more code than the
 * check, and the failure mode of being crude here is a missed match inside a
 * block comment, not a false positive blocking a commit.
 *
 * Only used when sweeping our own source. Generated text goes to
 * `findBannedClaims` unmodified.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
}

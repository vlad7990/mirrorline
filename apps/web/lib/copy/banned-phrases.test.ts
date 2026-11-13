/**
 * Wording this product is not allowed to use, checked against every file that
 * can put words on a screen.
 *
 * **It exists because the wording came back.** D38 removed "for coaches,
 * consultants and local service businesses" from the home page in PR2, and on
 * 13 November the same sentence was still live in the privacy policy — a page
 * nobody rereads, which is exactly where a claim survives. A review catches
 * what a reviewer looks at. This looks at everything, every run.
 *
 * ## What is checked, and what is deliberately not
 *
 * **Comments are stripped before matching.** The rule is about what a visitor
 * reads, not what a developer writes, and this codebase is full of comments
 * explaining why a guarantee is forbidden. A test that could not tell those
 * apart would push the explanations out of the code, which costs more than it
 * saves.
 *
 * **Negations are allowed, and that is the hardest part of this file.** "We do
 * not guarantee views" is the sentence we most want on the site; "guaranteed
 * results" is the one we must never ship. Each pattern therefore matches the
 * *claim*, not the word.
 *
 * **Allowlisted files carry a reason, not a flag**, and a third test fails if
 * an exemption stops being needed. A silent allowlist is how a ban decays.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

/** Everything that can render words. Fixtures included on purpose. */
const SEARCH_ROOTS = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
  'packages/ui/src',
  'packages/mock/src',
]

const EXTENSIONS = new Set(['.ts', '.tsx'])

interface BannedPattern {
  readonly id: string
  readonly pattern: RegExp
  /** What is wrong with it, quoted back in the failure message. */
  readonly why: string
}

const BANNED: readonly BannedPattern[] = [
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
    pattern: /\b(?:runs?|happens?|happened)\s+(?:here and now,?\s+)?(?:locally,?\s+)?on this machine\b/i,
    why: 'Untrue for a visitor on a deployment. Removed once already; see the changelog entry for 12 November.',
  },
]

/**
 * Files allowed to contain a match, each with the argument for it.
 *
 * Every one is a case where the phrase is true where it is shown, or is the
 * subject of the sentence rather than its claim.
 */
const ALLOWED: Readonly<Record<string, string>> = {
  // The changelog entry quoting the removed "on this machine" claim needs no
  // exemption: it quotes the phrase inside quotation marks, with no verb in
  // front of it, so the pattern — which matches "runs/happens on this
  // machine" — does not fire. The third test below caught the unnecessary
  // entry, which is the entire reason that test exists.
  'apps/web/components/upload/engine-live.tsx':
    'Renders only after /api/engine/status confirms the engine is present, which is only ever a local checkout. "This runs locally, on this machine" is true wherever it is visible, and visible nowhere else.',
  'apps/web/app/(marketing)/legal/acceptable-use/page.tsx':
    'Lists the claims we refuse to make for a client, "guaranteed results" among them. The phrase is the subject of the prohibition, not a claim.',
  'apps/web/lib/copy/banned-phrases.test.ts': 'This file. It holds the patterns by definition.',
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return EXTENSIONS.has(path.extname(full)) ? [full] : []
  })
}

/**
 * Strip comments, so the rule is about what a visitor reads.
 *
 * Line-based and deliberately crude: a real parser would be more code than the
 * check, and the failure mode of being crude here is a missed match inside a
 * block comment, not a false positive blocking a commit.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
}

interface Finding {
  readonly file: string
  readonly id: string
  readonly why: string
  readonly context: string
}

const ALL_FILES = SEARCH_ROOTS.flatMap((root) => walk(path.join(REPO_ROOT, root)))

function sweep(): readonly Finding[] {
  const findings: Finding[] = []

  for (const file of ALL_FILES) {
    const relative = path.relative(REPO_ROOT, file)
    if (relative in ALLOWED) continue

    const source = stripComments(readFileSync(file, 'utf8'))
    for (const banned of BANNED) {
      const match = banned.pattern.exec(source)
      if (!match) continue

      // Context, so the failure names the sentence rather than the file. A
      // reviewer should not have to go looking for what tripped.
      const start = Math.max(0, match.index - 60)
      findings.push({
        file: relative,
        id: banned.id,
        why: banned.why,
        context: source.slice(start, match.index + match[0].length + 60).replaceAll('\n', ' '),
      })
    }
  }

  return findings
}

describe('banned phrases', () => {
  test('the sweep reaches real files, so a pass means something', () => {
    // A sweep that silently found nothing to read would pass for ever.
    expect(ALL_FILES.length).toBeGreaterThan(100)
  })

  test('no shipped copy makes a claim we are not allowed to make', () => {
    const findings = sweep()

    expect(
      findings,
      findings
        .map((f) => `\n${f.file} [${f.id}]\n  ${f.why}\n  …${f.context.trim()}…`)
        .join('\n'),
    ).toEqual([])
  })

  test('every allowlisted file still exists and still needs allowing', () => {
    for (const [relative, reason] of Object.entries(ALLOWED)) {
      const source = stripComments(readFileSync(path.join(REPO_ROOT, relative), 'utf8'))
      const matches = BANNED.some((banned) => banned.pattern.test(source))

      // An exemption nobody is using reads as permission to the next person.
      expect(matches, `${relative} no longer needs its exemption: ${reason}`).toBe(true)
    }
  })
})

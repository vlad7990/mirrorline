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
 *
 * **The patterns moved to `banned-phrases.ts`** when the co-pilot arrived.
 * Spec 18 §3.2 requires this list to be applied to generated text as well as
 * to our own source, and a list held inside a test file cannot be applied to
 * anything else. The rules are unchanged; this file is now the sweep, and the
 * module beside it is the list.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { BANNED_PATTERNS, stripComments } from './banned-phrases'

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
  'apps/web/lib/copy/banned-phrases.ts': 'The list itself. It holds the patterns by definition.',
  // The co-pilot's two exemptions, and both are the phrase-as-subject case
  // this allowlist exists for rather than new permissions.
  'apps/web/lib/copilot/adapter.ts':
    'SITE_SYSTEM tells the model what it may never say, and naming the phrase is what makes the instruction land — "Never say a video will go viral" is a prohibition addressed to the model, not copy addressed to a visitor. No part of a system prompt is ever rendered.',
  'apps/web/lib/copilot/canned.test.ts':
    'Asks the website bot "Is Opus Clip worse than you?" to prove it refuses. The test has to name a brand to show the refusal fires, and it asserts the *answer* names none — building the question out of the pattern instead would be testing the detector with the detector.',
  'apps/web/lib/copilot/live-model.live.test.ts':
    'Asks the real model the same forbidden question, for the same reason as canned.test.ts above, and then runs this very list over the answer it gets back. A question nobody is allowed to ask is a refusal nobody has tested.',
  // V4's generation gate, and the same case as the two co-pilot tests above.
  'apps/web/lib/generation/safety.test.ts':
    'Feeds the viral claim to screenPrompt as a scene that would burn it into the picture, to prove the banned-claim rule fires on a prompt and not only on copy. The phrase is the input to a refusal and the test asserts the refusal — writing the fixture as a join of fragments would be testing the detector with the detector, exactly as canned.test.ts says.',
  // This file still needs an exemption after the patterns moved out, and for
  // a different reason than before: the entries above *quote* the phrases
  // they exempt, so the allowlist is itself matched by the list. Found by the
  // sweep the moment the old blanket exemption was removed, which is the
  // third test below earning its place twice in one commit.
  'apps/web/lib/copy/banned-phrases.test.ts':
    'The allowlist reasons quote the phrases they exempt — "guaranteed results" and "runs locally, on this machine" are both named here as the subject of an exemption, not as a claim.',
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return EXTENSIONS.has(path.extname(full)) ? [full] : []
  })
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
    for (const banned of BANNED_PATTERNS) {
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
      const matches = BANNED_PATTERNS.some((banned) => banned.pattern.test(source))

      // An exemption nobody is using reads as permission to the next person.
      expect(matches, `${relative} no longer needs its exemption: ${reason}`).toBe(true)
    }
  })
})

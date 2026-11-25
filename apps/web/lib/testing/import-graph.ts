/**
 * The app's real import graph, for the tests that guard the server boundary.
 *
 * ============================================================================
 * Why this is a module and not a function in one test file
 * ============================================================================
 *
 * It was private to `lib/copilot/server-only.test.ts` until V4, and correctly
 * so while one chokepoint was the only thing being guarded. V4 adds a second —
 * the generation providers hold `XAI_API_KEY` the way
 * `lib/agents/anthropic-client.ts` holds `ANTHROPIC_API_KEY` — and a second
 * copy of a graph walker is the version that quietly diverges from the first.
 *
 * The divergence would be invisible in the worst way: a subtly weaker copy
 * reports no violations and reads exactly like a clean result.
 * `valueSpecifiersIn` below already carries one hard-won bug fix (the `[^'"]`
 * on the clause — see its comment); a second copy would not have it, and
 * nothing would say so.
 *
 * So the walker moves here and the assertions stay in the test files, where
 * they belong — the invariant each one guards is specific to its own
 * chokepoint, and only the instrument is shared.
 *
 * ============================================================================
 * Why reachability and not grep
 * ============================================================================
 *
 * Because the dangerous version of the mistake is never a direct import.
 * Nobody writes `import { askCopilot } from '@/lib/copilot/adapter'` at the
 * top of a `'use client'` component. What happens is that somebody adds a
 * helper to a shared module, a client component three hops away imports that
 * module, and the key arrives in the bundle by transitivity with nothing in
 * the diff to notice. A reachability question over the real graph is the only
 * form of the check that would have caught the mistake it exists for.
 *
 * This module sits under `lib/` rather than beside a test because both callers
 * are in different directories. It is never imported by application code, and
 * the sweeps prove it: it reads `node:fs`, so a client module reaching it
 * would be a violation the sweep itself reports.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { stripComments } from '../copy/banned-phrases'

const SKIPPED = new Set([
  'node_modules',
  '.next',
  '.next-e2e',
  '.turbo',
  'dist',
  'build',
  'coverage',
])
const EXTENSIONS = ['.ts', '.tsx']

export interface Module {
  readonly file: string
  readonly isClient: boolean
  /** The subset of specifiers that resolve to a file inside this app. */
  readonly imports: readonly string[]
  readonly specifiers: readonly string[]
  /** The subset that is not erased at compile time. */
  readonly valueSpecifiers: readonly string[]
}

export interface ImportGraph {
  readonly root: string
  readonly allFiles: readonly string[]
  readonly modules: readonly Module[]
  readonly byFile: ReadonlyMap<string, Module>
  /** Every module reachable from here, following imports as far as they go. */
  reachableFrom(start: string): ReadonlySet<string>
  /** A path relative to the app root, for readable assertion messages. */
  relative(file: string): string
  /** The source of a file, with comments stripped. */
  sourceWithoutComments(file: string): string
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (SKIPPED.has(entry)) return []
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return EXTENSIONS.includes(path.extname(full)) ? [full] : []
  })
}

/** Every `from '...'` and `import('...')` specifier in a file. */
function specifiersIn(source: string): readonly string[] {
  const found: string[] = []
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const specifier = match[1]
    if (specifier) found.push(specifier)
  }
  return found
}

/**
 * Only the specifiers that survive compilation.
 *
 * **`import type X from 'y'` emits nothing.** TypeScript erases it, so it
 * cannot put a byte of `y` into a bundle — which makes it the safe way for a
 * caller to keep using an SDK's shapes while the chokepoint owns every runtime
 * value. Counting it as an import would force a choice between a wrong test
 * and a worse design.
 *
 * `specifiersIn` above cannot tell the two apart, because both contain
 * `from '...'`. This looks at what sits between the `import` keyword and the
 * `from`: a leading `type` means the whole statement is erased. An inline
 * `import { type A, B }` is **not** erased — `B` is real — and correctly does
 * not match, because `type` is not the first token.
 *
 * Comments are stripped first, so a sentence discussing an import is not one.
 */
function valueSpecifiersIn(source: string): readonly string[] {
  const clean = stripComments(source)
  const found: string[] = []

  // `[^'"]` on the clause, not `[\s\S]`, and that is load-bearing. A
  // side-effect import — `import 'server-only'` — has no `from`, so a clause
  // that could cross quotes would run on to the *next* statement's `from` and
  // attribute that specifier to the wrong statement. `lib/niche-scan/scan.ts`
  // caught this: its `import 'server-only'` swallowed the following
  // `import type Anthropic from '@anthropic-ai/sdk'` and reported an erased
  // type import as a runtime one.
  for (const match of clean.matchAll(/\b(?:import|export)\b([^'"]*?)from\s*['"]([^'"]+)['"]/g)) {
    const clause = match[1] ?? ''
    const specifier = match[2]
    if (!specifier) continue
    if (/^\s*type\b/.test(clause)) continue
    found.push(specifier)
  }

  // A dynamic `import('x')` is always a runtime import, whatever it is used for.
  for (const match of clean.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) {
    if (match[1]) found.push(match[1])
  }

  // A side-effect import — `import 'server-only'` — has no `from`, so the loop
  // above cannot see it, and it is the one kind of import that can *never* be
  // erased: it exists purely for what loading the module does.
  //
  // This was missing while the co-pilot's sweep was the only caller, and the
  // omission was invisible there because it only ever filtered this list for
  // `@anthropic-ai/sdk`, which is never imported for its side effects. V4's
  // sweep asks the other question — "does this module pull in `server-only`" —
  // and got the answer "no" about two files that plainly do.
  //
  // The quote has to follow `import` directly for this to match, so
  // `import x from 'y'` is not double-counted and `import('x')` stays with the
  // loop above.
  for (const match of clean.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) {
    if (match[1]) found.push(match[1])
  }

  return found
}

/** A specifier to a file on disk, or null when it points outside the app. */
function resolveSpecifier(
  root: string,
  allFiles: readonly string[],
  fromFile: string,
  specifier: string,
): string | null {
  let base: string
  if (specifier.startsWith('@/')) {
    base = path.join(root, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else {
    // A package, or another workspace. Neither can reach back into the app.
    return null
  }

  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`
    if (allFiles.includes(candidate)) return candidate
  }
  for (const extension of EXTENSIONS) {
    const candidate = path.join(base, `index${extension}`)
    if (allFiles.includes(candidate)) return candidate
  }
  return null
}

/**
 * Read the app once and answer questions about it.
 *
 * Built eagerly, because every caller asks several questions and the file
 * system is the slow part. Callers are expected to **assert the instrument
 * first** — that it found a believable number of files, resolved a believable
 * number of imports, and can see something it is supposed to see. A walk that
 * resolved nothing reports no violations and looks exactly like a clean
 * result, which is how D55's wrong theme key and D52's eighth goal-picker test
 * both passed while checking nothing.
 */
export function buildImportGraph(root: string): ImportGraph {
  const allFiles = walk(root)

  const modules: readonly Module[] = allFiles.map((file) => {
    const source = readFileSync(file, 'utf8')
    const specifiers = specifiersIn(source)

    return {
      file,
      // The directive has to be the first statement, so looking at the top of
      // the file is not a shortcut — it is where the only valid one can be.
      isClient: /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(source),
      imports: specifiers
        .map((specifier) => resolveSpecifier(root, allFiles, file, specifier))
        .filter((resolved): resolved is string => resolved !== null),
      specifiers,
      valueSpecifiers: valueSpecifiersIn(source),
    }
  })

  const byFile = new Map(modules.map((module) => [module.file, module]))

  function reachableFrom(start: string): ReadonlySet<string> {
    const seen = new Set<string>()
    const queue = [start]

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current || seen.has(current)) continue
      seen.add(current)

      for (const next of byFile.get(current)?.imports ?? []) {
        if (!seen.has(next)) queue.push(next)
      }
    }

    seen.delete(start)
    return seen
  }

  return {
    root,
    allFiles,
    modules,
    byFile,
    reachableFrom,
    relative: (file: string) => path.relative(root, file),
    sourceWithoutComments: (file: string) => stripComments(readFileSync(file, 'utf8')),
  }
}

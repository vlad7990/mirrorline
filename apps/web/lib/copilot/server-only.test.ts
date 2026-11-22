/**
 * No browser bundle may contain the API key (spec 18 §4, §8).
 *
 * §4: "The adapter is **server-side only**. The key never reaches a browser
 * bundle: calls go through route handlers under `app/api/copilot/*`, and the
 * SDK import is confined to `adapter.ts` so a stray client component cannot
 * pull it in. **A unit test asserts no `'use client'` module imports it.**"
 *
 * ## Why this walks the whole graph instead of grepping
 *
 * Because the dangerous version of this mistake is never a direct import.
 * Nobody writes `import { askCopilot } from '@/lib/copilot/adapter'` at the
 * top of a `'use client'` component — it would be obviously wrong, and the
 * Next build would probably complain about `node:crypto` or `process.env`
 * somewhere down the chain. What actually happens is that somebody adds a
 * helper to a shared module, that module is imported by a client component
 * three hops away, and the SDK arrives in the bundle by transitivity with
 * nothing in the diff to notice.
 *
 * So the check is a reachability question over the real import graph, which
 * is the only form of it that would have caught the mistake it exists for.
 *
 * ## Two guards against the test passing vacuously
 *
 * A graph walk that resolved nothing would report no violations and look
 * identical to a clean result. D55's wrong theme key and D52's eighth
 * goal-picker test are the same failure in different costumes, so this file
 * asserts its own instrument first: that it found a believable number of
 * `'use client'` modules, and that the adapter *is* reachable from the route
 * handlers that are supposed to reach it. A test that cannot see the thing it
 * forbids cannot be trusted when it says the thing is absent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { stripComments } from '../copy/banned-phrases'

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const SKIPPED = new Set(['node_modules', '.next', '.turbo', 'dist', 'build', 'coverage'])
const EXTENSIONS = ['.ts', '.tsx']

const ADAPTER = path.join(WEB_ROOT, 'lib/copilot/adapter.ts')
/**
 * The one module that imports the SDK at runtime and reads the key (V1b).
 *
 * Until V1 the adapter was both. The Niche Scan made it two callers, and the
 * choice was to relax "exactly one" into a list or to give the invariant
 * somewhere to live. It lives here.
 */
const CHOKEPOINT = path.join(WEB_ROOT, 'lib/agents/anthropic-client.ts')
const SDK_SPECIFIER = '@anthropic-ai/sdk'

function isSdk(specifier: string): boolean {
  return specifier === SDK_SPECIFIER || specifier.startsWith(`${SDK_SPECIFIER}/`)
}

function walk(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (SKIPPED.has(entry)) return []
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return EXTENSIONS.includes(path.extname(full)) ? [full] : []
  })
}

const ALL_FILES = walk(WEB_ROOT)

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
 * cannot put a byte of `y` into a bundle — which makes it the safe way for the
 * adapter to keep using the SDK's shapes (`TextBlockParam`, `Usage`) while the
 * chokepoint owns every runtime value. Counting it as an import would force a
 * choice between a wrong test and a worse design.
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

  return found
}

/** A specifier to a file on disk, or null when it points outside the app. */
function resolve(fromFile: string, specifier: string): string | null {
  let base: string
  if (specifier.startsWith('@/')) {
    base = path.join(WEB_ROOT, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else {
    // A package, or another workspace. Neither can reach back into apps/web.
    return null
  }

  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`
    if (ALL_FILES.includes(candidate)) return candidate
  }
  for (const extension of EXTENSIONS) {
    const candidate = path.join(base, `index${extension}`)
    if (ALL_FILES.includes(candidate)) return candidate
  }
  return null
}

interface Module {
  readonly file: string
  readonly isClient: boolean
  readonly imports: readonly string[]
  readonly specifiers: readonly string[]
  /** The subset that is not erased at compile time. */
  readonly valueSpecifiers: readonly string[]
}

const MODULES: readonly Module[] = ALL_FILES.map((file) => {
  const source = readFileSync(file, 'utf8')
  const specifiers = specifiersIn(source)
  const valueSpecifiers = valueSpecifiersIn(source)

  return {
    file,
    // The directive has to be the first statement, so looking at the top of
    // the file is not a shortcut — it is where the only valid one can be.
    isClient: /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(source),
    imports: specifiers
      .map((specifier) => resolve(file, specifier))
      .filter((resolved): resolved is string => resolved !== null),
    specifiers,
    valueSpecifiers,
  }
})

const BY_FILE = new Map(MODULES.map((module) => [module.file, module]))

/** Every module reachable from here, following imports as far as they go. */
function reachableFrom(start: string): ReadonlySet<string> {
  const seen = new Set<string>()
  const queue = [start]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current || seen.has(current)) continue
    seen.add(current)

    for (const next of BY_FILE.get(current)?.imports ?? []) {
      if (!seen.has(next)) queue.push(next)
    }
  }

  seen.delete(start)
  return seen
}

function relative(file: string): string {
  return path.relative(WEB_ROOT, file)
}

describe('the import graph this test reads', () => {
  test('found the app, so a clean result means something', () => {
    expect(ALL_FILES.length).toBeGreaterThan(200)
    expect(BY_FILE.has(ADAPTER), 'the adapter itself was not found').toBe(true)
  })

  test('found the client components, so the sweep has something to check', () => {
    // If the directive match broke, every module would look server-side and
    // this file would pass while checking nothing at all.
    const clients = MODULES.filter((module) => module.isClient)
    expect(clients.length).toBeGreaterThan(20)
  })

  test('resolves imports, rather than silently resolving none', () => {
    const resolved = MODULES.reduce((total, module) => total + module.imports.length, 0)
    expect(resolved).toBeGreaterThan(300)
  })

  test('can see the adapter being reached, which is what makes absence meaningful', () => {
    // The route handlers are supposed to reach it. If the walk cannot find
    // that path, it could not find a forbidden one either.
    const route = path.join(WEB_ROOT, 'app/api/copilot/site/route.ts')
    expect(BY_FILE.has(route)).toBe(true)
    expect([...reachableFrom(route)].map(relative)).toContain(relative(ADAPTER))
  })
})

describe('the adapter is server-side only', () => {
  test('no module marked “use client” can reach it, directly or at any depth', () => {
    const offenders = MODULES.filter(
      (module) => module.isClient && reachableFrom(module.file).has(ADAPTER),
    ).map((module) => relative(module.file))

    expect(offenders, `client modules that reach the adapter: ${offenders.join(', ')}`).toEqual([])
  })

  test('no module marked “use client” can reach the chokepoint either', () => {
    // The adapter is no longer where the key is. Checking only the adapter
    // would leave the module that actually holds the SDK unguarded, which is
    // the whole thing this file exists to prevent.
    const offenders = MODULES.filter(
      (module) => module.isClient && reachableFrom(module.file).has(CHOKEPOINT),
    ).map((module) => relative(module.file))

    expect(offenders, `client modules that reach the chokepoint: ${offenders.join(', ')}`).toEqual(
      [],
    )
  })

  test('one module imports the SDK at runtime, and it is the chokepoint', () => {
    const importers = MODULES.filter((module) => module.valueSpecifiers.some(isSdk)).map((module) =>
      relative(module.file),
    )

    // Exactly one, named. "At most one" would pass if the chokepoint stopped
    // importing it and something else started — and a named list of two would
    // be the version that quietly becomes five.
    expect(importers).toEqual([relative(CHOKEPOINT)])
  })

  test('the adapter still uses the SDK, as types only', () => {
    // Guards the test above against passing for the wrong reason. If
    // `valueSpecifiersIn` were broken enough to return nothing, "one runtime
    // importer" would read as a clean result — so assert that the adapter
    // *does* reference the SDK, and that the reference is the erased kind.
    const adapter = BY_FILE.get(ADAPTER)
    expect(adapter, 'the adapter itself was not found').toBeDefined()
    expect(adapter?.specifiers.some(isSdk), 'the adapter no longer mentions the SDK at all').toBe(
      true,
    )
    expect(
      adapter?.valueSpecifiers.some(isSdk),
      'the adapter imports the SDK as a value again — it must be `import type`',
    ).toBe(false)
  })

  test('reads the API key in one place and nowhere else', () => {
    // **Reads it**, not mentions it. Comments across this codebase discuss
    // the key constantly — grounding.ts explains why it cannot count tokens
    // without one, the status route explains why the mode has to come from
    // the server — and a check that could not tell an explanation from an
    // access would push those explanations out of the code, which costs more
    // than it saves. Same reasoning as the banned-phrase sweep, and the same
    // helper does the stripping.
    const readers = MODULES.filter((module) => {
      const source = stripComments(readFileSync(module.file, 'utf8'))
      return /\benv\.ANTHROPIC_API_KEY\b/.test(source)
    }).map((module) => relative(module.file))

    // Exactly one, named. The chokepoint answers `hasAnthropicKey()` and
    // hands the decision on — `copilotMode` turns it into a `CopilotMode`, a
    // scan into canned or live — so no other module, route handler, test or
    // component ever needs to look at the variable.
    expect(readers).toEqual([relative(CHOKEPOINT)])
  })

  test('every co-pilot route handler runs on Node, not the edge', () => {
    // The adapter uses Node APIs through the SDK, and `respond.ts` uses
    // `node:crypto`. An edge runtime would fail at request time rather than
    // at build time, which is the worst place to find out.
    const handlers = ALL_FILES.filter((file) =>
      relative(file).startsWith(path.join('app', 'api', 'copilot')),
    ).filter((file) => path.basename(file) === 'route.ts')

    expect(handlers.length).toBe(3)
    for (const handler of handlers) {
      const source = readFileSync(handler, 'utf8')
      expect(source, relative(handler)).toContain("export const runtime = 'nodejs'")
    }
  })
})

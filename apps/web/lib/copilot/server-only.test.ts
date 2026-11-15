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
const SDK_SPECIFIER = '@anthropic-ai/sdk'

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
}

const MODULES: readonly Module[] = ALL_FILES.map((file) => {
  const source = readFileSync(file, 'utf8')
  const specifiers = specifiersIn(source)

  return {
    file,
    // The directive has to be the first statement, so looking at the top of
    // the file is not a shortcut — it is where the only valid one can be.
    isClient: /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(source),
    imports: specifiers
      .map((specifier) => resolve(file, specifier))
      .filter((resolved): resolved is string => resolved !== null),
    specifiers,
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

  test('is the only file in the app that imports the SDK', () => {
    const importers = MODULES.filter((module) =>
      module.specifiers.some(
        (specifier) => specifier === SDK_SPECIFIER || specifier.startsWith(`${SDK_SPECIFIER}/`),
      ),
    ).map((module) => relative(module.file))

    // Exactly one, named. "At most one" would pass if the adapter stopped
    // importing it and something else started.
    expect(importers).toEqual([relative(ADAPTER)])
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

    // Exactly one, named. The adapter decides the mode from it and hands the
    // decision to everything else as a `CopilotMode`, so no other module —
    // route handler, test or component — ever needs to look.
    expect(readers).toEqual(['lib/copilot/adapter.ts'])
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

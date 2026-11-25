/**
 * No browser bundle may contain a generation key, and no shape may be trapped
 * on the server by accident.
 *
 * The co-pilot's sweep (`lib/copilot/server-only.test.ts`) guards one
 * chokepoint. V4 adds a second: the provider modules under
 * `lib/generation/providers/` hold `XAI_API_KEY` the way
 * `lib/agents/anthropic-client.ts` holds `ANTHROPIC_API_KEY`. Same hazard,
 * same instrument, different names — so the walker is imported from
 * `lib/testing/import-graph.ts` and only the assertions live here.
 *
 * ============================================================================
 * This file checks the boundary in both directions, and that is the point
 * ============================================================================
 *
 * The co-pilot only ever had one question to ask: can a client module reach
 * the key. `lib/generation` has two, because its types are deliberately
 * client-importable:
 *
 * - **Outward:** nothing marked `'use client'` may reach a provider or the
 *   ledger. That is the key leaking, and it is the familiar direction.
 * - **Inward:** `types.ts`, `prompt-ref.ts`, `safety.ts` and `spend.ts` must
 *   **not** become server-only. A panel renders the AI label and the
 *   provenance line from those shapes, so the day somebody adds
 *   `import 'server-only'` to `types.ts` for tidiness, the studio stops
 *   building — and the error will point at a component, not at the import that
 *   caused it. Asserting it here means the failure names the real cause.
 *
 * The second direction is the one that would otherwise have no test at all,
 * because nothing about it looks dangerous while you are doing it.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { buildImportGraph } from '../testing/import-graph'

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const GRAPH = buildImportGraph(WEB_ROOT)
const { allFiles: ALL_FILES, modules: MODULES, byFile: BY_FILE, reachableFrom, relative } = GRAPH

const GENERATION_DIR = path.join(WEB_ROOT, 'lib/generation')
const PROVIDERS_DIR = path.join(GENERATION_DIR, 'providers')
const LEDGER = path.join(GENERATION_DIR, 'ledger.ts')

/**
 * The xAI provider, which does not exist until step 4.
 *
 * Its absence is handled rather than assumed — see the key-reader test for why
 * that is honest rather than a hole.
 */
const XAI_PROVIDER = path.join(PROVIDERS_DIR, 'xai.ts')

/** The modules a `'use client'` component is allowed to import. */
const CLIENT_SAFE = [
  path.join(GENERATION_DIR, 'types.ts'),
  path.join(GENERATION_DIR, 'prompt-ref.ts'),
  path.join(GENERATION_DIR, 'safety.ts'),
  path.join(GENERATION_DIR, 'spend.ts'),
]

/** Every module in the generation layer that must stay on the server. */
function serverSideModules(): readonly string[] {
  return ALL_FILES.filter(
    (file) =>
      (file === LEDGER || file.startsWith(`${PROVIDERS_DIR}${path.sep}`)) &&
      !file.endsWith('.test.ts'),
  )
}

/**
 * Does this module, or anything it reaches, pull in `server-only`.
 *
 * Reachability alone cannot answer it: `server-only` is a bare specifier, so
 * it resolves to no file in this app and never appears in `imports`. The
 * side-effect import has to be looked for in `valueSpecifiers` across the
 * closure — which is also why it is worth a named helper rather than an inline
 * `.some()` the next reader has to decode.
 */
function reachesServerOnly(start: string): readonly string[] {
  const candidates = [start, ...reachableFrom(start)]

  return candidates
    .filter((file) => BY_FILE.get(file)?.valueSpecifiers.includes('server-only'))
    .map(relative)
}

describe('the import graph this test reads', () => {
  test('found the app, so a clean result means something', () => {
    expect(ALL_FILES.length).toBeGreaterThan(200)
    expect(BY_FILE.has(LEDGER), 'the generation ledger was not found').toBe(true)
  })

  test('found the client components, so the sweep has something to check', () => {
    // If the directive match broke, every module would look server-side and
    // this file would pass while checking nothing at all.
    expect(MODULES.filter((module) => module.isClient).length).toBeGreaterThan(20)
  })

  test('resolves imports, rather than silently resolving none', () => {
    const resolved = MODULES.reduce((total, module) => total + module.imports.length, 0)
    expect(resolved).toBeGreaterThan(300)
  })

  test('found the generation layer’s server-side modules', () => {
    // The list this sweep is about. If it were empty, every "no client module
    // reaches it" assertion below would be true of nothing.
    const found = serverSideModules().map(relative)

    expect(found).toContain(path.join('lib', 'generation', 'ledger.ts'))
    expect(found).toContain(path.join('lib', 'generation', 'providers', 'canned.ts'))
  })

  test('can see a server-only import where one exists, which makes absence meaningful', () => {
    // Guards `reachesServerOnly` against the failure where it returns nothing
    // because it is broken. `ledger.ts` imports `server-only` directly, so a
    // working detector must find it.
    expect(reachesServerOnly(LEDGER)).toContain(path.join('lib', 'generation', 'ledger.ts'))
  })
})

describe('the generation layer is server-side where it must be', () => {
  test('no module marked “use client” can reach a provider or the ledger', () => {
    const guarded = new Set(serverSideModules())

    const offenders = MODULES.filter(
      (module) =>
        module.isClient && [...reachableFrom(module.file)].some((file) => guarded.has(file)),
    ).map((module) => relative(module.file))

    expect(
      offenders,
      `client modules that reach a generation provider or the ledger: ${offenders.join(', ')}`,
    ).toEqual([])
  })

  test('every provider and the ledger import server-only, so Next refuses them in a bundle', () => {
    // The belt to the graph walk's braces. The sweep above is ours and can be
    // wrong; `import 'server-only'` is enforced by the bundler and cannot be.
    const missing = serverSideModules()
      .filter((file) => !BY_FILE.get(file)?.valueSpecifiers.includes('server-only'))
      .map(relative)

    expect(missing, `server-side modules missing the directive: ${missing.join(', ')}`).toEqual([])
  })
})

describe('the shapes stay importable from the client', () => {
  test.each(CLIENT_SAFE.map((file) => [path.relative(WEB_ROOT, file), file] as const))(
    '%s does not reach server-only, directly or at any depth',
    (_label, file) => {
      // The inward direction. A panel renders the AI label and the provenance
      // line from these, so making one server-only breaks the studio's build
      // with an error that points at a component rather than at the cause.
      expect(BY_FILE.has(file), `${relative(file)} was not found`).toBe(true)
      expect(reachesServerOnly(file)).toEqual([])
    },
  )
})

describe('the generation key has exactly one door', () => {
  test('nothing outside lib/generation/providers reads XAI_API_KEY', () => {
    // Reads it, not mentions it. Comments across this layer discuss the key —
    // the registry explains that it never reads one, `types.ts` explains where
    // keys live — and a check that could not tell an explanation from an
    // access would push those explanations out of the code. Same reasoning as
    // the banned-phrase sweep, and the same stripping.
    const outsiders = MODULES.filter(
      (module) =>
        !module.file.startsWith(`${PROVIDERS_DIR}${path.sep}`) &&
        /\benv\.XAI_API_KEY\b/.test(GRAPH.sourceWithoutComments(module.file)),
    ).map((module) => relative(module.file))

    expect(
      outsiders,
      `modules outside the providers reading the key: ${outsiders.join(', ')}`,
    ).toEqual([])
  })

  test('the readers of XAI_API_KEY are exactly the set that should have it', () => {
    // ========================================================================
    // Why the expectation is derived from disk
    // ========================================================================
    //
    // `providers/xai.ts` arrives in step 4, when Vlad adds the key. Writing
    // `toEqual(['lib/generation/providers/xai.ts'])` today would commit a red
    // test; writing `toEqual([])` would commit an assertion that has to be
    // remembered and edited later, which is the version somebody in a hurry
    // edits into `toBeDefined()`.
    //
    // So the expectation follows the file. No xai provider, no readers.
    // Provider present, exactly one reader and it is that file. Both states
    // are non-vacuous, and the step-4 diff does not touch this test — which is
    // the property that makes it a guard rather than a chore.
    const expected = existsSync(XAI_PROVIDER) ? [relative(XAI_PROVIDER)] : []

    const readers = MODULES.filter((module) =>
      /\benv\.XAI_API_KEY\b/.test(GRAPH.sourceWithoutComments(module.file)),
    ).map((module) => relative(module.file))

    // Exactly, named. "At most one" would pass if the provider stopped reading
    // it and something else started.
    expect(readers).toEqual(expected)
  })

  test('the sample adapter needs no key, so a keyless checkout still works', () => {
    const canned = path.join(PROVIDERS_DIR, 'canned.ts')

    expect(BY_FILE.has(canned)).toBe(true)
    expect(/\benv\.XAI_API_KEY\b/.test(GRAPH.sourceWithoutComments(canned))).toBe(false)
  })
})

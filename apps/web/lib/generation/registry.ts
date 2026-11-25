/**
 * The one place a generator is chosen.
 *
 * ============================================================================
 * Why a registry rather than an import
 * ============================================================================
 *
 * Because "swappable" has to mean more than "we could write another one". If
 * every caller imported `xaiAdapter` directly, switching provider would be a
 * find-and-replace across the app and the *second* provider would never
 * actually be exercised — which is how a pluggable layer becomes a hard-coded
 * one with extra ceremony.
 *
 * So callers ask for an adapter and are given one. There is exactly one
 * function that decides, and it decides on one input: is there a key.
 *
 * ============================================================================
 * The order, and what is deliberately absent
 * ============================================================================
 *
 * `xai` first, `canned` last. Vlad's decisions of 25 November 2026:
 *
 * - **xAI Grok Imagine is primary**, with zero data retention enabled.
 * - **Google is the later second adapter, paid tier only.** Not built yet.
 *   When it is, it joins the list above `canned`, and the code that must come
 *   with it is a refusal to run on the free tier: Google's own terms say that
 *   on unpaid services "human reviewers may read, annotate, and process your
 *   API input and output", which is incompatible with what we tell clients
 *   about their material. A silent fallback to the free tier would be the
 *   worst possible form of that bug.
 * - **Runway is not built at all.** Its published terms grant a perpetual,
 *   sublicensable licence over inputs and outputs and permit training on them.
 *   It is not in this list and there is no commented-out line for it, because
 *   a commented-out line is an invitation.
 *
 * ============================================================================
 * Why `canned` is a fallback and not an error
 * ============================================================================
 *
 * A developer with no key should see the screens, and the end-to-end suite has
 * to run without one. But the fallback is **named in the result**, never
 * silent: `chooseAdapter` returns which adapter it picked, so a caller can put
 * "Sample data" on the page rather than present a fixture as a render. The
 * scan made the same choice and `EngineSummary.adapters` exists for the same
 * reason.
 */

import { cannedAdapter } from './providers/canned'
import type { EnvLike, GenerationAdapter } from './types'

/**
 * Every adapter that exists, most-preferred first.
 *
 * `xai` is absent until step 4 lands it. That absence is honest rather than
 * awkward: there is no module to import yet, and a registry listing an adapter
 * that does not exist would not compile — the right failure mode for this
 * particular lie.
 */
const ADAPTERS: readonly GenerationAdapter[] = [cannedAdapter]

export interface AdapterChoice {
  readonly adapter: GenerationAdapter
  /**
   * Whether this is the real thing or the fixture.
   *
   * The caller needs it to decide whether the screen says "Sample data", and
   * reading `adapter.name === 'canned'` at every call site would spread that
   * judgement across the app.
   */
  readonly isSample: boolean
}

/**
 * The adapter to use, and whether it is a sample.
 *
 * Takes the environment rather than reading `process.env` at module scope, so
 * a test can describe a world with no key without mutating the developer's
 * shell — the same reason `hasAnthropicKey` takes an `EnvLike`.
 *
 * It does not read any key itself. Each adapter answers `hasKey` for its own,
 * which is what keeps the set of files that can touch a credential equal to
 * the set of provider modules — the invariant `server-only.test.ts` asserts by
 * name.
 */
export function chooseAdapter(env: EnvLike = process.env): AdapterChoice {
  const live = ADAPTERS.find((adapter) => adapter !== cannedAdapter && adapter.hasKey(env))

  return live ? { adapter: live, isSample: false } : { adapter: cannedAdapter, isSample: true }
}

/** Every adapter's name, for a diagnostics screen. Not a selection mechanism. */
export function adapterNames(): readonly string[] {
  return ADAPTERS.map((adapter) => adapter.name)
}

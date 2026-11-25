/**
 * One generation, in the order the four steps have to happen in.
 *
 * ============================================================================
 * The order is the product, not an implementation detail
 * ============================================================================
 *
 * `screenPrompt` → `checkGenerationSpend` → `adapter.generate` →
 * `recordGenerationOutcome`. Every pair in that sequence is load-bearing:
 *
 * 1. **Our own gate before the cap.** A prompt naming a real person is refused
 *    whether or not there is budget, and screening first means the refusal a
 *    client reads is about the rule rather than about money. It also costs
 *    nothing — no database read, no call.
 * 2. **The cap before the call.** Non-negotiable 11 and `18 §6`: a request that
 *    would cross the ceiling is *never made*, rather than made and regretted.
 *    This is the inequality the co-pilot's module warns about in the only terms
 *    that matter — "the scan works, the cap says there is room, and the bill is
 *    larger than the ceiling. That failure has no error attached to it."
 * 3. **The log after everything, including the refusals.** `agent_runs`' own
 *    comment: *"a cap that is working looks identical to a feature nobody used"*
 *    if refusals leave no row. So all four outcomes are written, two of them at
 *    $0.00.
 *
 * Which is why it lives in one function. Each of those three modules is already
 * correct on its own, and the thing that can still go wrong is a *caller* doing
 * them in a different order — or doing three of them. The dev screen is the
 * first caller and the worker will be the second; the order should not be
 * re-derived twice.
 *
 * ============================================================================
 * What this does not do
 * ============================================================================
 *
 * It does not choose a resolution, bound the seconds, or decide what a beat is.
 * It takes a `GenerationRequest` that is already valid and runs it. Validation
 * belongs where the untrusted values arrive — the action parses a form, the
 * worker will parse a payload — and a function that both validated and executed
 * would be the place both callers quietly stopped validating.
 */

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { EnvLike, SpendLimits } from '../copilot/spend'
import { checkGenerationSpend, recordGenerationOutcome } from './ledger'
import { type AdapterChoice, chooseAdapter } from './registry'
import { type SafetyRule, screenPrompt } from './safety'
import type { GenerationOutcome, GenerationRequest } from './types'

/**
 * What happened, plus the things a screen needs that the outcome does not
 * carry.
 *
 * `GenerationOutcome` describes the *generation*. A surface rendering it also
 * has to say which implementation answered — non-negotiable 7's "Sample data"
 * depends on it — and which of our own rules refused, when ours did. Both are
 * facts about the run rather than about the asset, which is why they are here
 * and not bolted onto `GeneratedAsset`.
 */
export interface GenerationRun {
  readonly outcome: GenerationOutcome
  /** The fixture answered. The screen must say so (non-negotiable 7). */
  readonly isSample: boolean
  readonly adapter: string
  /** The model that was called, or would have been. Never a guess. */
  readonly model: string
  /**
   * Which of *our* rules refused, or `null`.
   *
   * `SafetyVerdict` carries a `rule` and `GenerationOutcome` has nowhere to put
   * it, because a provider's refusal has no rule of ours attached to it. Rather
   * than fold the slug into `reason` — where a screen would have to parse prose
   * to put it in a chip — it travels beside the outcome. `null` therefore means
   * two different things, and they are not worth separating here: either
   * nothing was refused, or something that was not us refused it.
   */
  readonly safetyRule: SafetyRule | null
}

export interface GenerationRunOptions {
  /** Injected so the month boundary a test exercises is the one it chose. */
  readonly now?: Date
  readonly env?: EnvLike
  readonly limits?: SpendLimits
  /**
   * The adapter, when the caller has already chosen one.
   *
   * A seam, for the reason every seam in this layer exists: a test reaching
   * `chooseAdapter` would be testing the registry's preference order as well as
   * this order, and would need an `XAI_API_KEY` in its environment to exercise
   * the live branch — which `server-only.test.ts` forbids a test file from
   * touching, by name.
   */
  readonly choice?: AdapterChoice
}

/** What a thrown adapter says on screen. Never the error's own text. */
const UNEXPECTED_MESSAGE = 'Something went wrong on our side before that scene was made. Try again.'

/**
 * Run it, and come back with a row written whatever happened.
 */
export async function runGeneration(
  client: SupabaseClient,
  request: GenerationRequest,
  options: GenerationRunOptions = {},
): Promise<GenerationRun> {
  const env = options.env ?? process.env
  const now = options.now ?? new Date()
  const choice = options.choice ?? chooseAdapter(env)
  const model = choice.adapter.models[request.kind]

  const common = { isSample: choice.isSample, adapter: choice.adapter.name, model }

  // 1. Our own rules. Cheapest, and the one refusal that is entirely ours.
  const verdict = screenPrompt(request.prompt, request.brand)
  if (!verdict.allowed) {
    const outcome: GenerationOutcome = {
      status: 'refused',
      reason: verdict.reason,
      message: verdict.message,
      // Null, not the adapter's provenance. Nothing was called, and a
      // provenance block here would read as "the provider refused this" —
      // a different fact, with different consequences for a client.
      provenance: null,
    }

    await recordGenerationOutcome(client, request.workspaceId, outcome, model)
    return { ...common, outcome, safetyRule: verdict.rule }
  }

  // 2. The ceiling, read from the month and decided before anything is spent.
  const decision = await checkGenerationSpend(client, request, now, env, options.limits)
  if (!decision.allowed) {
    const outcome: GenerationOutcome = {
      status: 'capped',
      reason: decision.reason,
      message: decision.message,
    }

    await recordGenerationOutcome(client, request.workspaceId, outcome, model)
    return { ...common, outcome, safetyRule: null }
  }

  // 3. The call. The only step that can cost money, and the last one reached.
  const outcome = await generateSafely(choice, request)

  // 4. The row, always.
  await recordGenerationOutcome(client, request.workspaceId, outcome, model)
  return { ...common, outcome, safetyRule: null }
}

/**
 * `adapter.generate`, with a thrown error turned into a `failed` outcome.
 *
 * Not defensive clutter. `GenerationAdapter` says in terms that an adapter
 * "does not throw to signal a refusal", and both of ours honour it — but a bug,
 * an out-of-memory, or a `fetch` rejecting in a way the provider did not
 * anticipate would otherwise leave the money possibly spent and the ledger with
 * no row at all. That is the one failure the cap cannot see, because the cap
 * reads the ledger.
 *
 * The thrown text goes in `reason`, for the log, and **not** on the screen.
 * `xai.ts`'s header is explicit that a bearer token must never reach an error
 * message, and it honours that — but this catch is the one place that would
 * forward an error nobody here wrote, so the sentence a person reads is ours.
 */
async function generateSafely(
  choice: AdapterChoice,
  request: GenerationRequest,
): Promise<GenerationOutcome> {
  try {
    return await choice.adapter.generate(request)
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'a non-error was thrown'

    return {
      status: 'failed',
      reason: `the ${choice.adapter.name} adapter threw: ${detail}`,
      message: UNEXPECTED_MESSAGE,
      provenance: null,
    }
  }
}

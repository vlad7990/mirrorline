/**
 * The dev form's state, in a module a client component may import.
 *
 * **Its own file for the same reason `trends/scan-form-state.ts` is.**
 * `actions.ts` is `'use server'`, so everything it exports becomes a server
 * reference. A type survives that — types are erased — but a *value* does not:
 * importing `IDLE_GENERATE_STATE` from the action module into a client
 * component would mean asking the client bundle for a server export.
 *
 * ============================================================================
 * Why this is not `GenerationRun`
 * ============================================================================
 *
 * `runGeneration` returns everything this needs, and `run.ts` imports
 * `server-only`. Even a type-only import of it from a client component is a
 * line somebody later drops the `type` from, and `server-only.test.ts` would
 * then fail with the right verdict and a confusing location.
 *
 * So the state is assembled from the modules that are **deliberately
 * client-importable** — `types.ts` and `safety.ts`, which the sweep asserts
 * never become server-only — plus one string the server computes because the
 * client cannot: a URL for bytes that live on a path only the server can read.
 */

import type { SafetyRule } from '@/lib/generation/safety'
import type { AspectRatio, GenerationKind, GenerationOutcome, Resolution } from '@/lib/generation/types'

/** The route, named once, so the action can revalidate the page it serves. */
export const DEV_GENERATE_PATH = '/app/dev/generate'

/**
 * The choices, here rather than in `actions.ts`, and that is a rule rather than
 * a preference.
 *
 * `run-scan-form.tsx` explains it at length and it cost somebody a red test to
 * learn: a `'use client'` module must not import from an action module, because
 * `server-only.test.ts` walks the *static* import graph and sees the path to
 * whatever the action reaches. The form needs these lists to render its
 * `<select>`s and the action needs them to validate what comes back, so they
 * live in the module both sides may import.
 *
 * Which also makes them one list instead of two. A renderer and a validator
 * with separate copies of "the resolutions we offer" disagree the first time
 * one is narrowed — and `Resolution` has already been narrowed once (D140).
 */
export const GENERATE_KINDS: readonly GenerationKind[] = ['clip', 'image']
export const GENERATE_ASPECTS: readonly AspectRatio[] = ['9:16', '1:1', '16:9']
export const GENERATE_RESOLUTIONS: readonly Resolution[] = ['480p', '720p']

/** The script agent's own vocabulary (`SCRIPT_SYSTEM`, `VideoBeat.label`). */
export const BEAT_LABELS: readonly string[] = ['Hook', 'Setup', 'Payoff', 'Call to action']

/**
 * The outcomes of *pressing the button*, which are not the outcomes of the
 * generation.
 *
 * `done` means the run completed and `outcome` says what it decided —
 * including a refusal, which is information rather than an error. `failed` is
 * narrower than it looks: the press itself could not proceed, because the flag
 * is off, because there is no workspace, or because the form did not parse. A
 * refused prompt is **never** `failed`, for the reason `lib/jobs/types.ts`
 * argues at length — rendering a working control as a broken one teaches the
 * reader to distrust it.
 */
export type GenerateStatus = 'idle' | 'done' | 'failed'

export interface GenerateActionResult {
  readonly status: GenerateStatus
  /** Shown when the press could not proceed. Empty when `outcome` speaks. */
  readonly message: string
  readonly outcome: GenerationOutcome | null
  /** The fixture answered, so the screen says "Sample data". */
  readonly isSample: boolean
  readonly adapter: string | null
  readonly model: string | null
  /** Which of our own rules refused, when ours did. */
  readonly safetyRule: SafetyRule | null
  /**
   * Where a `<video>` or an `<img>` may point, or `null`.
   *
   * Computed on the server by `generatedAssetUrl`, because `location` is a path
   * and a path is not something a browser can be handed. `null` for a sample —
   * there are no bytes behind a `sample://` URI, and the honest screen for that
   * is the provenance without a preview.
   */
  readonly assetUrl: string | null
}

/** Before anything has been submitted. No message, because nothing happened. */
export const IDLE_GENERATE_STATE: GenerateActionResult = {
  status: 'idle',
  message: '',
  outcome: null,
  isSample: false,
  adapter: null,
  model: null,
  safetyRule: null,
  assetUrl: null,
}

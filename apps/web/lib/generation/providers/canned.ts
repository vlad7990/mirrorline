/**
 * The adapter that spends nothing, so the product works without a key.
 *
 * The scan has the same arrangement and for the same two reasons: the
 * end-to-end suite must be able to run without an API key
 * (`playwright.config.ts` sets `ANTHROPIC_API_KEY: ''` rather than deleting
 * it), and a developer with no credentials should still be able to see the
 * screens.
 *
 * ============================================================================
 * What makes this safe to have in the tree
 * ============================================================================
 *
 * A fake generator is a liability if its output can be mistaken for a real
 * one. Two things stop that here, and neither is a convention:
 *
 * 1. **`location` is a `sample://` URI, not a path.** Nothing can open it. A
 *    renderer handed one fails immediately and loudly, rather than finding a
 *    placeholder file and quietly compositing it into a client's video. That
 *    is the opposite of the usual instinct to return something harmless — a
 *    harmless-looking stub is exactly what travels furthest before anyone
 *    notices.
 * 2. **`provenance.adapter` is `'canned'` and travels with the asset.** The
 *    same reason `EngineSummary.adapters` is carried into the UI: "a run
 *    backed by a script sidecar must never read like a run backed by a model".
 *    Non-negotiable 7 puts the other half on the screen — demo data is
 *    labelled "Sample data", and this is what the screen reads to know.
 *
 * The AI label is on it regardless. A sample scene is still an AI scene as far
 * as non-negotiable 4 is concerned, and an adapter that dropped the label
 * because the pixels were not real would teach the wrong lesson to whoever
 * writes the next one.
 */

import 'server-only'

import { promptRef } from '../prompt-ref'
import {
  DEFAULT_CLIP_SECONDS,
  dimensionsFor,
  type GenerationAdapter,
  type GenerationOutcome,
  type GenerationRequest,
} from '../types'

export const CANNED_ADAPTER_NAME = 'canned'

/**
 * The model id is `'sample'` rather than a real one.
 *
 * Writing `'grok-imagine-video-1.5-lite'` here would put a model we did not
 * call into `agent_runs.model`, and the ledger is the one place that has to be
 * literally true: a month's spend is reconciled against an invoice, and a row
 * naming a model that was never invoked makes that reconciliation a guess.
 */
const SAMPLE_MODEL = 'sample'

export const cannedAdapter: GenerationAdapter = {
  name: CANNED_ADAPTER_NAME,

  models: { clip: SAMPLE_MODEL, image: SAMPLE_MODEL },

  /**
   * Always. This adapter is the answer to "there is no key", so it cannot
   * itself require one — and returning `false` would leave the registry with
   * nothing to fall back to and no way to say so.
   */
  hasKey: () => true,

  /** Nothing was called, so nothing is owed. */
  projectUsd: () => 0,

  generate: async (request: GenerationRequest): Promise<GenerationOutcome> => {
    const reference = promptRef(request.prompt)
    const { width, height } = dimensionsFor(request.aspectRatio, request.resolution)

    return {
      status: 'ok',
      asset: {
        // Deterministic, from the prompt and the beat. Two runs of the same
        // request produce the same id, which is what makes a sample usable in
        // a snapshot or a Playwright assertion — `Math.random()` here would
        // make every screenshot a new one.
        id: `${reference}-${request.beat.label.toLowerCase().replace(/\s+/g, '-')}`,
        kind: request.kind,
        location: `sample://ai-scene/${reference}`,
        width,
        height,
        seconds: request.kind === 'clip' ? (request.seconds ?? DEFAULT_CLIP_SECONDS) : null,
        beat: request.beat,
        promptRef: reference,
        source: 'ai-scene',
        label: 'AI-generated',
        provenance: {
          adapter: CANNED_ADAPTER_NAME,
          model: SAMPLE_MODEL,
          requestedAt: new Date().toISOString(),
          usd: 0,
          providerRequestId: null,
          // Not `false`. "There is no provider" and "the provider embedded
          // nothing" are different facts, and only one of them is true here.
          providerWatermark: null,
        },
      },
    }
  },
}

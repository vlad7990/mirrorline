'use server'

/**
 * The button behind the dev screen: parse a form, run one generation.
 *
 * ============================================================================
 * The boundary is here, and the order is not
 * ============================================================================
 *
 * This module's job is the untrusted half — a `FormData` arrives from a browser
 * and has to become a `GenerationRequest` or be refused. The four-step order
 * lives in `runGeneration`, deliberately, so the worker that runs this same
 * work in slice 2 cannot get it in a different sequence.
 *
 * Every choice is validated against the union it belongs to rather than cast. A
 * `<select>` only emits values it rendered, so an unrecognised one means
 * somebody posted by hand — and the honest answer to that is a refusal, not a
 * quiet fallback to 720p. A fallback would also hide the one case worth seeing:
 * a stale client posting a value a narrowed union no longer has, which is
 * exactly what `Resolution` losing `'1080p'` created (D140).
 */

import { revalidatePath } from 'next/cache'

import { createAgentServiceClient } from '@/lib/agents/service-client'
import { generatedAssetUrl } from '@/lib/generation/asset-file'
import { isGenerationEnabled } from '@/lib/generation/flag'
import { runGeneration } from '@/lib/generation/run'
import {
  type BrandKit,
  DEFAULT_CLIP_SECONDS,
  type GenerationRequest,
  MAX_CLIP_SECONDS,
} from '@/lib/generation/types'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'
import { readClientProfile } from '@/lib/workspace/read-client-profile'

import {
  BEAT_LABELS,
  DEV_GENERATE_PATH,
  GENERATE_ASPECTS,
  GENERATE_KINDS,
  GENERATE_RESOLUTIONS,
  type GenerateActionResult,
  IDLE_GENERATE_STATE,
} from './generate-form-state'

/**
 * The outer bound on the posted prompt, which is not the product's bound.
 *
 * `MAX_PROMPT_CHARS` is 600 and `screenPrompt` refuses anything longer, with a
 * sentence a person can act on. This larger number exists one layer out, to
 * stop a megabyte of text being parsed at all — and it is deliberately well
 * above 600 so the *rule* is what refuses a long prompt, visibly, rather than a
 * silent truncation that makes the gate look like it passed something it never
 * saw.
 */
const MAX_POSTED_PROMPT = 4000

function failed(message: string): GenerateActionResult {
  return { ...IDLE_GENERATE_STATE, status: 'failed', message }
}

/** A posted value, if it is one of the ones we offered. */
function parseChoice<T extends string>(
  raw: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null {
  if (typeof raw !== 'string') return null
  return allowed.includes(raw as T) ? (raw as T) : null
}

/**
 * The clip length, bounded by ours rather than by the provider's.
 *
 * `MAX_CLIP_SECONDS` is 6 against xAI's 15, and `types.ts` says why: the
 * ceiling that matters is the one that stops a typo costing fifteen seconds.
 */
function parseSeconds(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return DEFAULT_CLIP_SECONDS

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > MAX_CLIP_SECONDS) return null
  return value
}

export async function generateSceneAction(
  _previous: GenerateActionResult,
  formData: FormData,
): Promise<GenerateActionResult> {
  // Checked here as well as on the page, and the duplication is the point: a
  // page that stopped offering the button is not a reason the button stopped
  // working. This is the check that stands in front of the money.
  if (!isGenerationEnabled()) {
    return failed('Generation is switched off for this deployment.')
  }

  const workspace = await getOwnedWorkspace()
  if (!workspace) {
    // An ordinary answer rather than a failure of ours: somebody with a session
    // and no workspace. The same sentence the other studio actions use.
    return failed('Finish setting up your workspace first.')
  }

  const kind = parseChoice(formData.get('kind'), GENERATE_KINDS)
  const aspectRatio = parseChoice(formData.get('aspectRatio'), GENERATE_ASPECTS)
  const resolution = parseChoice(formData.get('resolution'), GENERATE_RESOLUTIONS)
  const beat = parseChoice(formData.get('beat'), BEAT_LABELS)
  const seconds = parseSeconds(formData.get('seconds'))

  if (kind === null || aspectRatio === null || resolution === null || beat === null) {
    return failed('That form carried a value we do not offer. Reload the page and try again.')
  }

  if (seconds === null) {
    return failed(`A clip runs between one and ${MAX_CLIP_SECONDS} seconds.`)
  }

  const rawPrompt = formData.get('prompt')
  const prompt = typeof rawPrompt === 'string' ? rawPrompt.slice(0, MAX_POSTED_PROMPT) : ''

  // The client's own words, so `withoutOwnBrand` can tell their name from a
  // third party's mark and `scenePrompt` can name what they never want shown.
  // An empty profile is not an error — nulls are what a new workspace has, and
  // the framing degrades to its constraints rather than inventing a look.
  const profile = await readClientProfile()
  const brand: BrandKit = {
    brandName: profile.brandName,
    look: null,
    captionStyle: null,
    avoid: profile.avoid,
  }

  const request: GenerationRequest = {
    workspaceId: workspace.id,
    beat: { ideaTitle: 'Dev screen', label: beat },
    prompt,
    brand,
    kind,
    aspectRatio,
    // Undefined rather than zero for a still. `GenerationRequest.seconds` is
    // documented "Clips only", and a zero would price as a zero-second clip.
    seconds: kind === 'clip' ? seconds : undefined,
    resolution,
  }

  /*
   * The **service-role** client, and this is the half the dev screen earned.
   *
   * With the user's client every run logged `permission denied for table
   * agent_runs` — swallowed, by `recordMediaRun`'s deliberate choice not to
   * turn a lost log line into a failed clip, so the screen looked perfect and
   * the ledger stayed empty. `agent_runs` revokes insert from `authenticated`
   * on purpose (D96, D115): "a row a client could write would be research
   * nobody did or a cost somebody typed". The scan's writes have always gone
   * through this client; generation's had not, because generation's first
   * caller is a screen rather than a worker.
   *
   * It is the client for the **cap's read** as well, which matters more than it
   * looks: a month summed under RLS is a month the policy agreed to show, and a
   * ceiling has to be checked against what was actually spent.
   *
   * The workspace id is still the session's, read above through the user's own
   * client. That order is the security property — the service role is handed a
   * workspace that RLS already agreed this person owns, never one from a form.
   */
  const run = await runGeneration(createAgentServiceClient(), request)

  // The page reads this month's media spend on the server, so the figure only
  // moves once the route re-renders with the row this run just wrote. Without
  // this, the honest conclusion would be that the cap is not counting.
  revalidatePath(DEV_GENERATE_PATH)

  return {
    status: 'done',
    message: '',
    outcome: run.outcome,
    isSample: run.isSample,
    adapter: run.adapter,
    model: run.model,
    safetyRule: run.safetyRule,
    // A path cannot be handed to a browser, and a `sample://` URI has no bytes
    // behind it. Both come back null, and the panel renders the provenance
    // without a preview.
    assetUrl: run.outcome.status === 'ok' ? generatedAssetUrl(run.outcome.asset.location) : null,
  }
}

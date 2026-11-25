/**
 * The `render-cuts` handler: an upload and an approved script become a short.
 *
 * ============================================================================
 * The order of operations is the design
 * ============================================================================
 *
 * 1. Read the asset, the approved draft and the idea's four beats. Any of those
 *    missing is a refusal before a byte moves.
 * 2. Download the source once, to the container's own disk.
 * 3. Transcribe **only if there is no transcript row**. This is the expensive
 *    leg, it is idempotent, and that is what makes a second cut of the same
 *    upload nearly free.
 * 4. Render. The engine aligns the beats, burns the captions, exports 9:16 and
 *    runs the compliance gate.
 * 5. Upload the short and its poster, then write the `renders` row.
 *
 * Nothing is written to `renders` until there is a file, except on the failure
 * paths — where a row is written precisely so the client sees why.
 *
 * ============================================================================
 * A refusal is a completed job
 * ============================================================================
 *
 * "The Payoff beat is not in this footage" is not an error: the pipeline
 * worked, and the client has something to do about it. So it returns
 * `refused`, which `index.ts` records as a complete job carrying a sentence —
 * the rule `18 §6` set for the spend cap and `jobs.result` already carries.
 *
 * A broken ffmpeg, a missing `uv`, a failed upload: those are ours, and they
 * throw.
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  brandForRender,
  parseRenderSummary,
  planBeatsFrom,
  renderPlanFor,
  type PlanBeat,
  type PlanWord,
} from '../../../../apps/web/lib/video/plan'
import { aiLabelFor, aiScenesOf } from '../../../../apps/web/lib/video/segment'
import {
  FOOTAGE_BUCKET,
  MAX_SOURCE_SECONDS,
  RENDERS_BUCKET,
  RENDER_TIME_BUDGET_MS,
  TRANSCRIBE_TIME_BUDGET_MS,
} from '../../../../apps/web/lib/video/types'

import { downloadObject, uploadObject } from './media-storage'
import { runPipeline } from './run-uv'

export interface RenderJob {
  readonly id: string
  readonly workspace_id: string
  readonly payload: Record<string, unknown> | null
}

export interface RenderResult {
  readonly outcome: 'complete' | 'refused'
  readonly message: string
}

/** The one cut slice 1 makes. A 60-minute source will make several (§1.3). */
const FIRST_CUT_INDEX = 0

interface AssetRow {
  readonly id: string
  readonly storage_path: string
  readonly rights_holder: string
  readonly rights_confirmed_at: string
  readonly original_name: string
}

interface IdeaBeats {
  readonly title: string
  readonly hook: string
  readonly beats: readonly PlanBeat[]
}

/** Either the words, or the sentence explaining why there are none. */
type TranscriptOutcome =
  | { readonly words: readonly PlanWord[] }
  | { readonly refusal: string }

function requireString(payload: Record<string, unknown> | null, key: string): string {
  const value = payload?.[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`this render job has no ${key}`)
  }
  return value
}

/**
 * The approved idea behind this render, matched on title.
 *
 * `drafts.body` is rendered prose, so the structured beats live in
 * `niche_reports.first_videos` — the join `V5_VIDEO_PIPELINE_PLAN.md §1.4`
 * describes. **Matched on the exact title and refused when there is no match**,
 * never "the first idea": rendering the wrong script against somebody's footage
 * is a video they cannot use and cannot explain.
 */
async function readIdea(
  supabase: SupabaseClient,
  workspaceId: string,
  draftId: string,
): Promise<IdeaBeats | { readonly refusal: string }> {
  const draft = await supabase
    .from('drafts')
    .select('status, title, report_id')
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (draft.error !== null) throw new Error(`could not read the draft: ${draft.error.message}`)

  const row = draft.data as { status?: unknown; title?: unknown; report_id?: unknown } | null
  if (row === null) return { refusal: 'That video idea could not be found.' }

  // V3's rule, carried here as well as in the action: compute is not spent on a
  // script the Originality Gate has not passed and the client has not approved.
  if (row.status !== 'approved') {
    return { refusal: 'That video idea has not been approved, so it was not cut.' }
  }

  const title = typeof row.title === 'string' ? row.title : null
  if (title === null || typeof row.report_id !== 'string') {
    return { refusal: 'That video idea is missing the script it was written from.' }
  }

  const report = await supabase
    .from('niche_reports')
    .select('first_videos')
    .eq('id', row.report_id)
    .maybeSingle()

  if (report.error !== null) throw new Error(`could not read the report: ${report.error.message}`)

  const ideas = (report.data as { first_videos?: unknown } | null)?.first_videos
  const matched = (Array.isArray(ideas) ? ideas : []).find((idea) => {
    return (
      typeof idea === 'object' &&
      idea !== null &&
      (idea as { title?: unknown }).title === title
    )
  }) as { hook?: unknown; beats?: unknown } | undefined

  if (matched === undefined) {
    return { refusal: 'The script for that idea could not be found in its report.' }
  }

  const beats = planBeatsFrom(matched.beats)
  if (beats === null) {
    return {
      refusal:
        'That script does not have the four beats a short is cut from, so it was not cut.',
    }
  }

  return {
    title,
    hook: typeof matched.hook === 'string' ? matched.hook : '',
    beats,
  }
}

/** The stored words, or null when this asset has never been transcribed. */
async function readTranscript(
  supabase: SupabaseClient,
  assetId: string,
): Promise<readonly PlanWord[] | null> {
  const { data, error } = await supabase
    .from('transcripts')
    .select('words')
    .eq('asset_id', assetId)
    .maybeSingle()

  if (error !== null) throw new Error(`could not read the transcript: ${error.message}`)
  if (data === null) return null

  const words = (data as { words?: unknown }).words
  if (!Array.isArray(words) || words.length === 0) return null

  return words.flatMap((word) => {
    if (typeof word !== 'object' || word === null) return []
    const { text, start, end } = word as { text?: unknown; start?: unknown; end?: unknown }
    if (typeof text !== 'string' || typeof start !== 'number' || typeof end !== 'number') return []
    return [{ text, start, end }]
  })
}

/**
 * Transcribe, store the words, and record what the source turned out to be.
 *
 * The probe comes back with the transcript because the Python side has the file
 * open anyway, and `video_assets.duration_s` has been null since the upload —
 * nobody had looked. That is also where the hour limit is enforced: a client
 * can send a 90-minute file (the bucket allows the bytes), and this is the
 * first moment anyone knows it is 90 minutes.
 */
async function transcribeSource(
  supabase: SupabaseClient,
  asset: AssetRow,
  workspaceId: string,
  localPath: string,
): Promise<TranscriptOutcome> {
  const run = await runPipeline('transcribe-source', [localPath], TRANSCRIBE_TIME_BUDGET_MS)

  if (run.timedOut) {
    throw new Error(
      `transcribing ${asset.original_name} ran past its ${Math.round(TRANSCRIBE_TIME_BUDGET_MS / 60000)}-minute budget`,
    )
  }

  if (run.code === 1) {
    // The engine's own refusals: no audio track, no model and no sidecar, no
    // words. All of them are about the file rather than about us.
    console.warn(`[worker] transcribe-source refused: ${run.stderr.trim()}`)
    return {
      refusal:
        'We could not get the words out of that file. Check it has clear speech, and send it again.',
    }
  }

  if (run.code !== 0) {
    throw new Error(`transcribe-source exited ${run.code}: ${run.stderr.trim()}`)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(run.stdout) as Record<string, unknown>
  } catch {
    throw new Error('transcribe-source returned output that is not JSON')
  }

  const source = (parsed.source ?? {}) as Record<string, unknown>
  const durationS = typeof source.durationS === 'number' ? source.durationS : null

  await supabase
    .from('video_assets')
    .update({
      duration_s: durationS,
      width: typeof source.width === 'number' ? source.width : null,
      height: typeof source.height === 'number' ? source.height : null,
      has_audio: typeof source.hasAudio === 'boolean' ? source.hasAudio : null,
    })
    .eq('id', asset.id)

  if (durationS !== null && durationS > MAX_SOURCE_SECONDS) {
    const minutes = Math.round(MAX_SOURCE_SECONDS / 60)
    return {
      refusal: `That file is ${Math.round(durationS / 60)} minutes long, and we cut from up to ${minutes}. Send a shorter version.`,
    }
  }

  const words: readonly PlanWord[] = Array.isArray(parsed.words)
    ? (parsed.words as PlanWord[])
    : []
  if (words.length === 0) {
    return { refusal: 'That file transcribed to no words at all.' }
  }

  const stored = await supabase.from('transcripts').upsert(
    {
      asset_id: asset.id,
      workspace_id: workspaceId,
      engine: typeof parsed.engine === 'string' ? parsed.engine : 'unknown',
      language: typeof parsed.language === 'string' ? parsed.language : null,
      words,
      word_count: words.length,
    },
    { onConflict: 'asset_id' },
  )

  if (stored.error !== null) {
    // Worth saying rather than swallowing: the words are in hand and only the
    // bookkeeping failed, so this render will work and the *next* one pays to
    // transcribe again.
    console.error(`[worker] could not store the transcript: ${stored.error.message}`)
  }

  return { words }
}

/**
 * The id this cut's row will have, reused across attempts.
 *
 * A job whose lease expired is claimed again, and the second attempt must land
 * on the same row — `renders_job_cut` makes sure of that. The *id* has to be
 * stable too, because the storage paths are built from it: a fresh uuid on the
 * second attempt would upload to a new path, update the row to point at it, and
 * leave the first attempt's objects behind with nothing referencing them.
 */
async function renderIdFor(
  supabase: SupabaseClient,
  jobId: string,
  cutIndex: number,
): Promise<string> {
  const { data } = await supabase
    .from('renders')
    .select('id')
    .eq('job_id', jobId)
    .eq('cut_index', cutIndex)
    .maybeSingle()

  const existing = (data as { id?: unknown } | null)?.id
  return typeof existing === 'string' ? existing : crypto.randomUUID()
}

async function writeFailedRender(
  supabase: SupabaseClient,
  job: RenderJob,
  renderId: string,
  assetId: string,
  draftId: string,
  title: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.from('renders').upsert(
    {
      id: renderId,
      workspace_id: job.workspace_id,
      job_id: job.id,
      asset_id: assetId,
      draft_id: draftId,
      cut_index: FIRST_CUT_INDEX,
      title,
      status: 'failed',
      error: reason,
    },
    { onConflict: 'job_id,cut_index' },
  )

  if (error !== null) {
    console.error(`[worker] could not record the refusal: ${error.message}`)
  }
}

export async function runRenderJob(
  supabase: SupabaseClient,
  job: RenderJob,
): Promise<RenderResult> {
  const assetId = requireString(job.payload, 'assetId')
  const draftId = requireString(job.payload, 'draftId')

  const assetRead = await supabase
    .from('video_assets')
    .select('id, storage_path, rights_holder, rights_confirmed_at, original_name')
    .eq('id', assetId)
    .eq('workspace_id', job.workspace_id)
    .maybeSingle()

  if (assetRead.error !== null) {
    throw new Error(`could not read the upload: ${assetRead.error.message}`)
  }
  if (assetRead.data === null) {
    return { outcome: 'refused', message: 'That upload could not be found.' }
  }
  const asset = assetRead.data as unknown as AssetRow

  const renderId = await renderIdFor(supabase, job.id, FIRST_CUT_INDEX)

  const idea = await readIdea(supabase, job.workspace_id, draftId)
  if ('refusal' in idea) {
    await writeFailedRender(
      supabase,
      job,
      renderId,
      assetId,
      draftId,
      asset.original_name,
      idea.refusal,
    )
    return { outcome: 'refused', message: idea.refusal }
  }

  const profile = await supabase
    .from('client_profiles')
    .select('brand_name')
    .eq('workspace_id', job.workspace_id)
    .maybeSingle()

  const brandName = (profile.data as { brand_name?: unknown } | null)?.brand_name
  const workDir = await mkdtemp(join(tmpdir(), 'mirrorline-render-'))

  try {
    const localSource = join(workDir, 'source.mp4')
    await downloadObject(supabase, FOOTAGE_BUCKET, asset.storage_path, localSource)

    // The expensive leg, skipped when this upload has been transcribed before.
    // That is what makes a second cut of the same source nearly free, and it is
    // also the recovery path: a job reclaimed after a crash does not pay twice.
    const stored = await readTranscript(supabase, assetId)
    let words: readonly PlanWord[]

    if (stored !== null) {
      words = stored
    } else {
      const fresh = await transcribeSource(supabase, asset, job.workspace_id, localSource)
      if ('refusal' in fresh) {
        await writeFailedRender(
          supabase,
          job,
          renderId,
          assetId,
          draftId,
          idea.title,
          fresh.refusal,
        )
        return { outcome: 'refused', message: fresh.refusal }
      }
      words = fresh.words
    }

    const outDir = join(workDir, 'out')
    const planPath = join(workDir, 'plan.json')

    await writeFile(
      planPath,
      `${JSON.stringify(
        renderPlanFor({
          sourcePath: localSource,
          outDir,
          title: idea.title,
          hook: idea.hook,
          beats: idea.beats,
          words,
          brand: brandForRender({
            rightsHolder: asset.rights_holder,
            assetId,
            brandName: typeof brandName === 'string' ? brandName : null,
            confirmedOn: asset.rights_confirmed_at,
          }),
        }),
        null,
        2,
      )}\n`,
      'utf8',
    )

    const render = await runPipeline('render-short', [planPath], RENDER_TIME_BUDGET_MS)

    if (render.timedOut) {
      throw new Error(
        `rendering ran past its ${Math.round(RENDER_TIME_BUDGET_MS / 60000)}-minute budget`,
      )
    }
    if (render.code === 2) {
      // The plan was wrong, which is our bug and not the client's footage.
      throw new Error(`render-short rejected the plan: ${render.stderr.trim()}`)
    }

    // `summary.json` is the contract in both directions: a refusal writes one
    // too, so the sentence a client reads never comes from parsing stderr.
    const summaryRaw = await readFile(join(outDir, 'summary.json'), 'utf8').catch(() => null)

    let summary = null
    if (summaryRaw !== null) {
      try {
        summary = parseRenderSummary(JSON.parse(summaryRaw) as unknown, assetId)
      } catch {
        summary = null
      }
    }

    if (summary === null) {
      throw new Error(
        `render-short exited ${render.code} and wrote no readable summary: ${render.stderr.trim()}`,
      )
    }

    if (!summary.ok || summary.shortPath === null) {
      const reason = summary.reason ?? 'The video could not be made from this footage.'
      await writeFailedRender(supabase, job, renderId, assetId, draftId, idea.title, reason)
      return { outcome: 'refused', message: reason }
    }

    const shortPath = `${job.workspace_id}/${renderId}/short.mp4`
    const posterPath = `${job.workspace_id}/${renderId}/poster.jpg`

    const bytes = await uploadObject(supabase, RENDERS_BUCKET, shortPath, summary.shortPath, 'video/mp4')
    if (summary.posterPath !== null) {
      await uploadObject(supabase, RENDERS_BUCKET, posterPath, summary.posterPath, 'image/jpeg')
    }

    const aiScenes = aiScenesOf(summary.segments)

    const written = await supabase.from('renders').upsert(
      {
        id: renderId,
        workspace_id: job.workspace_id,
        job_id: job.id,
        asset_id: assetId,
        draft_id: draftId,
        cut_index: FIRST_CUT_INDEX,
        title: idea.title,
        status: 'ready',
        storage_path: shortPath,
        poster_path: summary.posterPath === null ? null : posterPath,
        duration_s: summary.durationS,
        bytes,
        segments: summary.segments,
        // Empty in slice 1, and the constraint `renders_ai_scene_is_labelled`
        // is what makes the day it is not empty safe: an unlabelled generated
        // scene cannot be inserted at all.
        ai_scenes: aiScenes,
        ai_label: aiLabelFor(summary.segments),
        compliance: {
          verdict: summary.complianceVerdict,
          findings: summary.complianceFindings,
        },
      },
      { onConflict: 'job_id,cut_index' },
    )

    if (written.error !== null) {
      throw new Error(`could not record the render: ${written.error.message}`)
    }

    const beats = summary.segments.length
    const seconds = Math.round(summary.durationS ?? 0)
    return {
      outcome: 'complete',
      message: `Cut "${idea.title}" — ${beats} beats, ${seconds}s, captions burned in.`,
    }
  } finally {
    // The source is gigabytes and the container's disk is ephemeral but not
    // infinite: a worker that leaked one source per job would fill in a day.
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

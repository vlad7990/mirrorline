import 'server-only'

/**
 * Turning a finished upload into a queued render (V5, slice 1).
 *
 * ============================================================================
 * The client says the upload finished. We check.
 * ============================================================================
 *
 * The browser uploads straight to Storage, so "it finished" arrives as a
 * message from the thing that did the uploading. That is not a reason to
 * distrust the client — it is a reason not to *depend* on them: a tab closed
 * at 94%, a resumed upload that stalled, or a tampered call would all otherwise
 * queue a render against a truncated object, and the first thing the worker
 * would do is spend four minutes transcribing it.
 *
 * So the object is listed before the job is written. One round trip, and it
 * turns a class of confusing render failures into one clear refusal.
 *
 * ============================================================================
 * Only an approved draft gets a render
 * ============================================================================
 *
 * V3's rule is that approval is refused server-side rather than hidden
 * (`approve_draft`, `drafts_approved_passed`). A render started from an
 * unapproved draft would walk around all of it — the compute would be spent on
 * a script the Originality Gate had not passed. The check is here *and* in the
 * worker, because this one gives the client a sentence and that one is the
 * guarantee.
 */

import { enqueueJob } from '../jobs/enqueue'
import { createAgentServiceClient } from '../agents/service-client'

import { FOOTAGE_BUCKET } from './types'

const COULD_NOT_START = 'We could not start that video just now. Try again shortly.'

export interface StartRenderRequest {
  readonly workspaceId: string
  readonly assetId: string
  /** The approved idea this short follows. */
  readonly draftId: string
}

export type StartRenderOutcome =
  | { readonly status: 'queued'; readonly jobId: string }
  /** One render at a time per workspace, by `jobs_one_pending_per_kind`. */
  | { readonly status: 'already-pending'; readonly message: string }
  | { readonly status: 'refused'; readonly message: string }
  | { readonly status: 'failed'; readonly message: string }

interface AssetRow {
  readonly storage_path?: unknown
  readonly status?: unknown
  readonly bytes?: unknown
}

/**
 * Is the object actually there, and is it the size the row claims?
 *
 * `list` rather than a download: the answer needed is "does this object exist
 * and is it plausibly complete", and pulling 4 GB to find out would be absurd.
 * A short object against a row that says 4 GB is a truncated upload, which is
 * the common failure and the one worth naming.
 */
async function objectIsComplete(
  supabase: ReturnType<typeof createAgentServiceClient>,
  path: string,
  expectedBytes: number | null,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const slash = path.lastIndexOf('/')
  const folder = slash === -1 ? '' : path.slice(0, slash)
  const name = path.slice(slash + 1)

  const listed = await supabase.storage.from(FOOTAGE_BUCKET).list(folder, { search: name })

  if (listed.error !== null) {
    console.error(`[video] could not list ${folder}: ${listed.error.message}`)
    return { ok: false, message: COULD_NOT_START }
  }

  const object = (listed.data ?? []).find((entry) => entry.name === name)
  if (object === undefined) {
    return {
      ok: false,
      message: 'That upload did not finish, so there is nothing to cut yet. Send the file again.',
    }
  }

  const size = (object.metadata as { size?: unknown } | null)?.size
  if (typeof size === 'number' && expectedBytes !== null && size < expectedBytes) {
    const percent = Math.floor((size / expectedBytes) * 100)
    return {
      ok: false,
      message: `That upload stopped at about ${percent}% of the file. Send it again and it will resume.`,
    }
  }

  return { ok: true }
}

export async function startRender(request: StartRenderRequest): Promise<StartRenderOutcome> {
  const supabase = createAgentServiceClient()

  const asset = await supabase
    .from('video_assets')
    .select('storage_path, status, bytes')
    .eq('id', request.assetId)
    // The workspace is taken from the session by the caller, never from the
    // form, and it is matched here so an id belonging to somebody else's
    // studio reads as "not found" rather than as a render.
    .eq('workspace_id', request.workspaceId)
    .maybeSingle()

  const assetRow = asset.data as AssetRow | null
  if (asset.error !== null) {
    console.error(`[video] could not read the asset: ${asset.error.code ?? 'unknown'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  if (assetRow === null || typeof assetRow.storage_path !== 'string') {
    return { status: 'refused', message: 'That upload could not be found.' }
  }

  if (assetRow.status === 'rejected') {
    return { status: 'refused', message: 'That upload was rejected, so it cannot be cut.' }
  }

  const complete = await objectIsComplete(
    supabase,
    assetRow.storage_path,
    typeof assetRow.bytes === 'number' ? assetRow.bytes : null,
  )
  if (!complete.ok) {
    return { status: 'refused', message: complete.message }
  }

  const draft = await supabase
    .from('drafts')
    .select('status, title')
    .eq('id', request.draftId)
    .eq('workspace_id', request.workspaceId)
    .maybeSingle()

  const draftRow = draft.data as { status?: unknown; title?: unknown } | null
  if (draft.error !== null) {
    console.error(`[video] could not read the draft: ${draft.error.code ?? 'unknown'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  if (draftRow === null) {
    return { status: 'refused', message: 'That video idea could not be found.' }
  }

  if (draftRow.status !== 'approved') {
    return {
      status: 'refused',
      message: 'Approve that video idea first, and then we can cut it.',
    }
  }

  // `ready` only now: the object is there, the size is right, and the script is
  // approved. Until this line the row is honest about being an upload in
  // progress, which is what makes an abandoned one sweepable.
  const marked = await supabase
    .from('video_assets')
    .update({ status: 'ready' })
    .eq('id', request.assetId)

  if (marked.error !== null) {
    console.error(`[video] could not mark the asset ready: ${marked.error.code ?? 'unknown'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  const queued = await enqueueJob({
    workspaceId: request.workspaceId,
    kind: 'render-cuts',
    payload: { assetId: request.assetId, draftId: request.draftId },
  })

  if (queued.status === 'queued') {
    return { status: 'queued', jobId: queued.jobId }
  }

  if (queued.status === 'already-pending') {
    // `jobs_one_pending_per_kind` is per workspace *and* kind, so this does not
    // collide with a running Niche Scan — it means another video is being made
    // right now. An honest sentence rather than a second encode: two ffmpeg
    // runs on two vCPUs is slower than one after the other.
    return {
      status: 'already-pending',
      message: 'We are already making a video for you. This one starts when that one finishes.',
    }
  }

  return { status: 'failed', message: queued.message }
}

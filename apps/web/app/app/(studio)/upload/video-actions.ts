'use server'

/**
 * The three things a client can do with footage (V5, slice 1).
 *
 * ============================================================================
 * The workspace is never a parameter
 * ============================================================================
 *
 * Every action here reads the workspace from the session with
 * `getOwnedWorkspace()` and ignores anything the form says about it. That is
 * the same rule `runNicheScanAction` and `saveClientProfileAction` follow, and
 * for video it is load-bearing twice over: an upload is storage somebody pays
 * for, and a render is CPU somebody pays for.
 *
 * ============================================================================
 * Input is untrusted, and the boundary is here
 * ============================================================================
 *
 * These take `unknown` and narrow, rather than taking typed parameters that a
 * caller could have lied about. A server action is a public endpoint — Next
 * compiles every export into one — so "the component only ever sends a string"
 * is not a property of the system.
 */

import { revalidatePath } from 'next/cache'

import {
  APPROVE_ERROR_MESSAGE,
  DRAFT_NOT_FOUND_MESSAGE,
  readApproveReply,
  type ApproveDraftResult,
} from '@/lib/drafts/approve-reply'
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server-client'
import { createFootageUpload, type CreateUploadOutcome } from '@/lib/video/create-upload'
import { startRender, type StartRenderOutcome } from '@/lib/video/start-render'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'

/** One sentence for "you are not signed in, or you have no workspace yet". */
const NO_WORKSPACE = 'Sign in again and we will pick this up.'

interface UploadRequestShape {
  readonly name: unknown
  readonly mime: unknown
  readonly bytes: unknown
  readonly rightsHolder: unknown
  readonly rightsConfirmed: unknown
}

/**
 * Create the asset row and mint an upload token.
 *
 * The browser then uploads **straight to Supabase Storage** over TUS. No bytes
 * pass through this function or through any Vercel function — §V5 is explicit
 * that "a function body limit is not an upload strategy".
 */
export async function createFootageUploadAction(input: unknown): Promise<CreateUploadOutcome> {
  const workspace = await getOwnedWorkspace()
  if (workspace === null) return { status: 'failed', message: NO_WORKSPACE }

  if (typeof input !== 'object' || input === null) {
    return { status: 'refused', message: 'That upload could not be read.' }
  }

  const request = input as UploadRequestShape
  const user = await getCurrentUser()

  return createFootageUpload({
    workspaceId: workspace.id,
    userId: user?.id ?? null,
    originalName: typeof request.name === 'string' ? request.name : '',
    mime: typeof request.mime === 'string' ? request.mime : '',
    bytes: typeof request.bytes === 'number' ? request.bytes : 0,
    rightsHolder: typeof request.rightsHolder === 'string' ? request.rightsHolder : '',
    // Only the boolean true. A truthy string from a tampered call is not a
    // confirmation anybody made — non-negotiable 1 wants a person to have
    // ticked a box.
    rightsConfirmed: request.rightsConfirmed === true,
  })
}

/** Queue the render once the upload has finished. Checks that it really has. */
export async function startRenderAction(
  assetId: unknown,
  draftId: unknown,
): Promise<StartRenderOutcome> {
  const workspace = await getOwnedWorkspace()
  if (workspace === null) return { status: 'failed', message: NO_WORKSPACE }

  if (typeof assetId !== 'string' || assetId === '') {
    return { status: 'refused', message: 'That upload could not be found.' }
  }
  if (typeof draftId !== 'string' || draftId === '') {
    return { status: 'refused', message: 'Choose which video idea to cut.' }
  }

  const outcome = await startRender({ workspaceId: workspace.id, assetId, draftId })

  // Only on a real change: revalidating after a refusal re-renders the screen
  // to show exactly what it already showed.
  if (outcome.status === 'queued') revalidatePath('/app/upload')

  return outcome
}

/**
 * Approve a finished video.
 *
 * `approve_render` is the refusal, not this function — the same three-layer
 * shape `approveDraft` documents: a check constraint that binds every role, a
 * `security definer` function that checks membership and the compliance
 * verdict, and an action that turns the answer into something a screen can
 * render. Remove any one and the other two still refuse.
 *
 * The reply parser is `lib/drafts/approve-reply`, reused rather than copied:
 * `approve_render` answers in the same `{ ok, status, reason }` shape on
 * purpose, and two parsers for one shape is how the two drift.
 */
export async function approveRenderAction(renderId: unknown): Promise<ApproveDraftResult> {
  if (typeof renderId !== 'string' || renderId === '') {
    return { status: 'error', message: DRAFT_NOT_FOUND_MESSAGE }
  }

  const supabase = await createSupabaseServerClient()

  // No workspace id is passed: `approve_render` reaches the workspace through
  // the row and checks `is_member_of` itself, so an id belonging to somebody
  // else's studio is refused by the function — with the same sentence as a
  // missing one, so the attempt learns nothing about whether the id was real.
  const { data, error } = await supabase.rpc('approve_render', { render_id: renderId })

  if (error) {
    // The code, not the message: a PostgREST error body can quote the statement
    // it refused, and this sentence is rendered to a client.
    console.error(`[video] approve_render failed: ${error.code ?? 'unknown'}`)
    return { status: 'error', message: APPROVE_ERROR_MESSAGE }
  }

  const result = readApproveReply(data)
  if (result.status === 'approved') revalidatePath('/app/upload')

  return result
}

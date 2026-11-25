'use server'

/**
 * Approving a draft — V3's second done-when (D129).
 *
 * ============================================================================
 * This file is not the refusal
 * ============================================================================
 *
 * Worth being blunt about, because an action named `approveDraft` looks like
 * the place the rule lives and it is only the place the rule is *carried*.
 * Three things stand behind it, in descending order of how much they can be
 * worked around:
 *
 * 1. **`drafts_approved_passed`** — a check constraint. An approved row must
 *    carry a `passed` verdict, and a check constraint binds every role: a
 *    member, this action, the worker's service role, somebody at a psql
 *    prompt. `04 §Originality Gate` forbids an override "from anywhere", and
 *    this is the only mechanism that means *anywhere*.
 * 2. **`approve_draft`** — a `security definer` function that checks membership
 *    and the verdict, and returns a sentence when it refuses. It exists because
 *    `authenticated` holds **no update grant at all** on `drafts`, so there is
 *    no PostgREST patch that sets a status.
 * 3. **This action**, which calls it and turns the answer into something the
 *    screen can render.
 *
 * Remove any one of the three and the other two still refuse. That is the shape
 * V3 asks for when it says the refusal must be server-side "not merely hidden".
 *
 * ============================================================================
 * A refusal is not an error
 * ============================================================================
 *
 * `{ status: 'refused' }` is its own result, separate from `'error'`, because
 * the gate refusing is the gate *working* — `18 §6`'s rule for the spend cap,
 * and the reason `jobs` records a refusal as a completed job. Rendering a
 * working control as a fault teaches the reader to distrust it.
 */

import { revalidatePath } from 'next/cache'

import {
  APPROVE_ERROR_MESSAGE,
  DRAFT_NOT_FOUND_MESSAGE,
  readApproveReply,
  type ApproveDraftResult,
} from '@/lib/drafts/approve-reply'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

export async function approveDraft(draftId: unknown): Promise<ApproveDraftResult> {
  if (typeof draftId !== 'string' || draftId === '') {
    return { status: 'error', message: DRAFT_NOT_FOUND_MESSAGE }
  }

  const supabase = await createSupabaseServerClient()

  // No workspace id is passed. `approve_draft` reaches the workspace through
  // the row and checks `is_member_of` itself, so a tampered id belonging to
  // somebody else's studio is refused by the function rather than by code here
  // — and refused with the same sentence as a missing one, so the attempt
  // learns nothing about whether the id was real.
  const { data, error } = await supabase.rpc('approve_draft', { draft_id: draftId })

  if (error) {
    // The code, not the message: a PostgREST error body can quote the statement
    // it refused, and this sentence is rendered to a client. The detail belongs
    // in the server log.
    console.error(`[drafts] approve_draft failed: ${error.code ?? 'unknown'}`)
    return { status: 'error', message: APPROVE_ERROR_MESSAGE }
  }

  const result = readApproveReply(data)

  // Only on a real change. Revalidating after a refusal would re-render the
  // screen to show exactly what it already showed.
  if (result.status === 'approved') revalidatePath('/app/trends')

  return result
}

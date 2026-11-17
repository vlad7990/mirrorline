'use server'

/**
 * Deleting a workspace — the one irreversible thing a client can do here.
 *
 * ============================================================================
 * The typed name is checked again, on the server
 * ============================================================================
 *
 * `DeleteWorkspaceCard` disables its button until the name matches, and that is
 * a courtesy to the person rather than a control on the request: a disabled
 * attribute lives in the browser, and this action is reachable without one.
 * So `matchesWorkspaceName` runs here too, against the name read from the
 * database rather than anything the form supplied.
 *
 * Note what is *not* trusted from the form: the workspace id. It comes from
 * `getOwnedWorkspace()`, so a tampered request cannot name somebody else's
 * workspace — and `delete_workspace` would refuse it anyway, since it re-asks
 * the ownership question itself. Two refusals, as that migration puts it.
 *
 * ============================================================================
 * Why the sign-out is allowed to fail
 * ============================================================================
 *
 * `delete_workspace` deletes the caller's `auth.users` row when the workspace
 * was their last (D80). By the time it returns, the session may belong to a
 * user who no longer exists, and `signOut()` can fail for that reason. That is
 * success, not an error: the account is gone, which is what was asked for. The
 * cookie still has to be cleared locally either way, and the redirect still has
 * to happen, so the failure is swallowed deliberately rather than by accident.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { SIGN_IN_PATH } from '@/lib/auth/redirect-rules'
import { REMEMBER_COOKIE } from '@/lib/supabase/cookie-policy'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'
import { matchesWorkspaceName } from '@/lib/workspace/delete-confirmation'

import { type DeleteWorkspaceState } from './delete-workspace-state'

const NOT_OWNER =
  'Only the owner of a workspace can delete it, and we could not confirm you own this one.'

const MISMATCH = 'That is not the workspace name. Type it exactly as it is shown to confirm.'

const DELETE_FAILED = 'We could not delete the workspace just now. Nothing has been removed.'

function fail(message: string): DeleteWorkspaceState {
  return { status: 'error', message }
}

export async function deleteWorkspaceAction(
  _previous: DeleteWorkspaceState,
  formData: FormData,
): Promise<DeleteWorkspaceState> {
  const typedValue = formData.get('confirmation')
  const typed = typeof typedValue === 'string' ? typedValue : ''

  const workspace = await getOwnedWorkspace()
  if (workspace === null) return fail(NOT_OWNER)

  // See the note at the top: the browser already checked this, and the browser
  // is not what makes it true.
  if (!matchesWorkspaceName(workspace.name, typed)) return fail(MISMATCH)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('delete_workspace', { p_workspace_id: workspace.id })

  // Nothing has been removed: the function is one statement to Postgres, so a
  // failure leaves the workspace whole. The message says so, because "could
  // not delete" otherwise leaves somebody wondering how much of it went.
  if (error !== null) return fail(DELETE_FAILED)

  try {
    await supabase.auth.signOut()
  } catch {
    // The user row may already be gone. See the note at the top.
  }

  const cookieStore = await cookies()
  cookieStore.delete(REMEMBER_COOKIE)

  redirect(SIGN_IN_PATH)
}

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

import { revalidatePath } from 'next/cache'
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

/**
 * SQLSTATE `45001`, raised by `delete_workspace` when somebody else is still a
 * member. Matched on the code rather than the message so the wording on either
 * side can change independently — see the migration's note.
 */
const HAS_OTHER_MEMBERS_CODE = '45001'

const HAS_OTHER_MEMBERS =
  'This workspace has other members, so it cannot be deleted yet. Remove them from the Team ' +
  'card first, or transfer ownership to one of them. Nothing has been removed.'

function fail(message: string): DeleteWorkspaceState {
  return { status: 'error', message }
}

/* -------------------------------------------------------------------------- */
/* Connection state (B2.3, D107)                                              */
/* -------------------------------------------------------------------------- */

/**
 * SQLSTATE `45006` — an unsupported platform or a blank handle, refused by
 * `connect_social_account` rather than by the column constraint, so there is a
 * sentence to show rather than a `23514`.
 */
const BAD_ACCOUNT_CODE = '45006'

/** SQLSTATE `45007` — no such account on this workspace (D108). */
const NO_SUCH_ACCOUNT_CODE = '45007'

/** SQLSTATE `45002` — raised when the caller owns no workspace. */
const NO_WORKSPACE_CODE = '45002'

const BAD_ACCOUNT =
  'We need the platform and the account handle, and the platform has to be one we support. ' +
  'Nothing has changed.'

const NO_WORKSPACE =
  'We could not find a workspace you own, so there is nothing to connect the account to.'

const CONNECT_FAILED =
  'We could not save that connection just now. Nothing has changed — try again in a moment.'

const DISCONNECT_FAILED =
  'We could not disconnect that account just now. It is still connected — try again in a moment.'

/**
 * D108: one answer for "no such account" and "not yours".
 *
 * The wording is deliberately about *this* workspace rather than about the
 * handle existing anywhere, because the database will not say which case it was
 * and this message must not imply more than it knows.
 */
const NOT_ON_THIS_WORKSPACE =
  'We do not have that account on this workspace. Check the handle against the ones listed above.'

export type ConnectionState =
  | { readonly status: 'idle' }
  | { readonly status: 'connected' }
  | { readonly status: 'disconnected' }
  | { readonly status: 'error'; readonly message: string }

/**
 * "This account is mine" — not an OAuth grant (§6).
 *
 * Nothing here stores a token, because there is none to store until the
 * platform approvals exist. The function upserts on `(platform, handle)` and
 * decides the workspace from the caller's own membership, so there is no
 * workspace id to pass and none to get wrong (D107).
 */
export async function connectSocialAccountAction(
  platform: string,
  handle: string,
): Promise<ConnectionState> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('connect_social_account', {
    p_platform: platform,
    p_handle: handle,
    // The platform limit is ours to write, not the client's to supply, and a
    // null here leaves any existing note alone rather than erasing it.
    p_note: null,
  })

  if (error === null) {
    // Both screens read this table. Revalidating only Settings would leave the
    // Accounts board on the previous state until something else moved.
    revalidatePath('/app/settings')
    revalidatePath('/app/accounts')
    return { status: 'connected' }
  }

  if (error.code === BAD_ACCOUNT_CODE) return { status: 'error', message: BAD_ACCOUNT }
  if (error.code === NO_WORKSPACE_CODE) return { status: 'error', message: NO_WORKSPACE }

  return { status: 'error', message: CONNECT_FAILED }
}

/**
 * Stop posting to an account, and keep the row.
 *
 * The row survives so the card can still say which account it was, and so
 * `metric_snapshots` keep something to reference. Platform and handle rather
 * than an id, so the lookup cannot address another workspace's row at all
 * (D107).
 */
export async function disconnectSocialAccountAction(
  platform: string,
  handle: string,
): Promise<ConnectionState> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('disconnect_social_account', {
    p_platform: platform,
    p_handle: handle,
  })

  if (error === null) {
    revalidatePath('/app/settings')
    revalidatePath('/app/accounts')
    return { status: 'disconnected' }
  }

  if (error.code === NO_SUCH_ACCOUNT_CODE) {
    return { status: 'error', message: NOT_ON_THIS_WORKSPACE }
  }
  if (error.code === BAD_ACCOUNT_CODE) return { status: 'error', message: BAD_ACCOUNT }
  if (error.code === NO_WORKSPACE_CODE) return { status: 'error', message: NO_WORKSPACE }

  return { status: 'error', message: DISCONNECT_FAILED }
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

  // Nothing has been removed: the function counts the other members before it
  // deletes anything, and is one statement to Postgres either way, so a
  // failure leaves the workspace whole. Both messages say so, because "could
  // not delete" otherwise leaves somebody wondering how much of it went.
  if (error !== null) {
    // A refusal the person can act on, told apart from a fault they cannot.
    if (error.code === HAS_OTHER_MEMBERS_CODE) return fail(HAS_OTHER_MEMBERS)
    return fail(DELETE_FAILED)
  }

  try {
    await supabase.auth.signOut()
  } catch {
    // The user row may already be gone. See the note at the top.
  }

  const cookieStore = await cookies()
  cookieStore.delete(REMEMBER_COOKIE)

  redirect(SIGN_IN_PATH)
}

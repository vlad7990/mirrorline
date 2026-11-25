/**
 * Which workspace is mine — asked as the signed-in user, never as the service
 * role.
 *
 * ============================================================================
 * The `user_id` filter is load-bearing, not belt-and-braces
 * ============================================================================
 *
 * `memberships_select_own_workspaces` reads
 * `using (public.is_member_of(workspace_id))`. That is the correct policy, and
 * it means a select on `memberships` returns **every membership row in every
 * workspace I belong to** — including other people's, including their `owner`
 * rows. So `.eq('role', 'owner')` on its own would happily hand back a
 * colleague's ownership of a shared workspace.
 *
 * Filtering on `user_id` is therefore part of the question rather than a
 * second opinion about the answer. RLS decides which rows I may *see*; only
 * this filter decides which row is *mine*. `rls.db.test.ts` proves the policy;
 * nothing but this line would have caught the confusion above.
 *
 * ============================================================================
 * Why `owner` and not just "a workspace"
 * ============================================================================
 *
 * Both callers need an owner: onboarding writes to `workspaces`, which
 * `workspaces_update_owner` restricts to owners, and `delete_workspace` raises
 * "only an owner may delete a workspace". Returning a workspace the caller
 * merely belongs to would push both failures one layer down, where the message
 * is a Postgres error rather than a sentence.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

export interface OwnedWorkspace {
  readonly id: string
  readonly name: string
  /**
   * What the client said their niche is, at onboarding.
   *
   * Read so the Niche Scan form can be pre-filled with it (V1): the common scan
   * is "my own niche", and an empty box asks the client to retype something we
   * already stored. Nullable because the column is — a workspace created by the
   * magic-link path has not answered that question yet.
   */
  readonly niche: string | null
  /**
   * The IANA zone captured at onboarding, or null for "not captured" (D97).
   *
   * Read so the niche report's dates are the client's dates (D131). Null is an
   * ordinary answer and never means UTC — `reportTimeZone` decides what to print
   * instead, and the column stays honest about not knowing.
   */
  readonly timezone: string | null
}

/**
 * The oldest workspace this user owns, or `null`.
 *
 * `null` is an ordinary answer, not a failure: somebody who arrived by magic
 * link without finishing sign-up has a session and no workspace
 * (`ensureWorkspace` declines to invent a name for them). Callers decide what
 * to do about it; this does not guess.
 *
 * Ordered by `created_at` to match `ensure_workspace_for_current_user`, which
 * hands back the oldest owned workspace on a repeat call. Two places answering
 * "which one" differently is how a user ends up editing one workspace and
 * looking at another.
 */
export async function getOwnedWorkspace(): Promise<OwnedWorkspace | null> {
  const supabase = await createSupabaseServerClient()

  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (user === null) return null

  const membership = await supabase
    .from('memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  const workspaceId = membership.data?.workspace_id
  if (membership.error !== null || typeof workspaceId !== 'string') return null

  const workspace = await supabase
    .from('workspaces')
    .select('id, name, niche, timezone')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspace.error !== null || workspace.data === null) return null

  return {
    id: workspace.data.id,
    name: workspace.data.name,
    niche: workspace.data.niche ?? null,
    timezone: workspace.data.timezone ?? null,
  }
}

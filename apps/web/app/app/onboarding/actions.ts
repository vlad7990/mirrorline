'use server'

/**
 * Onboarding's one write: the niche, the 2×2, and the goal in the user's own
 * words.
 *
 * ============================================================================
 * What was already true before this existed
 * ============================================================================
 *
 * `ensure_workspace_for_current_user` runs at sign-in and sign-up, so by the
 * time anybody reaches the wizard **the workspace exists** — with a name, and
 * with `niche` null because sign-up never asked. `app/(auth)/actions.ts` passes
 * `p_niche: null` for exactly that reason. This action fills in the three
 * columns the bootstrap left open and writes the row the bootstrap could not:
 * the goal.
 *
 * So this is an update, not a creation, and that is why it needs no service
 * role and no new RPC. `workspaces_update_owner` and `goals_insert_members`
 * already permit it as the signed-in user, and `rls.db.test.ts` proves both.
 *
 * ============================================================================
 * Why the goal is read-then-write rather than an upsert
 * ============================================================================
 *
 * `goals_one_primary_per_workspace` is a partial unique index — one row per
 * workspace `where is_primary`. An `upsert` needs a conflict target, and a
 * partial index is not one PostgREST can name, so `on_conflict` would have to
 * pretend the constraint is something it is not.
 *
 * Reading first and choosing update-or-insert is honest about that, and it also
 * makes re-running onboarding a no-op rather than a 409: somebody who walks
 * back through the wizard to change their answer gets their one goal edited.
 * The race this leaves — two tabs submitting at once — is caught by the index
 * itself, which is the right place for it.
 */

import { redirect } from 'next/navigation'

import { SIGN_IN_PATH } from '@/lib/auth/redirect-rules'
import { STUDIO_HOME } from '@/lib/routes'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'
import { parseOnboardingSubmission } from '@/lib/workspace/onboarding-input'

import { type OnboardingFormState } from './onboarding-form-state'

/** One sentence for anything the person cannot fix by retyping a field. */
const SAVE_FAILED = 'We could not save your setup just now. Please try again.'

const NO_WORKSPACE =
  'We could not find your workspace. Sign in again and we will pick this up where you left off.'

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function fail(message: string): OnboardingFormState {
  return { status: 'error', message }
}

export async function saveOnboarding(
  _previous: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = parseOnboardingSubmission({
    niche: field(formData, 'niche'),
    audience: field(formData, 'audience'),
    stage: field(formData, 'stage'),
    goalType: field(formData, 'goalType'),
    outcomeText: field(formData, 'outcomeText'),
  })

  // The person can fix all of these by editing a field, so the parser's
  // sentence goes straight back to them.
  if (!parsed.ok) return fail(parsed.message)

  const workspace = await getOwnedWorkspace()

  // No session at all is a different answer from a session with no workspace,
  // and only the first one is worth a redirect.
  if (workspace === null) {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (data.user === null) redirect(SIGN_IN_PATH)
    return fail(NO_WORKSPACE)
  }

  const { niche, audience, stage, goalType, outcomeText } = parsed.value
  const supabase = await createSupabaseServerClient()

  const updated = await supabase
    .from('workspaces')
    .update({ niche, audience, stage, initial_goal_type: goalType })
    .eq('id', workspace.id)

  if (updated.error !== null) return fail(SAVE_FAILED)

  // See the note at the top: a partial unique index is not a conflict target,
  // so the existing primary goal is found and edited rather than upserted.
  const existing = await supabase
    .from('goals')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('is_primary', true)
    .maybeSingle()

  if (existing.error !== null) return fail(SAVE_FAILED)

  const written =
    existing.data === null
      ? await supabase.from('goals').insert({
          workspace_id: workspace.id,
          goal_type: goalType,
          outcome_text: outcomeText,
          is_primary: true,
        })
      : await supabase
          .from('goals')
          .update({ goal_type: goalType, outcome_text: outcomeText })
          .eq('id', existing.data.id)

  if (written.error !== null) return fail(SAVE_FAILED)

  redirect(STUDIO_HOME)
}

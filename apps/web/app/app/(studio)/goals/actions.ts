'use server'

/**
 * Proposing a new target on a key result — B2's one write on this screen.
 *
 * ============================================================================
 * No workspace id, and no ownership check here
 * ============================================================================
 *
 * The update names a `key_results.id` and nothing else. `key_results` reaches
 * its workspace through `objectives → goals`, and
 * `key_results_update_members` uses `can_access_objective(objective_id)` to
 * enforce it — so a tampered id belonging to somebody else's workspace matches
 * zero rows rather than being refused by code we wrote.
 *
 * That is the difference from `delete_workspace`, which re-asks the ownership
 * question itself: that one runs `security definer` with RLS off and has to.
 * This one runs as the user with RLS on, so the policy *is* the check, and
 * adding a second one here would duplicate a rule already proved in
 * `rls.db.test.ts`.
 *
 * ============================================================================
 * A target is a proposal, and the copy says so
 * ============================================================================
 *
 * 15 §1: "Targets are proposals, not promises." Saving one changes what we
 * measure against, not what we have committed to, and the confirmation says
 * that rather than "target updated" — which would read as an agreement.
 */

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { parseTargetInput } from '@/lib/workspace/goal-cascade'

import { type TargetFormState } from './target-form-state'

const SAVE_FAILED = 'We could not save that target just now. Nothing has changed.'

const NOT_FOUND =
  'We could not find that key result. Reload the page and try again — it may have moved on.'

function fail(message: string, keyResultId: string | null): TargetFormState {
  return { status: 'error', message, keyResultId }
}

export async function proposeTarget(
  _previous: TargetFormState,
  formData: FormData,
): Promise<TargetFormState> {
  const idValue = formData.get('keyResultId')
  const keyResultId = typeof idValue === 'string' ? idValue : ''

  if (keyResultId.length === 0) return fail(NOT_FOUND, null)

  const parsed = parseTargetInput(formData.get('target'))
  if (!parsed.ok) return fail(parsed.message, keyResultId)

  const supabase = await createSupabaseServerClient()

  // `select()` so the response says how many rows matched. Without it an
  // update that RLS filtered to nothing returns success, and the screen would
  // report a saved target that was never written.
  const { data, error } = await supabase
    .from('key_results')
    .update({ target: parsed.value })
    .eq('id', keyResultId)
    .select('id')

  if (error !== null) return fail(SAVE_FAILED, keyResultId)
  if ((data?.length ?? 0) === 0) return fail(NOT_FOUND, keyResultId)

  // The screen is a server component, so the new figure only appears if the
  // route is re-rendered. Both places that show the cascade are revalidated,
  // because they share `GoalsBoard` and must not disagree.
  revalidatePath('/app/goals')
  revalidatePath('/app/results')

  return {
    status: 'saved',
    message: 'Saved. This is the target we measure against — still a proposal, not a promise.',
    keyResultId,
  }
}

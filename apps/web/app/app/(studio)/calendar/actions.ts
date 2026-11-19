'use server'

/**
 * Moving a post to another slot — B2.2's one write (D100).
 *
 * ============================================================================
 * Two columns, and the database is what limits it to two
 * ============================================================================
 *
 * `authenticated` holds `update (scheduled_date, scheduled_time24)` on
 * `scheduled_posts` and nothing else (D95): the table-level grant was revoked,
 * so a member can move a post and cannot retitle it, change its platform or
 * mark it published. This update names those two columns because they are the
 * only two it *could* name — the restriction is not this file being careful,
 * and `rls.db.test.ts` proves it by trying the others.
 *
 * ============================================================================
 * It does not write the audit, and must not
 * ============================================================================
 *
 * `record_post_move()` fires on update and writes `post_moves` when the date or
 * the time actually changed (D95). An insert here as well would double every
 * entry; an insert here *instead* would be a write the application could
 * forget. The trigger is the guarantee, so this action's job ends at the
 * update.
 *
 * ============================================================================
 * `select()` is load-bearing, exactly as it is on the Goals screen
 * ============================================================================
 *
 * RLS filters an update on somebody else's post to zero rows and PostgREST
 * answers success. Without `.select()` there is nothing to count, and the
 * screen would report a move that never happened — B2.1's third inherited rule,
 * and the bug class D96 found ten more of.
 */

import { revalidatePath } from 'next/cache'

import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { parseSlot } from '@/lib/workspace/week-schedule'

const MOVE_FAILED = 'We could not move that post just now. It is still where it was.'

const NOT_FOUND =
  'We could not find that post. Reload the page — it may have moved on, or been published.'

export type MovePostResult =
  | { readonly status: 'moved'; readonly date: string; readonly time24: string }
  | { readonly status: 'error'; readonly message: string }

export async function movePostToSlot(
  postId: unknown,
  date: unknown,
  time24: unknown,
): Promise<MovePostResult> {
  if (typeof postId !== 'string' || postId.length === 0) {
    return { status: 'error', message: NOT_FOUND }
  }

  const slot = parseSlot(date, time24)
  if (!slot.ok) return { status: 'error', message: slot.message }

  const supabase = await createSupabaseServerClient()

  // No workspace id. `scheduled_posts_update_members` reaches the workspace
  // through the row itself, so a tampered id belonging to somebody else's
  // calendar matches zero rows rather than being refused by code we wrote.
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update({ scheduled_date: slot.value.date, scheduled_time24: slot.value.time24 })
    .eq('id', postId)
    .select('id, scheduled_date, scheduled_time24')

  if (error !== null) return { status: 'error', message: MOVE_FAILED }
  if ((data?.length ?? 0) === 0) return { status: 'error', message: NOT_FOUND }

  // The calendar is a server component, so the moved chip only survives a
  // reload if the route is re-rendered.
  revalidatePath('/app/calendar')

  return { status: 'moved', date: slot.value.date, time24: slot.value.time24 }
}

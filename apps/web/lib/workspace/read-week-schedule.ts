/**
 * The calendar's read — as the signed-in user, so RLS decides the rows.
 *
 * The thin half of a pair. `week-schedule.ts` makes every decision and is
 * tested without a network; this fetches, and the only judgement in it is which
 * week to ask for. The same split `read-goal-cascade.ts` has from
 * `goal-cascade.ts`.
 *
 * ============================================================================
 * No workspace id is passed, and that is the point
 * ============================================================================
 *
 * `scheduled_posts_select_members` scopes the select to workspaces the caller
 * belongs to, so there is no id to get wrong and none to forge. The date range
 * is the only filter, and it is a window rather than a permission.
 *
 * ============================================================================
 * Which week, and what happens when the zone is unknown
 * ============================================================================
 *
 * The week is the one *today* falls in, where today is resolved in the
 * workspace's own zone (D97). A client in Auckland on Monday morning is eleven
 * hours into a week the server still calls last week, and a UTC answer would
 * show them the wrong one.
 *
 * With no zone captured this falls back to the server's UTC date **for the
 * window only**, and leaves `today` null so that no column is highlighted. That
 * is a deliberately smaller claim than D97's "never assume UTC": a week
 * boundary a few hours out is visible and self-correcting, while a highlighted
 * "today" on the wrong day is a statement made without evidence.
 */

import type { ScheduledPost, WeekSchedule } from '@mirrorline/mock'

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { localDateIn } from './timezone'
import {
  buildWeekSchedule,
  weekEndFor,
  weekPostsFrom,
  weekStartFor,
  type ScheduledPostRow,
} from './week-schedule'

/** Exactly the columns the grid draws. `created_at` is not one of them. */
const POST_COLUMNS =
  'id, cut_id, platform, title, status, scheduled_date, scheduled_time24, has_ai_scenes'

export interface WeekScheduleRead {
  readonly schedule: WeekSchedule
  /** The same posts, flat — what the counters and the panel index by. */
  readonly posts: readonly ScheduledPost[]
  /** The workspace's zone, or null when onboarding never captured one. */
  readonly timeZone: string | null
}

export async function readWeekSchedule(now: Date = new Date()): Promise<WeekScheduleRead> {
  const supabase = await createSupabaseServerClient()

  // Oldest first, matching `ensure_workspace_for_current_user` and
  // `getOwnedWorkspace`. Two places answering "which workspace" differently is
  // how somebody ends up editing one and looking at another.
  const workspaceResult = await supabase
    .from('workspaces')
    .select('id, timezone')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  const timeZone =
    typeof workspaceResult.data?.timezone === 'string' ? workspaceResult.data.timezone : null

  const today = timeZone === null ? null : localDateIn(timeZone, now)
  const startDate = weekStartFor(today ?? now.toISOString().slice(0, 10))
  const endDate = weekEndFor(startDate)

  const postResult = await supabase
    .from('scheduled_posts')
    .select(POST_COLUMNS)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)

  // An error is an empty week rather than a throw: the calendar's job is to
  // render what it can see, and no rows draws the seven day columns with no
  // chips in them — which is also what a brand-new workspace looks like.
  const rows = (postResult.data ?? []) as ScheduledPostRow[]

  const schedule = buildWeekSchedule(rows, { startDate, today })

  return { schedule, posts: weekPostsFrom(schedule), timeZone }
}

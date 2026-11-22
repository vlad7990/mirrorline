/**
 * The Ledger's and the alerts' reads — as the signed-in user, so RLS decides
 * the rows (B2.4).
 *
 * ============================================================================
 * No workspace id, on purpose
 * ============================================================================
 *
 * `ledger_weekly_select_members` and `alerts_select_members` scope the rows to
 * workspaces the caller belongs to, so there is no id to pass and nothing to
 * get wrong. The same shape as `readSocialAccountRows`, `readGoalCascade` and
 * `readWeekSchedule`, for the same reason: an id in the query would be a
 * second place the answer could come from.
 *
 * ============================================================================
 * Null is "could not read", empty is "nothing happened yet"
 * ============================================================================
 *
 * They render differently and the difference matters here more than most. An
 * error returning `[]` would claim we read the ledger and found no weeks —
 * which on this screen reads as *"you published nothing"*, a statement about
 * the client's account rather than about our request. Null lets the screen say
 * it could not read.
 *
 * Neither falls back to `SAMPLE_LEDGER` or `RAISED_ALERTS`. Both components
 * still default to those for the marketing surfaces, so the studio pages have
 * to pass a value explicitly — the D110 trap, one screen along.
 */

import { type LedgerWeek } from '@/components/kpi/sample-dashboard'
import { type KpiAlert } from '@/lib/studio/insights'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { type AlertRow, type LedgerWeeklyRow, toKpiAlerts, toLedgerWeeks } from './results-rows'

/**
 * How many weeks the Ledger shows.
 *
 * Bounded in the query rather than in the component: an account running a year
 * has fifty-two rows and the table shows a handful, so an unbounded select
 * would grow for ever to render the same screen.
 */
const LEDGER_WEEKS = 12

export async function readLedgerWeeks(): Promise<readonly LedgerWeek[] | null> {
  const supabase = await createSupabaseServerClient()

  const result = await supabase
    .from('ledger_weekly')
    .select('week, posts, views, sends, saves, follows, leads, bookings, sales_usd')
    // Newest first out of the database so `limit` keeps the *recent* weeks,
    // then reversed below for a table that reads oldest to newest. Ordered in
    // SQL rather than in the mapper, so two loads cannot disagree.
    .order('week', { ascending: false })
    .limit(LEDGER_WEEKS)

  if (result.error !== null) return null

  const rows = (result.data ?? []) as LedgerWeeklyRow[]

  return toLedgerWeeks([...rows].reverse())
}

/**
 * The alerts worth showing: open ones, newest first.
 *
 * **`acknowledged` and `resolved` are filtered in the query.** Acknowledging
 * one is the single write a member has on this table
 * (`alerts_update_members`), and it would mean nothing if the bar came back on
 * the next load.
 *
 * `isAlertWorthRaising` still applies downstream: the two-week rule is the
 * app's, and `alerts_timing_matches_kind` is the database's half of the same
 * rule. Neither is trusted to be the only one.
 */
export async function readRaisedAlerts(): Promise<readonly KpiAlert[] | null> {
  const supabase = await createSupabaseServerClient()

  const result = await supabase
    .from('alerts')
    .select('id, kpi_key, status, message, kind, weeks_off_track, broken_since')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (result.error !== null) return null

  return toKpiAlerts((result.data ?? []) as AlertRow[])
}

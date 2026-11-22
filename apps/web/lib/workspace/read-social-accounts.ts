/**
 * The Accounts screen's read — as the signed-in user, so RLS decides the rows.
 *
 * ============================================================================
 * No workspace id, on purpose
 * ============================================================================
 *
 * `social_accounts_select_members` scopes the rows to workspaces the caller
 * belongs to, so there is no id to pass and nothing to get wrong. The same
 * shape as `readGoalCascade` and `readWeekSchedule`, for the same reason: an id
 * in the query would be a second place the answer could come from.
 *
 * ============================================================================
 * Null is "could not read", empty is "nothing connected"
 * ============================================================================
 *
 * They render differently and the difference matters. An error returning `[]`
 * would claim we read the accounts and found none; returning null lets the
 * screen say it could not read them. Neither falls back to the sample
 * accounts, which beside a real client's workspace would read as theirs.
 *
 * `metric_snapshots` is not read here at all. Nothing measures until B6's
 * ingestion, so every KPI on these cards is `unmeasured` and the absence is
 * rendered rather than filled (`social-accounts.ts`).
 */

import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { type AccountMetrics } from '@/lib/studio/accounts'

import { type SocialAccountRow, toAccountMetrics } from './social-accounts'

/**
 * The rows themselves, for callers that shape them differently.
 *
 * Settings merges them with the supported-platform list
 * (`toSettingsAccounts`), so there is somewhere to connect from; Accounts turns
 * them into KPI cards. One query, two shapes, and neither screen passes a
 * workspace id.
 */
export async function readSocialAccountRows(): Promise<readonly SocialAccountRow[] | null> {
  const supabase = await createSupabaseServerClient()

  // Ordered in the database rather than in the mapper, so two loads of a screen
  // cannot disagree about the order of the rows.
  const result = await supabase
    .from('social_accounts')
    .select('id, platform, handle, status, note, connected_on')
    .order('platform')

  if (result.error !== null) return null

  return (result.data ?? []) as SocialAccountRow[]
}

export async function readSocialAccounts(): Promise<readonly AccountMetrics[] | null> {
  const rows = await readSocialAccountRows()

  return rows === null ? null : toAccountMetrics(rows)
}

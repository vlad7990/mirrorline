/**
 * This report's judged drafts — read as the signed-in user, so RLS scopes them
 * (V3, D129).
 *
 * The same three-state shape as `read-scan-job.ts` and `read-niche-report.ts`,
 * and the third state earns its keep here too:
 *
 * - **`null` is "could not read".** The screen says so about *our* request.
 * - **`[]` is "this report produced no drafts".** A report from before D129, or
 *   one whose script agent was refused by the spend cap.
 * - **Rows are rows.**
 *
 * Collapsing the first two would be the bad bug available here, and it is a
 * compliance one rather than a cosmetic one: a failed read rendering as "no
 * drafts" hides a *blocked* draft, and `04 §4` is explicit that a gate whose
 * failures are invisible is indistinguishable from a gate that never fires.
 *
 * **No workspace id parameter.** `drafts_select_members` reaches the workspace
 * through the row, so there is nothing to pass and nothing to get wrong — the
 * reasoning `read-scan-job.ts` gives.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { parseDraft, type DraftSummary } from './types'

const DRAFT_COLUMNS = 'id, kind, title, status, originality, attempts, approved_at'

export async function readReportDrafts(reportId: string): Promise<readonly DraftSummary[] | null> {
  if (reportId === '') return []

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('drafts')
    .select(DRAFT_COLUMNS)
    .eq('report_id', reportId)
    // Oldest first, so the order matches the order the ideas were written in
    // and the screen does not reshuffle them between visits.
    .order('created_at', { ascending: true })

  if (error) return null

  return (data ?? [])
    .map((row) => parseDraft(row))
    .filter((draft): draft is DraftSummary => draft !== null)
}

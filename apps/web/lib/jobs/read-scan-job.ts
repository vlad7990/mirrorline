/**
 * Is a scan running? — read as the signed-in user, so RLS decides (D119).
 *
 * The same three-state shape as `read-niche-report.ts` and `read-results.ts`,
 * and here the third state earns its keep more than anywhere else on the
 * screen:
 *
 * - **`null` is "could not read".** The screen says so about *our request*.
 * - **`{ job: null }` is "nothing has been queued".** The form is idle.
 * - **A job is a job.** `isJobPending` decides whether that reads as
 *   "Scanning…" or as a finished attempt.
 *
 * Collapsing the first two would be the worst bug available here: a failed read
 * rendering as "no scan running" re-enables the button, the client presses it,
 * and now there are two scans and two bills for one report. The expensive
 * direction of this ambiguity is the one a careless `?? null` picks.
 *
 * **No workspace id parameter.** `jobs_select_members` scopes the rows, so
 * there is nothing to pass and nothing to get wrong — the same reasoning
 * `read-niche-report.ts` gives.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { parseJobOutcome, type JobKind, type JobSummary } from './types'

const JOB_COLUMNS = 'id, kind, status, created_at, error, attempts, max_attempts, result'

/** `{ job: null }` is an idle workspace; the outer `null` is our failure. */
export interface ScanJobRead {
  readonly job: JobSummary | null
}

/**
 * Columns come back as `unknown`; every field is checked, never cast into
 * place. A row that does not parse is treated as no row rather than as a
 * half-built object — the same rule `read-niche-report.ts` applies to its
 * findings columns.
 */
function toSummary(row: Record<string, unknown>): JobSummary | null {
  const { id, kind, status, created_at: createdAt, attempts, max_attempts: maxAttempts } = row

  if (typeof id !== 'string') return null
  if (typeof kind !== 'string' || typeof status !== 'string') return null
  if (typeof attempts !== 'number' || typeof maxAttempts !== 'number') return null

  return {
    id,
    kind: kind as JobKind,
    status: status as JobSummary['status'],
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    outcome: parseJobOutcome(row.result),
    error: typeof row.error === 'string' ? row.error : null,
    attempts,
    maxAttempts,
  }
}

/**
 * The newest Niche Scan job for the workspace this user belongs to.
 *
 * Newest only, because that is the one the screen is about. The history stays
 * in the table for whoever is debugging; a list would invite this screen to
 * start summarising runs, which is the Agents screen's job and not this one's.
 */
export async function readLatestScanJob(): Promise<ScanJobRead | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .eq('kind', 'niche-scan' satisfies JobKind)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return null

  const job = (data ?? [])
    .map((row) => toSummary(row as Record<string, unknown>))
    .find((parsed): parsed is JobSummary => parsed !== null)

  return { job: job ?? null }
}

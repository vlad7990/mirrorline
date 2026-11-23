/**
 * Putting work on the queue (D119).
 *
 * ============================================================================
 * The service role, for the same reason the agents use it
 * ============================================================================
 *
 * `jobs` revokes insert from `authenticated`, so this needs the service-role
 * client — and the reason that revoke exists is sharper than for the other
 * tables: **a job is a unit of spend.** A row a browser could write is a bill a
 * browser could type, and `max_attempts` multiplies it. So the insert happens
 * here, behind `server-only`, against a workspace id the action took from
 * `getOwnedWorkspace()` rather than from a form.
 *
 * ============================================================================
 * One pending scan per workspace, checked here *and* in the index
 * ============================================================================
 *
 * A double-pressed button must not buy two scans. Each one is a Sonnet call
 * with ~28 web searches, so the second is real money for a report nobody asked
 * for twice.
 *
 * This read-then-insert closes the ordinary case and gives the screen a
 * sentence to show ("a scan is already running"). It cannot close the
 * simultaneous case — two requests can both read "nothing pending" before
 * either inserts — so `20261123021000_jobs_one_pending.sql` puts a unique
 * partial index behind it, and the loser of that race is caught below and
 * reported as the same ordinary outcome rather than as an error. The check is
 * the message; the index is the guarantee.
 */

import 'server-only'

import { createAgentServiceClient } from '../agents/service-client'
import { isJobPending, type JobKind, type JobSummary } from './types'

/**
 * Postgres' unique-violation code. Named rather than inlined because `23505`
 * at a call site reads as a magic number, and the whole point of catching it
 * is that this particular failure is **not** one.
 */
const UNIQUE_VIOLATION = '23505'

/** One sentence for every way the insert can go wrong, because the client can do one thing about it. */
const COULD_NOT_START = 'We could not start the scan just now. Try again shortly.'

export type EnqueueOutcome =
  | { readonly status: 'queued'; readonly jobId: string }
  /** Already working on one. An ordinary answer, not an error. */
  | { readonly status: 'already-pending'; readonly jobId: string | null }
  | { readonly status: 'failed'; readonly message: string }

export interface EnqueueRequest {
  readonly workspaceId: string
  readonly kind: JobKind
  readonly payload?: Readonly<Record<string, unknown>>
}

/** The columns `isJobPending` needs, named once so the select and the parse agree. */
const PENDING_COLUMNS = 'id, kind, status, created_at, error, attempts, max_attempts'

function toSummary(row: Record<string, unknown>): JobSummary | null {
  const { id, kind, status, created_at: createdAt } = row
  if (typeof id !== 'string' || typeof kind !== 'string' || typeof status !== 'string') return null

  return {
    id,
    kind: kind as JobKind,
    status: status as JobSummary['status'],
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    // Not read here. This function only asks "is one already pending", which
    // `isJobPending` answers from status and attempts; the outcome of a
    // *finished* job is the screen's business, and `read-scan-job.ts` parses it.
    outcome: null,
    error: typeof row.error === 'string' ? row.error : null,
    attempts: typeof row.attempts === 'number' ? row.attempts : 0,
    maxAttempts: typeof row.max_attempts === 'number' ? row.max_attempts : 0,
  }
}

/**
 * Write a job and return at once.
 *
 * **Fails closed, like the spend cap does.** A read that errors returns
 * `failed` rather than falling through to the insert: "I could not tell whether
 * a scan is already running" is not a reason to start a second one, and
 * guessing "nothing pending" turns one database hiccup into a double bill —
 * the same trade `lib/agents/ledger.ts` made for the same reason.
 */
export async function enqueueJob(request: EnqueueRequest): Promise<EnqueueOutcome> {
  const supabase = createAgentServiceClient()

  const existing = await supabase
    .from('jobs')
    .select(PENDING_COLUMNS)
    .eq('workspace_id', request.workspaceId)
    .eq('kind', request.kind)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existing.error) {
    return { status: 'failed', message: COULD_NOT_START }
  }

  const latest = (existing.data ?? [])
    .map((row) => toSummary(row as Record<string, unknown>))
    .find((job): job is JobSummary => job !== null)

  // `failed` is terminal (see `isJobPending`), so a client who can see the
  // error may press the button again and get a new job. Only `queued` and
  // `running` block a second one.
  if (latest && isJobPending(latest)) {
    return { status: 'already-pending', jobId: latest.id }
  }

  const inserted = await supabase
    .from('jobs')
    .insert({
      workspace_id: request.workspaceId,
      kind: request.kind,
      payload: request.payload ?? {},
    })
    .select('id')
    .single()

  if (inserted.error) {
    // The index caught a simultaneous second press. The honest answer is the
    // one the first press is already getting, not an error for a race the
    // client cannot see and did not cause.
    if (inserted.error.code === UNIQUE_VIOLATION) {
      return { status: 'already-pending', jobId: null }
    }

    return { status: 'failed', message: COULD_NOT_START }
  }

  const id = (inserted.data as { id?: unknown } | null)?.id
  if (typeof id !== 'string') {
    return { status: 'failed', message: COULD_NOT_START }
  }

  return { status: 'queued', jobId: id }
}

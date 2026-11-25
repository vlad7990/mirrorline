/**
 * The job queue's shapes, in a module either side may import.
 *
 * **No `server-only` here, and that is the point.** `ScanProgress` is a
 * `'use client'` component and needs `JobStatus` to decide what to render, so
 * this file holds the types and the one number the copy quotes. Everything
 * that touches the service-role key lives in `enqueue.ts` next door, which
 * does import `server-only`.
 *
 * Same split, same reason, as `trends/scan-form-state.ts`: a type is erased at
 * compile time and crosses the boundary freely; a value that reads an
 * environment variable does not.
 */

/**
 * The kinds the queue knows, matching the check constraint in
 * `20261123020000_jobs.sql`.
 *
 * `render-cuts` is B5 and **has no handler**. It is named here and in the
 * migration so the worker's `kind` switch is exhaustive over the real set
 * rather than over the half we have built — the compiler then names what is
 * missing instead of a job silently falling through to nothing.
 */
/**
 * How long a claimed job belongs to the worker that claimed it, in seconds.
 *
 * `claim_job`'s default, which the worker passes explicitly. It lives here
 * rather than in the worker because it is **half of a safety property**, and
 * the other half is in the agents: every budget a job spends has to add up to
 * less than this, with margin, or two workers run the same job.
 *
 * That was not hypothetical. The first production scan ran a single leg for
 * **829 seconds** — 92% of this lease — with the script agent still to come
 * after it, because nothing was enforcing a wall clock. `budget.test.ts` is
 * the assertion that keeps the sum honest, and it can only exist because this
 * number is importable from both sides.
 */
/*
 * **1200, raised from 900 (D136), because D135 changed the trade.**
 *
 * A longer lease used to be straightforwardly worse: its only cost is how long a
 * *stranded* job stays unclaimable, and the common way a job got stranded was a
 * redeploy killing a worker mid-scan — which is what happened at 21:53 and left
 * a client watching a spinner until 22:07. The worker now releases the lease on
 * `SIGTERM`, so that cause is gone and the remaining ones are a crashed
 * container and a hung request.
 *
 * What it buys: the research leg gets back the six minutes Vlad specified, after
 * six measured runs in which the 270-second slice was itself a failure mode. The
 * margin went **up** — 630 seconds spent of 1200 rather than 540 of 900, 47%
 * unspent against the third `budget.test.ts` demands.
 */
export const JOB_LEASE_SECONDS = 1200

export type JobKind = 'niche-scan' | 'render-cuts'

/**
 * `queued` is waiting, `running` is claimed, and both read as "Scanning…" to
 * the client — the distinction is the worker's, not theirs. `failed` is only
 * terminal once the attempts are spent; a job that failed with a retry left
 * goes back to being claimable, which is why the UI must not treat one failed
 * attempt as the end.
 */
export type JobStatus = 'queued' | 'running' | 'complete' | 'failed'

/**
 * What a finished job actually decided, which is **not** the same question as
 * whether it finished.
 *
 * The spend cap is the reason this exists. `runNicheScan` refuses before
 * calling when the month's spend would be crossed, and `18 §6` is explicit
 * that the cap exists to be *seen* working — "a scan the cap refused is not an
 * error, and rendering it as one would teach the reader to distrust a control
 * that is working exactly as asked".
 *
 * A refusal is therefore a **completed** job: nothing is broken, nothing should
 * be retried, and the client is owed an explanation rather than an apology.
 * Folding it into `failed` would both retry it three times — the cap's answer
 * will not change — and paint a working ceiling red.
 *
 * It lives in `jobs.result` rather than in a fourth `status` value, because
 * `result` is the column the migration created for "what the job produced" and
 * a status is for how it ended. `read-scan-job.ts` lifts it out so no caller
 * has to remember the jsonb shape.
 */
export type JobOutcome = 'complete' | 'refused' | 'interrupted'

/**
 * Lift the outcome out of `jobs.result`, which is jsonb and therefore anything
 * at all.
 *
 * **Unknown values become null rather than passing through.** A typo'd or
 * future outcome reaching the screen as a third state would render as neither
 * the report nor the cap's sentence — a blank where an explanation belongs.
 * Null means "it did not say", which every caller already handles.
 *
 * Lives with the types rather than in the reader so that the worker, the
 * reader and the tests all agree on one definition of the shape.
 */
export function parseJobOutcome(result: unknown): JobOutcome | null {
  if (typeof result !== 'object' || result === null) return null

  const outcome = (result as { outcome?: unknown }).outcome
  return outcome === 'complete' || outcome === 'refused' || outcome === 'interrupted'
    ? outcome
    : null
}

/**
 * Was this job put back in the queue by a worker being replaced? (D135)
 *
 * **`interrupted` sits on a `queued` job**, which is the only combination that
 * means it: the worker released the lease on `SIGTERM` rather than leaving the
 * job to time out. A merge to `main` at 21:53 killed an in-flight scan and the
 * client watched a spinner until 22:07 — fourteen minutes of a 900-second lease
 * expiring, with nothing on the screen to say why.
 *
 * It is deliberately **not** a `JobStatus`. The job really is queued: the next
 * worker will claim it exactly as it claims anything else, and the status column
 * is for how a job ended rather than for why it restarted. The marker clears
 * itself the moment `claim_job` sets the status to `running`.
 */
export function isRestarting(job: JobSummary): boolean {
  return job.status === 'queued' && job.outcome === 'interrupted'
}

/** The columns the studio reads. Not the whole row — the rest is the worker's. */
export interface JobSummary {
  readonly id: string
  readonly kind: JobKind
  readonly status: JobStatus
  /** ISO-8601, UTC, as `timestamptz` comes back over REST. */
  readonly createdAt: string
  /**
   * Null until the job ends, and null on a job that ended badly. Only a
   * `complete` job has decided anything.
   */
  readonly outcome: JobOutcome | null
  /**
   * The sentence to show. The cap's reason when `outcome` is `refused`, and
   * why it broke when `status` is `failed`. Never a stack trace and never a
   * prompt — the same rule `niche_reports.error` carries.
   */
  readonly error: string | null
  /** How many times it has been claimed; `maxAttempts` bounds it. */
  readonly attempts: number
  readonly maxAttempts: number
}

/**
 * What the client is told to expect, and it is a measurement rather than a
 * hope: the first two live scans took six minutes and four (D118).
 *
 * Quoted as "usually ~5 min" rather than a countdown. A progress bar would be
 * a fiction — one model call has no intermediate state to report from — and a
 * spinner with no number starts reading as a hang at about twenty seconds.
 * "Usually" is doing real work in that sentence: it is the word that makes a
 * seven-minute scan a slow one rather than a broken one.
 */
export const SCAN_ETA_MINUTES = 5

/**
 * Whether this job is still going to produce something.
 *
 * ============================================================================
 * `failed` is terminal, and `attempts` is not a retry policy
 * ============================================================================
 *
 * The obvious-looking version of this function also returns true for a
 * `failed` job with attempts left, on the theory that it will be retried.
 * **It will not**, and writing it that way would leave a client watching
 * "Scanning…" forever for a job nothing is going to pick up.
 *
 * The worker marks a failure `failed` and stops. There is no automatic requeue
 * — designing a retry policy means deciding what is worth retrying (a dropped
 * connection) and what must never be (a rate limit, hammered immediately; a
 * refusal, whose answer will not change), and that is a decision with a bill
 * attached that has not been made yet. The client presses the button again,
 * which is an honest retry made by someone who can see the error.
 *
 * `attempts` and `max_attempts` exist for the one retry that *is* automatic:
 * **crash recovery**. A worker that dies mid-scan leaves the row `running`
 * with a lease that expires, and `claim_job` reclaims it. `max_attempts` is
 * what stops a job that reliably kills its worker from being reclaimed
 * forever. That is a bound on a loop, not a promise to the client.
 */
export function isJobPending(job: JobSummary): boolean {
  return job.status === 'queued' || job.status === 'running'
}

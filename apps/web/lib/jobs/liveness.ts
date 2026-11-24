/**
 * Is the worker alive? — the judgement, in one place both sides import (D128).
 *
 * ============================================================================
 * The hole this closes, in D125's own words
 * ============================================================================
 *
 * "A worker that fails to boot is **silent**. A broken site is visible in
 * seconds; a worker that crash-loops looks exactly like a quiet afternoon with
 * no scans queued. This is the first thing I would want an alert on, and there
 * is no alert."
 *
 * The queue cannot answer the question on its own. An empty `jobs` table is
 * what a healthy Saturday looks like *and* what a dead worker looks like, and
 * the only thing that tells them apart is the worker saying so. So it says so:
 * a row in `worker_heartbeats`, rewritten on a timer, and this module turns
 * that row into a verdict.
 *
 * ============================================================================
 * Why the verdict lives in `apps/web/lib/jobs` and not in the worker
 * ============================================================================
 *
 * The same reason `JOB_LEASE_SECONDS` does: it is **half of a property whose
 * other half is elsewhere**. The worker decides how often to beat; the reader
 * decides how long a gap is too long. Those two numbers are only correct
 * relative to each other, and a staleness threshold shorter than the beat
 * interval is a monitor that reports an outage every interval.
 *
 * Keeping them in one importable module means `liveness.test.ts` can assert
 * the inequality, and means the worker and the health route cannot disagree
 * about what "stalled" means.
 *
 * No `server-only` here, deliberately — the worker imports this file, and the
 * worker is not Next.
 */

import { JOB_LEASE_SECONDS, type JobKind } from './types'

/**
 * How long to wait when there was nothing to claim.
 *
 * Five seconds. A scan is started by a human pressing a button and then
 * waiting about five minutes, so polling faster buys nothing a client could
 * perceive, and polling slower adds latency to the only moment anybody is
 * watching.
 */
export const WORKER_IDLE_POLL_MS = 5_000

/**
 * How long to wait after the claim itself failed, so a broken loop does not
 * spin. Thirty seconds: a tight loop against an unreachable database is how
 * one outage becomes a rate limit.
 */
export const WORKER_ERROR_BACKOFF_MS = 30_000

/**
 * How often the worker rewrites its heartbeat row.
 *
 * **On a timer, not in the loop**, and that distinction is the whole design. A
 * heartbeat written between jobs goes quiet for the six minutes a scan takes,
 * which would make every healthy scan indistinguishable from a dead worker —
 * the exact confusion this module exists to end. A timer keeps beating *during*
 * the job, because the scan spends those minutes awaiting network I/O and the
 * event loop is free.
 *
 * Fifteen seconds is one upsert of nine small columns four times a minute. It
 * is a rounding error against a Sonnet research run, and it is six beats inside
 * the staleness window below, so a single dropped write is not an alert.
 */
export const WORKER_HEARTBEAT_INTERVAL_MS = 15_000

/**
 * How old a heartbeat may be before the worker is presumed gone.
 *
 * Ninety seconds, and it is derived rather than chosen: it is **three
 * consecutive error backoffs**. A worker that cannot reach Supabase fails its
 * heartbeat write for the same reason it fails its claim, so this threshold is
 * the number of failed attempts we are willing to call a blip. Three is enough
 * to ride out a Supabase restart or a redeploy, and few enough that a genuinely
 * dead worker is named within two minutes.
 *
 * `liveness.test.ts` asserts it stays larger than both the beat interval and
 * the backoff, because a threshold below either is a monitor that cries wolf
 * on a working system — and a monitor nobody believes is worse than none.
 */
export const WORKER_STALE_AFTER_MS = 3 * WORKER_ERROR_BACKOFF_MS

/**
 * How many claim failures in a row mean the worker is not doing its job.
 *
 * This is the case a heartbeat alone would miss and a bad merge is most likely
 * to cause: the process is up, the beat is fresh, and **`claim_job` is
 * refusing** — a revoked grant, a renamed function, a kind the check constraint
 * does not allow. The row says "alive" and the queue never drains.
 *
 * Three, matching the staleness window, so both failures are called at the same
 * age rather than at two numbers somebody has to remember.
 */
export const WORKER_CLAIM_FAILURE_LIMIT = 3

/**
 * What the worker writes down about itself. One row, rewritten in place.
 *
 * Counts, timestamps and an identifier we chose. **No job id, no workspace id,
 * no error text** — `/api/health/worker` serves this, and
 * `api/health/supabase/route.ts` already set the rule for a health surface:
 * "the response carries variable names, status codes and row counts". A
 * Supabase error message in a column a health endpoint prints is a leak with a
 * long half-life.
 */
export interface WorkerPulse {
  /** Which worker. The Railway service name by default — see `heartbeat.ts`. */
  readonly id: string
  /** The kinds it claims, so a worker that claims nothing is visible as such. */
  readonly kinds: readonly JobKind[]
  /** ISO-8601. When this process started; a moving value means it is restarting. */
  readonly bootedAt: string
  /** ISO-8601. The last beat. */
  readonly lastSeenAt: string
  /** The kind in hand, or null when idle. */
  readonly jobKind: JobKind | null
  /** ISO-8601. When the job in hand was claimed, or null when idle. */
  readonly jobStartedAt: string | null
  /** Jobs finished since boot, counting refusals and failures. */
  readonly jobsFinished: number
  /** Consecutive failures of the claim call. Reset by any successful claim. */
  readonly claimFailures: number
  /**
   * The commit this process is running, when the platform tells us.
   *
   * Not decoration. D125 made a merge of mine a worker deploy, and the P0
   * handoff had to say the redeploy was "due, not that it happened" because
   * nothing in this system could be asked. This column is the answer to "is
   * production running my merge".
   */
  readonly revision: string | null
}

/**
 * The six things that can be true, in the order a reader cares about them.
 *
 * `ok` is false for the first four. They are separate states rather than one
 * `unhealthy` because the fix differs every time: `absent` is a worker that
 * never booted, `stalled` is one that died or lost the database,
 * `not-claiming` is one whose grants are wrong, and `over-lease` is one that
 * has been holding a job long enough for a second worker to claim it and bill
 * the run twice.
 */
export type WorkerLivenessState =
  | 'absent'
  | 'stalled'
  | 'not-claiming'
  | 'over-lease'
  | 'working'
  | 'idle'

export interface WorkerLiveness {
  readonly ok: boolean
  readonly state: WorkerLivenessState
  /** One sentence for a human. Counts and seconds only. */
  readonly detail: string
  /** Null when there has never been a heartbeat. */
  readonly secondsSinceSeen: number | null
  /** How long the job in hand has been held, or null when idle. */
  readonly jobSeconds: number | null
}

function secondsBetween(fromIso: string, nowMs: number): number | null {
  const then = Date.parse(fromIso)
  if (Number.isNaN(then)) return null

  // Clamped at zero. Clock skew between the worker's machine and the reader's
  // would otherwise produce a negative age, and a negative age compares
  // "fresh" against every threshold here — a monitor reporting health because
  // it got confused.
  return Math.max(0, Math.round((nowMs - then) / 1000))
}

/**
 * Judge one worker's heartbeat.
 *
 * `null` means the table has no row for it, which is not the same as a stale
 * row: nothing has ever beaten, so either the worker has never run this code
 * or it cannot write at all. Both are `absent`, and both are worth an alert on
 * a deploy that was supposed to replace a working process.
 */
export function workerLiveness(pulse: WorkerPulse | null, nowMs: number): WorkerLiveness {
  if (pulse === null) {
    return {
      ok: false,
      state: 'absent',
      detail: 'No worker has written a heartbeat. Nothing is draining the queue.',
      secondsSinceSeen: null,
      jobSeconds: null,
    }
  }

  const secondsSinceSeen = secondsBetween(pulse.lastSeenAt, nowMs)
  const jobSeconds = pulse.jobStartedAt === null ? null : secondsBetween(pulse.jobStartedAt, nowMs)

  // An unparseable timestamp is treated as no heartbeat rather than as a fresh
  // one. The expensive direction of this ambiguity is "assume healthy".
  if (secondsSinceSeen === null) {
    return {
      ok: false,
      state: 'absent',
      detail: `Worker ${pulse.id} wrote a heartbeat we cannot read the time of.`,
      secondsSinceSeen: null,
      jobSeconds,
    }
  }

  // Stale first. Nothing is updating this row, so every other field in it is a
  // claim about a moment that has passed — including the job it says it holds.
  if (secondsSinceSeen * 1000 > WORKER_STALE_AFTER_MS) {
    return {
      ok: false,
      state: 'stalled',
      detail:
        `Worker ${pulse.id} last beat ${secondsSinceSeen}s ago, over the ` +
        `${WORKER_STALE_AFTER_MS / 1000}s limit. It is gone, wedged, or cannot reach the database.`,
      secondsSinceSeen,
      jobSeconds,
    }
  }

  if (pulse.claimFailures >= WORKER_CLAIM_FAILURE_LIMIT) {
    return {
      ok: false,
      state: 'not-claiming',
      detail:
        `Worker ${pulse.id} is beating but has failed to claim ` +
        `${pulse.claimFailures} times in a row. The queue is not draining.`,
      secondsSinceSeen,
      jobSeconds,
    }
  }

  // Past the lease, the job in hand is no longer this worker's: `claim_job`
  // reclaims an expired lease, so a second worker can start the same scan and
  // bill a second research run for a report already being written. That is the
  // one failure here with a price tag, so it is named rather than folded into
  // "working".
  if (jobSeconds !== null && jobSeconds > JOB_LEASE_SECONDS) {
    return {
      ok: false,
      state: 'over-lease',
      detail:
        `Worker ${pulse.id} has held a ${pulse.jobKind ?? 'job'} for ${jobSeconds}s, past the ` +
        `${JOB_LEASE_SECONDS}s lease. Another worker may now claim it and bill the run twice.`,
      secondsSinceSeen,
      jobSeconds,
    }
  }

  if (pulse.jobKind !== null) {
    return {
      ok: true,
      state: 'working',
      detail: `Worker ${pulse.id} has been running a ${pulse.jobKind} for ${jobSeconds ?? 0}s.`,
      secondsSinceSeen,
      jobSeconds,
    }
  }

  return {
    ok: true,
    state: 'idle',
    detail:
      `Worker ${pulse.id} is idle, last beat ${secondsSinceSeen}s ago, ` +
      `${pulse.jobsFinished} job(s) finished since it booted.`,
    secondsSinceSeen,
    jobSeconds: null,
  }
}

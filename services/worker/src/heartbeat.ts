/**
 * The worker's pulse: a row it rewrites on a timer, and nothing else (D128).
 *
 * ============================================================================
 * Why a timer rather than the claim loop
 * ============================================================================
 *
 * A beat written at the top of the loop goes quiet for the four to six minutes
 * a scan takes, which would make every healthy scan look exactly like a dead
 * worker — the confusion this whole mechanism exists to end. The loop is busy
 * awaiting a model stream for those minutes; the event loop is not. So the beat
 * is a `setInterval` and it keeps going *through* the job, with `job_kind` set
 * so a reader can tell working from idle.
 *
 * ============================================================================
 * The pulse is null until a write succeeds, on purpose
 * ============================================================================
 *
 * `pulse()` answers `null` until Supabase has accepted one row. That makes
 * `/healthz` 503 for a worker that booted but cannot write — which is precisely
 * what Railway's deploy-time healthcheck should refuse to promote. A process
 * that is running and cannot reach its database is not a worker; it is a queue
 * that will never drain, and D125's warning was that it looks healthy from
 * every other angle.
 *
 * ============================================================================
 * It never throws
 * ============================================================================
 *
 * A failed heartbeat must not end a job that is otherwise fine. Bookkeeping
 * failing while the work succeeds is the one case `finish()` in `index.ts`
 * already reasons about, and the answer is the same: say so once, carry on, and
 * let the staleness window do the rest. Logging every fifteen seconds would
 * bury the Railway log the failure needs to be visible in, so the message is
 * printed on the transition into failure and again on recovery.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { WORKER_HEARTBEAT_INTERVAL_MS, type WorkerPulse } from '../../../apps/web/lib/jobs/liveness'
import type { JobKind } from '../../../apps/web/lib/jobs/types'

/** The table this process owns exactly one row of. */
const TABLE = 'worker_heartbeats'

/**
 * Which worker this is.
 *
 * `WORKER_ID` wins so that a second process on the same service can be told
 * apart (one row each; see the migration). Otherwise the Railway service name,
 * which is what Vlad sees in the dashboard and therefore the name worth
 * matching. `worker` is the local fallback — a laptop run against preview
 * should be recognisable as not-production at a glance.
 */
export function workerId(env: NodeJS.ProcessEnv = process.env): string {
  const chosen = env.WORKER_ID ?? env.RAILWAY_SERVICE_NAME ?? 'worker'
  const trimmed = chosen.trim()
  return trimmed === '' ? 'worker' : trimmed
}

/**
 * The commit this process is running, short, or null when nothing says.
 *
 * Railway sets `RAILWAY_GIT_COMMIT_SHA`. This exists because the P0 handoff
 * could only record that a redeploy was "due, not that it happened" — there was
 * no way to ask the running worker which code it held.
 */
export function workerRevision(env: NodeJS.ProcessEnv = process.env): string | null {
  const sha = env.RAILWAY_GIT_COMMIT_SHA ?? env.GIT_COMMIT_SHA ?? env.SOURCE_COMMIT
  if (sha === undefined || sha.trim() === '') return null
  return sha.trim().slice(0, 12)
}

export interface Heartbeat {
  /** The pulse as last written, or null until one write has succeeded. */
  readonly pulse: () => WorkerPulse | null
  /** Start beating, and write once immediately so a deploy gate can pass fast. */
  readonly start: () => void
  /** Stop beating. The row is left behind to go stale, which is the truth. */
  readonly stop: () => void
  readonly jobStarted: (kind: JobKind) => void
  readonly jobFinished: () => void
  readonly claimSucceeded: () => void
  readonly claimFailed: () => void
}

interface PulseState {
  readonly bootedAt: string
  readonly jobKind: JobKind | null
  readonly jobStartedAt: string | null
  readonly jobsFinished: number
  readonly claimFailures: number
  /** Null until a write has been accepted — see the header. */
  readonly lastSeenAt: string | null
}

export function createHeartbeat(
  supabase: SupabaseClient,
  kinds: readonly JobKind[],
  env: NodeJS.ProcessEnv = process.env,
): Heartbeat {
  const id = workerId(env)
  const revision = workerRevision(env)

  // Replaced wholesale on every change rather than edited in place: the only
  // reader is `pulse()`, and handing it a half-updated object is the kind of
  // bug a health endpoint would report as a mystery.
  let state: PulseState = {
    bootedAt: new Date().toISOString(),
    jobKind: null,
    jobStartedAt: null,
    jobsFinished: 0,
    claimFailures: 0,
    lastSeenAt: null,
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let failing = false

  const noteFailure = (message: string): void => {
    // Once per outage, not once per beat. The second half of this rule is the
    // recovery line in `beat`: a log that only ever reports breakage leaves the
    // reader unable to tell a fixed problem from a quiet one.
    if (failing) return
    failing = true
    console.error(`[worker] heartbeat write failed: ${message}`)
  }

  const pulse = (): WorkerPulse | null => {
    if (state.lastSeenAt === null) return null

    return {
      id,
      kinds,
      bootedAt: state.bootedAt,
      lastSeenAt: state.lastSeenAt,
      jobKind: state.jobKind,
      jobStartedAt: state.jobStartedAt,
      jobsFinished: state.jobsFinished,
      claimFailures: state.claimFailures,
      revision,
    }
  }

  async function beat(): Promise<void> {
    const at = new Date().toISOString()

    const { error } = await supabase.from(TABLE).upsert(
      {
        id,
        kinds,
        booted_at: state.bootedAt,
        last_seen_at: at,
        job_kind: state.jobKind,
        job_started_at: state.jobStartedAt,
        jobs_finished: state.jobsFinished,
        claim_failures: state.claimFailures,
        revision,
      },
      { onConflict: 'id' },
    )

    if (error) {
      noteFailure(error.message)
      return
    }

    if (failing) {
      failing = false
      console.log('[worker] heartbeat write recovered')
    }

    state = { ...state, lastSeenAt: at }
  }

  /**
   * Beat now, and swallow whatever happens.
   *
   * Used on every state change so the row is accurate within milliseconds of a
   * job starting rather than within fifteen seconds. `void` rather than
   * `await`: a caller in the middle of claiming a job has better things to wait
   * for, and `beat` already handles its own failure.
   */
  const beatSoon = (): void => {
    void beat().catch((error: unknown) => {
      noteFailure(error instanceof Error ? error.message : 'unknown heartbeat failure')
    })
  }

  return {
    pulse,

    start: () => {
      if (timer !== null) return
      beatSoon()
      timer = setInterval(beatSoon, WORKER_HEARTBEAT_INTERVAL_MS)
    },

    stop: () => {
      if (timer === null) return
      clearInterval(timer)
      timer = null
    },

    jobStarted: (kind: JobKind) => {
      state = { ...state, jobKind: kind, jobStartedAt: new Date().toISOString() }
      beatSoon()
    },

    jobFinished: () => {
      state = {
        ...state,
        jobKind: null,
        jobStartedAt: null,
        jobsFinished: state.jobsFinished + 1,
      }
      beatSoon()
    },

    // Reset on any success rather than decremented: the count answers "is it
    // claiming", and a worker that managed one claim is claiming.
    claimSucceeded: () => {
      if (state.claimFailures === 0) return
      state = { ...state, claimFailures: 0 }
      beatSoon()
    },

    claimFailed: () => {
      state = { ...state, claimFailures: state.claimFailures + 1 }
      beatSoon()
    },
  }
}

/**
 * What happens to the job in hand when this container is being replaced (D135).
 *
 * ============================================================================
 * What went wrong
 * ============================================================================
 *
 * A merge to `main` restarted the worker at **21:53** and killed an in-flight
 * scan. The job stayed `running` with a lease, so nothing could claim it, and it
 * sat there until the 900-second lease expired — **claimed again at 22:07**.
 * Fourteen minutes, during which the studio said "Scanning your niche…", which
 * was the one thing that was not true.
 *
 * The old `SIGTERM` handler set `running = false`. That stops us *claiming a new
 * job* seconds before being killed, which is worth having and is not this: the
 * job already in hand was simply abandoned mid-call.
 *
 * ============================================================================
 * Vlad's either/or, and which half this is
 * ============================================================================
 *
 * > "On SIGTERM either finish the job within Railway's drain window … or release
 * > the lease so the new worker claims it immediately."
 *
 * **Both, in that order, and the order matters.** On a signal the worker gives
 * the job in hand whatever the drain window allows, minus a reserve; if it
 * finishes, it finishes normally and nothing is lost. If it does not, the lease
 * is released and the next worker claims it in seconds.
 *
 * Which half you get in practice is decided by arithmetic rather than by
 * preference. A scan is 420 seconds of model calls plus the script agent, so
 * *finishing* an average interruption needs a drain window of several minutes —
 * which would make **every** deploy that slow, including the ones that interrupt
 * nothing. Releasing takes one `UPDATE`. So the recommended window is sized for
 * a clean release, and finishing is the lucky case where the signal arrives near
 * the end.
 *
 * **`RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30`** is the value to set. A release is
 * a single statement and the heartbeat and health server close behind it; 30
 * seconds is generous for that and keeps deploys fast. Raising it to 600 would
 * buy the finish-the-scan behaviour at the price of ten-minute deploys, and that
 * trade is not worth making for a job the queue can simply re-run.
 *
 * ============================================================================
 * The honest cost, written down
 * ============================================================================
 *
 * A released scan is **re-run from the beginning**, so the research leg's spend
 * up to the signal is money we paid for nothing — and it is not in `agent_runs`,
 * because the usage is only known when the stream ends. That is a real gap and
 * it is cheaper than the alternatives: finishing would slow every deploy, and
 * leaving the lease to expire is what produced the fourteen-minute spinner. The
 * release logs the abandonment so the gap is visible rather than inferred.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * How long the drain window is assumed to be when nothing says otherwise.
 *
 * Deliberately small. Railway's default is short, and a worker that *assumed* a
 * generous window would spend it waiting and then be `SIGKILL`ed before it could
 * release anything — which is the failure this file exists to fix, reached by a
 * more complicated route.
 */
export const DEFAULT_DRAIN_SECONDS = 10

/**
 * Time held back from the window for the release itself.
 *
 * The release is one `UPDATE`, but it happens after a signal on a container that
 * is about to be killed, over a network. Five seconds is enough for a retry and
 * for the heartbeat and health server to close; without a reserve the grace
 * would consume the whole window and the `UPDATE` would race `SIGKILL`.
 */
export const RELEASE_RESERVE_MS = 5_000

/**
 * How long the job in hand may keep running after the signal.
 *
 * Zero when the window is too short to hold anything back — which is the safe
 * answer, because it means "release now" rather than "wait and hope".
 */
export function graceMs(env: Record<string, string | undefined>): number {
  const raw = env.RAILWAY_DEPLOYMENT_DRAINING_SECONDS
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10)
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DRAIN_SECONDS

  return Math.max(0, seconds * 1000 - RELEASE_RESERVE_MS)
}

/**
 * The marker a restarting job carries, in `result`.
 *
 * `interrupted` on a **queued** job is the only combination that means "a worker
 * put this back", and `parseJobOutcome` in `apps/web/lib/jobs/types.ts` is what
 * lifts it out for the screen. It is not a `JobStatus`: the job really is
 * queued, and `claim_job` clears the marker by setting the status to `running`.
 */
export const INTERRUPTED_MESSAGE =
  'The worker running this scan was replaced during a deploy. It went back in the queue.'

/**
 * Put the job back in the queue, now, rather than leaving its lease to expire.
 *
 * `attempts` is **not** decremented. `claim_job` already counted this attempt
 * and `max_attempts` is 3, so a released job has two more goes — which is the
 * right bound: a job that keeps being interrupted by deploys should eventually
 * stop rather than loop forever. Resetting the count would remove the only thing
 * standing between a bad deploy loop and an unbounded bill.
 *
 * `started_at` is cleared so the next run's duration is its own, and `error` is
 * cleared because this is not a failure — it is a restart, and leaving a
 * previous attempt's message there would render as one.
 */
export async function releaseJob(
  supabase: SupabaseClient,
  jobId: string,
): Promise<{ readonly ok: boolean; readonly message: string }> {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'queued',
      lease_until: null,
      started_at: null,
      error: null,
      result: { outcome: 'interrupted', message: INTERRUPTED_MESSAGE },
    })
    .eq('id', jobId)

  if (error) {
    // Worth saying out loud rather than swallowing: the job keeps its lease and
    // the client is back to waiting it out. That is the old behaviour, and the
    // caller's log line is the only warning that we fell back to it.
    return { ok: false, message: error.message }
  }

  return { ok: true, message: INTERRUPTED_MESSAGE }
}

/**
 * Race the job in hand against the grace period.
 *
 * Returns whether the job finished on its own. The job promise is **not**
 * cancelled when the grace runs out — nothing can cancel the SDK's stream from
 * outside, and the process is about to end anyway. What matters is that the
 * lease stops belonging to a process that is going away.
 */
export async function waitForJob(job: Promise<unknown>, grace: number): Promise<boolean> {
  if (grace <= 0) return false

  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), grace)
  })

  try {
    // `job` resolving or rejecting both count as finished: the loop's own
    // `catch` has already written a `failed` result in the rejecting case, so
    // there is no lease left to release.
    return await Promise.race([
      job.then(
        () => true,
        () => true,
      ),
      expired,
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

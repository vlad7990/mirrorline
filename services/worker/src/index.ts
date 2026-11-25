/**
 * The job worker (D119).
 *
 * Claim a job, do the minutes, write the result down, repeat.
 *
 * ============================================================================
 * Why a process we own rather than a function
 * ============================================================================
 *
 * The Niche Scan takes four to six minutes (D118) against a 300-second
 * function ceiling, so it already did not fit. **B5 settles the argument**: the
 * render pipeline is Python and ffmpeg, and a Vercel function is capped at
 * 250 MB uncompressed — the transcoding stack is larger than that before any
 * model weights. No amount of raising a timeout makes that deployable.
 *
 * So the work runs here, in a container holding Node *and* Python *and*
 * ffmpeg, and this loop is what both kinds of job arrive through.
 * `render-cuts` is in the schema and has no handler yet; when B5 lands it
 * shells out to `uv run` exactly as `services/pipeline` is driven today, and
 * nothing in this file's shape changes.
 *
 * ============================================================================
 * It imports the app's own scan, deliberately
 * ============================================================================
 *
 * `runNicheScan` is not reimplemented here. It is the same function the server
 * action used to call, with the same spend cap, the same parser and the same
 * refusal path — so there is exactly one answer to "what does a scan do" and
 * one place to change it.
 *
 * The cost is a coupling: this worker reaches into `apps/web/lib`, which is a
 * Next application, and that is why `tsconfig.json` has to alias `server-only`
 * (a bundler alias Next supplies and no other resolver can see). The tidy
 * version is a `packages/agents` that the app and the worker both depend on.
 * That refactor is worth doing and was not worth doing in this change — it
 * touches the chokepoint test, the import-graph walker and every agent module,
 * and bundling it with the queue would make both unreviewable.
 *
 * ============================================================================
 * One job at a time
 * ============================================================================
 *
 * No concurrency, on purpose. A scan is one model call with a spend cap
 * checked immediately before it, and running two at once makes the window
 * between "check the month's spend" and "spend it" twice as wide. Throughput
 * is not the problem being solved — a client runs a scan occasionally, not
 * continuously — and `claim_job`'s `skip locked` means that the day we do want
 * two workers, two workers is all it takes.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { WORKER_ERROR_BACKOFF_MS, WORKER_IDLE_POLL_MS } from '../../../apps/web/lib/jobs/liveness'
import { JOB_LEASE_SECONDS, type JobKind } from '../../../apps/web/lib/jobs/types'
import { runNicheScan } from '../../../apps/web/lib/niche-scan/scan'

import { graceMs, releaseJob, waitForJob } from './draining'

import { createHeartbeat, type Heartbeat } from './heartbeat'
import { startHealthServer } from './health-server'

/** Which kinds this worker will claim. `render-cuts` joins the list with B5. */
const CLAIMED_KINDS: readonly JobKind[] = ['niche-scan']

/**
 * Fifteen minutes, matching `claim_job`'s default.
 *
 * The failure mode of a short lease is the expensive one: a second worker
 * decides the first is dead, claims the same job, and bills a second Sonnet
 * research run for a report already being written.
 *
 * **It used to say "comfortably longer than the slowest scan observed (six
 * minutes)", and the first production scan made that false** — one leg, 829
 * seconds, 92% of this lease, with the script agent still to come. The number
 * was never the problem; the absence of anything on the other side of the
 * inequality was. It now lives in `apps/web/lib/jobs/types.ts` so that
 * `budget.test.ts` can add the agents' budgets up and assert they fit inside
 * it with margin.
 */
const LEASE_SECONDS = JOB_LEASE_SECONDS

/**
 * The two waits, and why they now live next to the staleness threshold.
 *
 * They moved to `apps/web/lib/jobs/liveness.ts` for the same reason the lease
 * moved to `types.ts`: each is half of a relationship whose other half is
 * elsewhere. A heartbeat is only "stale" relative to how often this loop beats,
 * and a backoff is only "a blip" relative to how many of them the reader will
 * forgive. `liveness.test.ts` asserts those inequalities, which it can only do
 * because the numbers are importable from both sides.
 */
interface JobRow {
  readonly id: string
  readonly kind: string
  readonly workspace_id: string
  readonly payload: Record<string, unknown> | null
}

/** What a handler decided. `refused` is the spend cap, and it is not an error. */
interface HandlerResult {
  readonly outcome: 'complete' | 'refused'
  readonly message: string
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') {
    // Loud and immediate. A worker that starts without its credentials claims
    // nothing, looks healthy, and leaves every scan sitting in `queued` while
    // the studio says "Scanning…" — a silent failure that reads as a slow one.
    throw new Error(`${name} is not set. The worker cannot claim jobs without it.`)
  }
  return value
}

function serviceClient(): SupabaseClient {
  // Both names, the same way `lib/supabase/env.ts` accepts both and for the
  // same reason: the unprefixed one is the server's, the prefixed one is what
  // the browser also needs, and a worker that only knew one would be a split
  // brain with no error message.
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url === undefined || url.trim() === '') {
    throw new Error('SUPABASE_URL is not set. The worker cannot claim jobs without it.')
  }

  return createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * The scan, run for real.
 *
 * A refusal is returned rather than thrown, because it is not a failure:
 * `18 §6` wants a working spend cap to be *visible*, and throwing would mark
 * the job `failed` and paint a ceiling doing its job red.
 */
async function runScanJob(job: JobRow): Promise<HandlerResult> {
  const niche = job.payload?.niche
  if (typeof niche !== 'string' || niche.trim() === '') {
    throw new Error('this job has no niche to research')
  }

  const outcome = await runNicheScan({ workspaceId: job.workspace_id, niche })

  if (outcome.status === 'complete') {
    return {
      outcome: 'complete',
      message: outcome.isSample ? 'Saved a sample report.' : `Scanned ${niche}.`,
    }
  }

  if (outcome.status === 'refused') {
    return { outcome: 'refused', message: outcome.message }
  }

  // `failed` is genuinely ours, so it travels as an exception and the loop
  // records it against the job.
  throw new Error(outcome.message)
}

async function handle(job: JobRow): Promise<HandlerResult> {
  switch (job.kind) {
    case 'niche-scan':
      return runScanJob(job)

    default:
      // The schema allows `render-cuts` and B5 has not been built. Refusing
      // loudly beats a silent success: a job marked complete that nothing ran
      // is a client waiting for a report nobody is writing.
      throw new Error(`no handler for job kind "${job.kind}"`)
  }
}

async function claim(supabase: SupabaseClient): Promise<JobRow | null> {
  const { data, error } = await supabase.rpc('claim_job', {
    job_kinds: CLAIMED_KINDS,
    lease_seconds: LEASE_SECONDS,
  })

  if (error) throw new Error(`could not claim a job: ${error.message}`)

  // The function returns the row, or no row when there is nothing to claim.
  const row = Array.isArray(data) ? data[0] : data
  if (row === null || row === undefined) return null

  // A `returns public.jobs` function with nothing to return still answers with
  // a row of nulls rather than no row, so the id is what distinguishes "I
  // claimed something" from "there was nothing to claim".
  const candidate = row as Partial<JobRow>
  if (typeof candidate.id !== 'string') return null

  return row as JobRow
}

async function finish(
  supabase: SupabaseClient,
  jobId: string,
  update: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ ...update, finished_at: new Date().toISOString(), lease_until: null })
    .eq('id', jobId)

  // Worth saying out loud rather than swallowing: the work is done and only
  // the bookkeeping failed, so this job's lease will expire and it will be run
  // a second time. That is a double bill, and this line is the only warning.
  if (error) {
    console.error(`[worker] could not write the result of ${jobId}: ${error.message}`)
  }
}

/**
 * The message a client will read, which is never the exception itself.
 *
 * A stack trace on the Niche Scan screen would be both useless to the reader
 * and a leak of our internals — `niche_reports.error` and `agent_runs.reason`
 * carry the same rule.
 */
function clientMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message
  return 'The scan stopped before it finished.'
}

/**
 * The job this process is in the middle of, for the signal handler (D135).
 *
 * Module scope because `SIGTERM` arrives outside the loop and has to be able to
 * find the work: the old handler could only stop us claiming a *new* job, which
 * left the one in hand holding a lease nothing could claim for fourteen minutes.
 */
const inFlight: { jobId: string | null; done: Promise<unknown> | null } = {
  jobId: null,
  done: null,
}

async function runOnce(supabase: SupabaseClient, heartbeat: Heartbeat): Promise<boolean> {
  let job: JobRow | null

  try {
    job = await claim(supabase)
  } catch (error: unknown) {
    // Counted before it is rethrown. This is the failure a heartbeat alone
    // cannot see: the process is up and beating, and `claim_job` is refusing
    // because a grant, a name or a kind changed under it. The loop's own
    // handler does the backing off; the count is what makes the queue's
    // silence legible from outside.
    heartbeat.claimFailed()
    throw error
  }

  heartbeat.claimSucceeded()
  if (job === null) return false

  console.log(`[worker] claimed ${job.kind} ${job.id}`)
  const startedAt = Date.now()
  heartbeat.jobStarted(job.kind as JobKind)

  // Held before it is awaited, so a signal arriving mid-scan can race it
  // against the drain window instead of abandoning it (D135).
  const work = handle(job)
  inFlight.jobId = job.id
  inFlight.done = work

  try {
    const result = await work
    const seconds = Math.round((Date.now() - startedAt) / 1000)

    await finish(supabase, job.id, {
      // A refusal **completed**. Nothing broke, nothing should be retried, and
      // the client is owed an explanation rather than an apology.
      status: 'complete',
      result: { outcome: result.outcome, message: result.message },
      // The sentence the screen shows for a refusal. Null on a real
      // completion, where the report itself is the result.
      error: result.outcome === 'refused' ? result.message : null,
    })

    console.log(`[worker] ${job.id} ${result.outcome} in ${seconds}s`)
  } catch (error: unknown) {
    const message = clientMessage(error)
    await finish(supabase, job.id, { status: 'failed', error: message })
    console.error(`[worker] ${job.id} failed: ${message}`)
  } finally {
    // `finally`, because a worker whose heartbeat still says "running a
    // niche-scan" after the job ended is a worker that will be reported
    // `over-lease` fifteen minutes later for a job nobody is running.
    heartbeat.jobFinished()
    inFlight.jobId = null
    inFlight.done = null
  }

  return true
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main(): Promise<void> {
  const supabase = serviceClient()
  console.log(`[worker] claiming ${CLAIMED_KINDS.join(', ')}`)

  // The pulse starts before the first claim, so that a container which boots
  // and then cannot reach Supabase is visible as such rather than as an empty
  // queue (D125, D128). The health endpoint reads the same state and is what
  // Railway's deploy-time healthcheck should point at.
  const heartbeat = createHeartbeat(supabase, CLAIMED_KINDS)
  heartbeat.start()
  const health = startHealthServer(heartbeat.pulse)

  /*
   * `SIGTERM` is how a container is asked to stop (D135).
   *
   * It used to only set `running = false`, which stops us claiming a *new* job
   * and does nothing about the one in hand. A merge to `main` at 21:53 killed an
   * in-flight scan; its lease held until 22:07 and the studio said "Scanning
   * your niche…" for all fourteen minutes.
   *
   * Now: stop claiming, give the job in hand whatever the drain window allows,
   * and if it does not finish, **release the lease** so the next worker claims
   * it in seconds. `draining.ts` carries the arithmetic and the recommended
   * `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`.
   */
  let running = true
  let stopping = false

  const stop = async (signal: string): Promise<void> => {
    // A second signal during the drain must not start a second release.
    if (stopping) return
    stopping = true
    running = false

    const jobId = inFlight.jobId
    const work = inFlight.done

    if (jobId === null || work === null) {
      console.log(`[worker] ${signal}: nothing in hand, stopping`)
      return
    }

    const grace = graceMs(process.env)
    console.log(
      `[worker] ${signal}: ${jobId} is in flight · giving it ${Math.round(grace / 1000)}s ` +
        `of the drain window, then releasing its lease`,
    )

    if (await waitForJob(work, grace)) {
      console.log(`[worker] ${signal}: ${jobId} finished inside the drain window`)
      return
    }

    const released = await releaseJob(supabase, jobId)

    if (released.ok) {
      // Loud, because the spend up to this point is real and is **not** in
      // `agent_runs`: the usage is only known when the stream ends, and this
      // stream is about to be killed with the process. See `draining.ts`.
      console.warn(
        `[worker] ${signal}: released ${jobId} back to the queue · ` +
          'its in-flight model spend is abandoned and not recorded in agent_runs',
      )
    } else {
      console.error(
        `[worker] ${signal}: could NOT release ${jobId}: ${released.message} · ` +
          'its lease will have to expire, which is the fourteen-minute wait this fixes',
      )
    }

    /*
     * Exit now, and that is not impatience.
     *
     * The abandoned `handle(job)` is still running, and if it ever reaches
     * `finish()` it would overwrite the `queued` release with `complete` or
     * `failed` — handing the client a result for a job the next worker is
     * already re-running. Leaving the process alive to be `SIGKILL`ed would be
     * a race we can simply not enter.
     */
    heartbeat.stop()
    health.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => void stop('SIGTERM'))
  process.on('SIGINT', () => void stop('SIGINT'))

  while (running) {
    try {
      const didWork = await runOnce(supabase, heartbeat)
      if (!didWork) await sleep(WORKER_IDLE_POLL_MS)
    } catch (error: unknown) {
      // The claim itself failed — the database is unreachable, or the key is
      // wrong. Back off rather than spinning: a tight loop against a broken
      // dependency is how one outage becomes a rate limit.
      console.error(`[worker] ${clientMessage(error)}`)
      await sleep(WORKER_ERROR_BACKOFF_MS)
    }
  }

  // The row is **not** deleted on the way out. A graceful stop with nothing
  // replacing this process is a queue that has stopped draining, and the honest
  // report of that is a heartbeat that goes stale — not a missing row that
  // reads as "never deployed". A redeploy overwrites it within seconds anyway.
  heartbeat.stop()
  health.close()

  console.log('[worker] stopped')
}

main().catch((error: unknown) => {
  console.error(`[worker] fatal: ${clientMessage(error)}`)
  process.exitCode = 1
})

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
import { RENDER_JOB_LEASE_SECONDS } from '../../../apps/web/lib/video/types'

import { createHeartbeat, type Heartbeat } from './heartbeat'
import { startHealthServer } from './health-server'
import { runRenderJob } from './render/handler'

/**
 * Which kinds this worker will claim, from `WORKER_KINDS`.
 *
 * ============================================================================
 * Two services, one image's worth of code (V5)
 * ============================================================================
 *
 * It used to be the literal `['niche-scan']`, with a comment saying
 * `render-cuts` would join it. It does not join it: **video runs as its own
 * Railway service**, and this is the only line that has to know.
 *
 * The reasons are in `docs/plan/V5_VIDEO_PIPELINE_PLAN.md §3.3`, and the short
 * version is that the two jobs have nothing in common except the queue. A scan
 * is one model call that idles at ~150 MB; a render is ffmpeg and a Whisper
 * model, 4 GB and two cores of it. Folding them into one process means paying
 * the video footprint around the clock for work that runs occasionally, and —
 * worse — an OOM during an encode would kill the process draining the scan
 * queue.
 *
 * Nothing else had to change for it: `claim_job(job_kinds, lease_seconds)`
 * already takes the kinds, `skip locked` already makes two workers safe, and
 * `worker_heartbeats.id` already comes from `RAILWAY_SERVICE_NAME`, so the
 * second service gets its own row by being named.
 *
 * An unknown kind in the variable is fatal rather than ignored: a service
 * started with a typo would claim nothing, look healthy, and leave every job
 * queued — the silent failure `requireEnv` exists to prevent.
 */
function claimedKinds(): readonly JobKind[] {
  const known: readonly JobKind[] = ['niche-scan', 'render-cuts']
  const raw = (process.env.WORKER_KINDS ?? 'niche-scan')
    .split(',')
    .map((kind) => kind.trim())
    .filter((kind) => kind !== '')

  const unknown = raw.filter((kind) => !(known as readonly string[]).includes(kind))
  if (unknown.length > 0) {
    throw new Error(
      `WORKER_KINDS names ${unknown.join(', ')}, which is not a job kind. Known kinds: ${known.join(', ')}.`,
    )
  }
  if (raw.length === 0) {
    throw new Error('WORKER_KINDS is empty. A worker that claims nothing is a stopped queue.')
  }

  return raw as readonly JobKind[]
}

const CLAIMED_KINDS: readonly JobKind[] = claimedKinds()

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
/**
 * …and a render needs a longer one, which is why this is now a function.
 *
 * Transcribing an hour of audio on two vCPUs is twenty minutes of honest work
 * and cannot be made to fit in fifteen. The lease is per claim, so the video
 * service passes the longer number and the scan service is untouched —
 * `apps/web/lib/video/budget.test.ts` is the arithmetic that keeps
 * `RENDER_JOB_LEASE_SECONDS` above the sum of the render job's budgets, exactly
 * as `lib/jobs/budget.test.ts` does for the scan.
 *
 * The maximum across the claimed kinds, because one claim carries one lease. A
 * worker claiming both would hold a scan for an hour, which is wasteful and
 * safe; the reverse — holding a render for fifteen minutes — is neither.
 */
function leaseFor(kinds: readonly JobKind[]): number {
  return kinds.includes('render-cuts') ? RENDER_JOB_LEASE_SECONDS : JOB_LEASE_SECONDS
}

const LEASE_SECONDS = leaseFor(CLAIMED_KINDS)

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

async function handle(supabase: SupabaseClient, job: JobRow): Promise<HandlerResult> {
  switch (job.kind) {
    case 'niche-scan':
      return runScanJob(job)

    case 'render-cuts':
      // V5. The handler needs the client because a render reads four tables and
      // writes two, where a scan reaches its own storage through `runNicheScan`.
      return runRenderJob(supabase, job)

    default:
      // Refusing loudly beats a silent success: a job marked complete that
      // nothing ran is a client waiting for a video nobody is making.
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

  try {
    const result = await handle(supabase, job)
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

  // `SIGTERM` is how a container is asked to stop. Finishing the job in hand
  // would be better still; this at least stops us claiming a new one seconds
  // before being killed and leaving it to a lease expiry.
  let running = true
  const stop = (signal: string) => {
    console.log(`[worker] ${signal}: finishing the job in hand, then stopping`)
    running = false
  }
  process.on('SIGTERM', () => stop('SIGTERM'))
  process.on('SIGINT', () => stop('SIGINT'))

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

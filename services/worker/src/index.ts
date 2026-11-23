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

import { runNicheScan } from '../../../apps/web/lib/niche-scan/scan'

/** Which kinds this worker will claim. `render-cuts` joins the list with B5. */
const CLAIMED_KINDS = ['niche-scan'] as const

/**
 * Fifteen minutes, matching `claim_job`'s default.
 *
 * Comfortably longer than the slowest scan observed (six minutes), because the
 * failure mode of a short lease is the expensive one: a second worker decides
 * the first is dead, claims the same job, and bills a second Sonnet call with
 * 28 web searches for a report already being written.
 */
const LEASE_SECONDS = 900

/** How long to wait when there was nothing to do. */
const IDLE_POLL_MS = 5_000

/** How long to wait after an unexpected error, so a broken loop does not spin. */
const ERROR_BACKOFF_MS = 30_000

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

async function runOnce(supabase: SupabaseClient): Promise<boolean> {
  const job = await claim(supabase)
  if (job === null) return false

  console.log(`[worker] claimed ${job.kind} ${job.id}`)
  const startedAt = Date.now()

  try {
    const result = await handle(job)
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
  }

  return true
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main(): Promise<void> {
  const supabase = serviceClient()
  console.log(`[worker] claiming ${CLAIMED_KINDS.join(', ')}`)

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
      const didWork = await runOnce(supabase)
      if (!didWork) await sleep(IDLE_POLL_MS)
    } catch (error: unknown) {
      // The claim itself failed — the database is unreachable, or the key is
      // wrong. Back off rather than spinning: a tight loop against a broken
      // dependency is how one outage becomes a rate limit.
      console.error(`[worker] ${clientMessage(error)}`)
      await sleep(ERROR_BACKOFF_MS)
    }
  }

  console.log('[worker] stopped')
}

main().catch((error: unknown) => {
  console.error(`[worker] fatal: ${clientMessage(error)}`)
  process.exitCode = 1
})

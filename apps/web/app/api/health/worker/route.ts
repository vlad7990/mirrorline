/**
 * `GET /api/health/worker` — is anything draining the queue? (D128)
 *
 * ============================================================================
 * Why this exists when the worker already serves `/healthz`
 * ============================================================================
 *
 * Because Railway's healthcheck is a **deploy gate, not a monitor**. Railway's
 * documentation: "Railway does not monitor the healthcheck endpoint after the
 * deployment has gone live." So `/healthz` on the container stops a broken
 * merge from replacing a working worker, and answers nothing about a worker
 * that dies on a Tuesday afternoon.
 *
 * This route is the half that keeps answering. It reads the heartbeat row from
 * the outside — from Vercel, with the service role — so it reports the worker
 * being *gone* rather than the worker's own opinion of itself. A dead process
 * cannot serve a 503.
 *
 * ============================================================================
 * It answers in production, which is why it needs a token
 * ============================================================================
 *
 * `api/health/supabase/route.ts` 404s in production, and it is right to: it
 * reports which credentials are configured, and nothing needs to ask that in
 * production. This route is the opposite — **production is the only place the
 * worker runs** (D125), so 404ing there would make it decoration.
 *
 * So it is gated on a shared secret instead, and it fails closed: in a
 * production deployment with no `WORKER_HEALTH_TOKEN` set, the route 404s and
 * says nothing at all. Outside production it answers freely, exactly as the
 * Supabase health route does, because a preview deployment has nothing worth
 * protecting and a check nobody can run during development is a check that
 * rots.
 *
 * The comparison is length-padded and constant-time. That is close to paranoia
 * for a status endpoint and it costs four lines; the alternative is a token
 * that can be guessed one character at a time by timing the 404.
 *
 * ============================================================================
 * What the body may contain
 * ============================================================================
 *
 * Our own worker names, our commit sha, counts and seconds. **No workspace id,
 * no job id, no error text** — the rule `health/supabase` wrote down ("variable
 * names, status codes and row counts") and D127 applied to rejection logging.
 * The `jobs` read takes `created_at` and nothing else for the same reason: the
 * question is "how long has something been waiting", and the answer does not
 * require knowing whose scan it is.
 */

import { timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

import {
  WORKER_STALE_AFTER_MS,
  workerLiveness,
  type WorkerLiveness,
  type WorkerPulse,
} from '@/lib/jobs/liveness'
import type { JobKind } from '@/lib/jobs/types'
import { serverSupabaseConfig } from '@/lib/supabase/env'
import { restSelect, type RestCredentials } from '@/lib/supabase/rest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEARTBEAT_COLUMNS =
  'id, kinds, booted_at, last_seen_at, job_kind, job_started_at, jobs_finished, claim_failures, revision'

/** The width both sides of the token comparison are padded to. */
const TOKEN_COMPARE_BYTES = 128

/**
 * How long a job may sit in `queued` before the queue counts as starving.
 *
 * The same window as a stale heartbeat, deliberately: both questions are "has
 * the worker stopped", and giving them two thresholds would mean two numbers to
 * remember and a window in which they disagree. A healthy worker claims within
 * its five-second idle poll, so ninety seconds is generous by a factor of
 * eighteen — which is the point. This fires on a stopped worker, not on a busy
 * one, because a worker holding a six-minute scan is *supposed* to leave the
 * next job queued.
 */
const QUEUE_WAIT_LIMIT_MS = WORKER_STALE_AFTER_MS

function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

/**
 * Constant-time comparison that does not leak the expected length.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself be an
 * oracle. Padding both sides to a fixed width removes that: the comparison is
 * always over the same number of bytes, and the length equality is checked
 * afterwards.
 */
function secretsMatch(given: string, expected: string): boolean {
  const pad = (value: string) =>
    Buffer.from(value.padEnd(TOKEN_COMPARE_BYTES, '\0').slice(0, TOKEN_COMPARE_BYTES), 'utf8')

  return timingSafeEqual(pad(given), pad(expected)) && given.length === expected.length
}

/** The token from a bearer header or `?token=`, for an uptime check's convenience. */
function presentedToken(request: NextRequest): string {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  return bearer !== '' ? bearer : (request.nextUrl.searchParams.get('token') ?? '')
}

function isAllowed(request: NextRequest): boolean {
  if (!isProductionDeployment()) return true

  const expected = process.env.WORKER_HEALTH_TOKEN ?? ''
  if (expected.trim() === '') return false

  return secretsMatch(presentedToken(request), expected)
}

function asKind(value: unknown): JobKind | null {
  return value === 'niche-scan' || value === 'render-cuts' ? value : null
}

/**
 * Columns come back as `unknown`; every field is checked rather than cast. A
 * row that does not parse is treated as no row — the rule `read-scan-job.ts`
 * applies, and here it has teeth: a half-parsed heartbeat reported as healthy
 * would be the one failure this route exists to prevent.
 */
function toPulse(row: Record<string, unknown>): WorkerPulse | null {
  const { id, booted_at: bootedAt, last_seen_at: lastSeenAt } = row

  if (typeof id !== 'string' || typeof bootedAt !== 'string' || typeof lastSeenAt !== 'string') {
    return null
  }

  const kinds = Array.isArray(row.kinds)
    ? row.kinds.map(asKind).filter((kind): kind is JobKind => kind !== null)
    : []

  return {
    id,
    kinds,
    bootedAt,
    lastSeenAt,
    jobKind: asKind(row.job_kind),
    jobStartedAt: typeof row.job_started_at === 'string' ? row.job_started_at : null,
    jobsFinished: typeof row.jobs_finished === 'number' ? row.jobs_finished : 0,
    claimFailures: typeof row.claim_failures === 'number' ? row.claim_failures : 0,
    revision: typeof row.revision === 'string' ? row.revision : null,
  }
}

interface QueueState {
  readonly queued: number
  readonly oldestQueuedSeconds: number | null
  readonly starving: boolean
}

async function readQueue(credentials: RestCredentials, nowMs: number): Promise<QueueState | null> {
  // Oldest first, one row: the only thing asked of this table is "how long has
  // the front of the queue been waiting". The total is not the question — one
  // job waiting ten minutes is the outage; forty waiting four seconds is a
  // Monday morning.
  const response = await restSelect<Record<string, unknown>>(
    credentials,
    'jobs?select=created_at&status=eq.queued&order=created_at.asc&limit=1',
  )

  if (!response.ok) return null

  const oldest = response.rows[0]?.created_at
  if (typeof oldest !== 'string') {
    return { queued: 0, oldestQueuedSeconds: null, starving: false }
  }

  const waited = Math.max(0, nowMs - Date.parse(oldest))

  return {
    queued: response.rows.length,
    oldestQueuedSeconds: Math.round(waited / 1000),
    starving: waited > QUEUE_WAIT_LIMIT_MS,
  }
}

interface WorkerReport extends WorkerLiveness {
  readonly id: string
  readonly revision: string | null
  readonly bootedAt: string
}

function report(pulse: WorkerPulse, nowMs: number): WorkerReport {
  return {
    ...workerLiveness(pulse, nowMs),
    id: pulse.id,
    revision: pulse.revision,
    bootedAt: pulse.bootedAt,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const server = serverSupabaseConfig()

  // 503 rather than 500: the service is not broken, it is not configured, and
  // the body names what is missing. The same choice `health/supabase` makes.
  if (server === null) {
    return NextResponse.json(
      {
        ok: false,
        state: 'unknown',
        detail: 'Supabase is not configured here, so the heartbeat cannot be read.',
      },
      { status: 503 },
    )
  }

  const credentials: RestCredentials = {
    url: server.url,
    apiKey: server.serviceRoleKey,
    accessToken: null,
  }

  const nowMs = Date.now()

  const heartbeats = await restSelect<Record<string, unknown>>(
    credentials,
    `worker_heartbeats?select=${HEARTBEAT_COLUMNS}&order=last_seen_at.desc`,
  )

  if (!heartbeats.ok) {
    return NextResponse.json(
      {
        ok: false,
        state: 'unknown',
        // The status code, not the message. A PostgREST error body can quote
        // the statement it refused, and this endpoint prints what it is given.
        detail: `Could not read worker_heartbeats (HTTP ${heartbeats.status}).`,
      },
      { status: 503 },
    )
  }

  const workers = heartbeats.rows
    .map((row) => toPulse(row))
    .filter((pulse): pulse is WorkerPulse => pulse !== null)
    .map((pulse) => report(pulse, nowMs))

  const queue = await readQueue(credentials, nowMs)

  // One `ok` for a monitor to act on. Every worker healthy **and** nothing
  // starving at the front of the queue: either alone can be true while the
  // system is broken — a beating worker whose grants were revoked is the first
  // case, and a worker gone between beats is the second.
  const ok = workers.length > 0 && workers.every((worker) => worker.ok) && queue?.starving !== true

  const state = workers.length === 0 ? 'absent' : (workers.find((w) => !w.ok)?.state ?? 'ok')

  return NextResponse.json({ ok, state, workers, queue }, { status: ok ? 200 : 503 })
}

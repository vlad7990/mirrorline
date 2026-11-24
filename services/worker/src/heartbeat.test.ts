/**
 * The pulse, against a fake Supabase, because the interesting cases are the
 * ones a real database will not reproduce on demand.
 *
 * Three of them matter more than the rest, and each is a way the old silence
 * could come back:
 *
 * 1. **A write that has not succeeded yet must not read as healthy.** This is
 *    what makes Railway's deploy gate mean something: a container that booted
 *    and cannot reach Supabase is not a worker.
 * 2. **A failed write must not leave a fresh-looking pulse behind.** A
 *    heartbeat that advances on failure is a monitor reporting health while
 *    nothing is being recorded.
 * 3. **The job must be cleared when the job ends.** A row still claiming to
 *    hold a scan is reported `over-lease` fifteen minutes later, for a job
 *    nobody is running.
 *
 * The worker has no build step — `tsx` runs this TypeScript directly in the
 * container (D125) — so there is no compiler between a mistake here and
 * production. That is the argument for testing it rather than reading it.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import { workerLiveness } from '../../../apps/web/lib/jobs/liveness'

import { createHealthServer, healthBody } from './health-server'
import { createHeartbeat, workerId, workerRevision } from './heartbeat'

type Row = Record<string, unknown>

interface Fake {
  readonly client: SupabaseClient
  readonly writes: () => readonly Row[]
  readonly breakWrites: (message: string) => void
  readonly healWrites: () => void
}

/**
 * The smallest thing `createHeartbeat` can tell from the real client: one
 * table, one `upsert`, an error or not.
 *
 * A mock library would buy nothing here — the surface is two method calls —
 * and would hide which of them the code actually makes.
 */
function fakeSupabase(): Fake {
  let writes: readonly Row[] = []
  let failure: string | null = null

  const client = {
    from: (table: string) => ({
      upsert: async (row: Row) => {
        if (failure !== null) return { error: { message: failure } }
        writes = [...writes, { table, ...row }]
        return { error: null }
      },
    }),
  }

  return {
    client: client as unknown as SupabaseClient,
    writes: () => writes,
    breakWrites: (message: string) => {
      failure = message
    },
    healWrites: () => {
      failure = null
    },
  }
}

/** Beat once and stop, so no test leaves an interval running. */
async function beatOnce(heartbeat: ReturnType<typeof createHeartbeat>, fake: Fake): Promise<void> {
  heartbeat.start()
  await vi.waitFor(() => expect(fake.writes().length).toBeGreaterThan(0))
  heartbeat.stop()
}

const ENV = { WORKER_ID: 'worker', RAILWAY_GIT_COMMIT_SHA: 'abc1234def5678901' }

describe('which worker this is', () => {
  it('prefers an explicit id, so two processes can be told apart', () => {
    expect(workerId({ WORKER_ID: 'second', RAILWAY_SERVICE_NAME: 'svc' })).toBe('second')
  })

  it('falls back to the Railway service name, which is what the dashboard shows', () => {
    expect(workerId({ RAILWAY_SERVICE_NAME: '@mirrorline/worker' })).toBe('@mirrorline/worker')
  })

  it('names a local run plainly rather than inventing one', () => {
    expect(workerId({})).toBe('worker')
    expect(workerId({ WORKER_ID: '   ' })).toBe('worker')
  })

  it('shortens the commit, and answers null when nothing says', () => {
    // The point of the column is "is production running my merge", which a
    // short sha answers as well as a long one.
    expect(workerRevision({ RAILWAY_GIT_COMMIT_SHA: 'abc1234def5678901' })).toBe('abc1234def56')
    expect(workerRevision({})).toBeNull()
  })
})

describe('a pulse nobody has recorded yet', () => {
  it('is null before the first write succeeds', () => {
    // Arrange
    const fake = fakeSupabase()

    // Act
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)

    // Assert: this is what makes a deploy gate a gate. A booted process that
    // has not proved it can reach Supabase is not yet a worker.
    expect(heartbeat.pulse()).toBeNull()
    expect(healthBody(heartbeat.pulse(), Date.now()).status).toBe(503)
  })

  it('stays null when the write fails', async () => {
    // Arrange
    const fake = fakeSupabase()
    fake.breakWrites('permission denied for table worker_heartbeats')
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)

    // Act
    heartbeat.start()
    await vi.waitFor(() => expect(heartbeat.pulse()).toBeNull())
    heartbeat.stop()

    // Assert: a heartbeat that advanced on failure would report health while
    // nothing at all was being recorded.
    expect(fake.writes()).toHaveLength(0)
    expect(workerLiveness(heartbeat.pulse(), Date.now()).state).toBe('absent')
  })

  it('recovers once the database comes back', async () => {
    // Arrange
    const fake = fakeSupabase()
    fake.breakWrites('connection refused')
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)
    heartbeat.start()
    await vi.waitFor(() => expect(heartbeat.pulse()).toBeNull())

    // Act
    fake.healWrites()
    heartbeat.claimFailed()

    // Assert
    await vi.waitFor(() => expect(heartbeat.pulse()).not.toBeNull())
    heartbeat.stop()
  })
})

describe('a beating worker', () => {
  it('writes the columns the migration created, and nothing else', async () => {
    // Arrange
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)

    // Act
    await beatOnce(heartbeat, fake)

    // Assert: the row is counts, timestamps and our own names. A new field here
    // is a decision about what a health endpoint prints.
    const [row] = fake.writes()
    expect(Object.keys(row ?? {}).sort()).toEqual([
      'booted_at',
      'claim_failures',
      'id',
      'job_kind',
      'job_started_at',
      'jobs_finished',
      'kinds',
      'last_seen_at',
      'revision',
      'table',
    ])
    expect(row?.table).toBe('worker_heartbeats')
    expect(row?.id).toBe('worker')
  })

  it('reads as idle with nothing in hand', async () => {
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)

    await beatOnce(heartbeat, fake)

    const liveness = workerLiveness(heartbeat.pulse(), Date.now())
    expect(liveness.ok).toBe(true)
    expect(liveness.state).toBe('idle')
  })

  it('reads as working while a job is held, and clears it afterwards', async () => {
    // Arrange
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)
    await beatOnce(heartbeat, fake)

    // Act
    heartbeat.jobStarted('niche-scan')
    await vi.waitFor(() => expect(heartbeat.pulse()?.jobKind).toBe('niche-scan'))
    expect(workerLiveness(heartbeat.pulse(), Date.now()).state).toBe('working')

    heartbeat.jobFinished()
    await vi.waitFor(() => expect(heartbeat.pulse()?.jobKind).toBeNull())

    // Assert: a row still claiming a job would be reported `over-lease` a
    // quarter of an hour later, for a job nobody is running.
    expect(heartbeat.pulse()?.jobStartedAt).toBeNull()
    expect(heartbeat.pulse()?.jobsFinished).toBe(1)
    expect(workerLiveness(heartbeat.pulse(), Date.now()).state).toBe('idle')
  })

  it('counts consecutive claim failures and forgets them on success', async () => {
    // Arrange
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)
    await beatOnce(heartbeat, fake)

    // Act: the shape of a bad merge — up, beating, and refused by `claim_job`.
    heartbeat.claimFailed()
    heartbeat.claimFailed()
    heartbeat.claimFailed()
    await vi.waitFor(() => expect(heartbeat.pulse()?.claimFailures).toBe(3))

    // Assert
    expect(workerLiveness(heartbeat.pulse(), Date.now()).state).toBe('not-claiming')

    heartbeat.claimSucceeded()
    await vi.waitFor(() => expect(heartbeat.pulse()?.claimFailures).toBe(0))
    expect(workerLiveness(heartbeat.pulse(), Date.now()).ok).toBe(true)
  })
})

describe('the health endpoint', () => {
  it('answers 200 only when the verdict is ok', async () => {
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)
    await beatOnce(heartbeat, fake)

    expect(healthBody(heartbeat.pulse(), Date.now()).status).toBe(200)
  })

  it('serves counts and names, never a credential or a URL', async () => {
    const fake = fakeSupabase()
    const heartbeat = createHeartbeat(fake.client, ['niche-scan'], ENV)
    await beatOnce(heartbeat, fake)

    const { json } = healthBody(heartbeat.pulse(), Date.now())

    expect(json).not.toMatch(/sb_secret|service_role|https?:\/\//)
    expect(JSON.parse(json).worker.revision).toBe('abc1234def56')
  })

  it('is a server that is not listening until it is told to', () => {
    // The factory is separated from `listen` so this can be asserted without
    // binding a port in CI, where a port in use is a flake rather than a bug.
    const server = createHealthServer(() => null)
    expect(server.listening).toBe(false)
    server.close()
  })
})

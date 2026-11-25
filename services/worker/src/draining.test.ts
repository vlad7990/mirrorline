/**
 * The fourteen-minute spinner, and the arithmetic that ends it (D135).
 *
 * A merge to `main` restarted the worker at 21:53 and killed an in-flight scan.
 * The job kept its lease, nothing could claim it, and it was picked up again at
 * **22:07** — a 900-second lease expiring while the studio said "Scanning your
 * niche…".
 *
 * These test the two decisions that fix it: how much of the drain window the job
 * in hand is allowed, and what happens when it runs out.
 */

import { describe, expect, test } from 'vitest'

import {
  DEFAULT_DRAIN_SECONDS,
  graceMs,
  INTERRUPTED_MESSAGE,
  RELEASE_RESERVE_MS,
  releaseJob,
  waitForJob,
} from './draining'

describe('graceMs', () => {
  test('holds the release reserve back from the window Railway gives us', () => {
    // Arrange — the value the deploy variable is meant to be set to.
    const env = { RAILWAY_DEPLOYMENT_DRAINING_SECONDS: '30' }

    // Act
    const grace = graceMs(env)

    // Assert
    expect(grace).toBe(30_000 - RELEASE_RESERVE_MS)
  })

  test('falls back to a small window when the variable is unset', () => {
    // Deliberately small: a worker that assumed a generous window would spend
    // it waiting and then be SIGKILLed before releasing anything.
    expect(graceMs({})).toBe(DEFAULT_DRAIN_SECONDS * 1000 - RELEASE_RESERVE_MS)
  })

  test('treats a window too short to hold anything back as "release now"', () => {
    // 3s is less than the reserve, so there is no grace at all — and zero means
    // release immediately rather than wait and hope.
    expect(graceMs({ RAILWAY_DEPLOYMENT_DRAINING_SECONDS: '3' })).toBe(0)
  })

  test('ignores a value that is not a positive number', () => {
    const fallback = DEFAULT_DRAIN_SECONDS * 1000 - RELEASE_RESERVE_MS

    expect(graceMs({ RAILWAY_DEPLOYMENT_DRAINING_SECONDS: 'soon' })).toBe(fallback)
    expect(graceMs({ RAILWAY_DEPLOYMENT_DRAINING_SECONDS: '0' })).toBe(fallback)
    expect(graceMs({ RAILWAY_DEPLOYMENT_DRAINING_SECONDS: '-30' })).toBe(fallback)
  })

  test('a long window is honoured, so finishing the scan stays available', () => {
    // Vlad's either/or: set this to 600 and an interrupted scan usually finishes
    // instead of being released. The cost is ten-minute deploys.
    expect(graceMs({ RAILWAY_DEPLOYMENT_DRAINING_SECONDS: '600' })).toBe(
      600_000 - RELEASE_RESERVE_MS,
    )
  })
})

describe('waitForJob', () => {
  test('reports a job that finishes inside the grace', async () => {
    const finished = await waitForJob(Promise.resolve('done'), 1_000)

    expect(finished).toBe(true)
  })

  test('a job that throws has still finished — its result is already written', async () => {
    // `runOnce`'s own catch writes the `failed` row, so there is no lease left
    // to release. Counting a rejection as "still running" would release a job
    // that had already been finished.
    const finished = await waitForJob(Promise.reject(new Error('the scan failed')), 1_000)

    expect(finished).toBe(true)
  })

  test('reports a job that does not finish in time', async () => {
    const neverFinishes = new Promise(() => {})

    const finished = await waitForJob(neverFinishes, 20)

    expect(finished).toBe(false)
  })

  test('does not wait at all when there is no grace', async () => {
    // The zero case from `graceMs`. It must not await the job even for a tick.
    const finished = await waitForJob(new Promise(() => {}), 0)

    expect(finished).toBe(false)
  })
})

/**
 * A minimal stand-in for the Supabase client's chained builder.
 *
 * Hand-rolled rather than mocked wholesale, so the test asserts the *shape of
 * the write* — which columns, which values — rather than that a mock was called.
 */
function fakeClient(error: { message: string } | null) {
  const captured: { table?: string; update?: Record<string, unknown>; id?: string } = {}

  const client = {
    from(table: string) {
      captured.table = table
      return {
        update(values: Record<string, unknown>) {
          captured.update = values
          return {
            eq(_column: string, value: string) {
              captured.id = value
              return Promise.resolve({ error })
            },
          }
        },
      }
    },
  }

  return { client, captured }
}

describe('releaseJob', () => {
  test('puts the job back in the queue with the restarting marker', async () => {
    // Arrange
    const { client, captured } = fakeClient(null)

    // Act
    const result = await releaseJob(client as never, 'job-1')

    // Assert
    expect(result.ok).toBe(true)
    expect(captured.table).toBe('jobs')
    expect(captured.id).toBe('job-1')
    expect(captured.update).toEqual({
      status: 'queued',
      lease_until: null,
      started_at: null,
      error: null,
      result: { outcome: 'interrupted', message: INTERRUPTED_MESSAGE },
    })
  })

  test('does not touch attempts, which is the bound on a deploy loop', async () => {
    // `claim_job` already counted this attempt and `max_attempts` is 3.
    // Resetting the count would remove the only thing between a bad deploy loop
    // and an unbounded bill.
    const { client, captured } = fakeClient(null)

    await releaseJob(client as never, 'job-1')

    expect(captured.update).not.toHaveProperty('attempts')
  })

  test('reports a failed release rather than pretending it worked', async () => {
    // The fallback is the old behaviour — the lease expires — and the caller
    // logs that loudly. Swallowing it would make a fourteen-minute wait silent
    // all over again.
    const { client } = fakeClient({ message: 'permission denied for table jobs' })

    const result = await releaseJob(client as never, 'job-1')

    expect(result.ok).toBe(false)
    expect(result.message).toContain('permission denied')
  })

  test('the marker is an outcome rather than a fifth status', () => {
    // The job really is queued: the next worker claims it exactly as it claims
    // anything else, and `claim_job` clears the marker by setting `running`. A
    // fifth `JobStatus` would need a migration and a check-constraint change for
    // a fact that lives for seconds.
    expect(INTERRUPTED_MESSAGE).toContain('went back in the queue')
  })
})

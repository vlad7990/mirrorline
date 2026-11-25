/**
 * The verdict a monitor acts on, and the inequalities that keep it believable.
 *
 * Two halves, and the second matters as much as the first. A liveness check
 * that reports an outage on a working system gets muted inside a week, and a
 * muted monitor is strictly worse than no monitor — it is the same silence with
 * a false sense of coverage attached. So the thresholds are asserted against
 * the beat they are judging, not merely chosen.
 */

import { describe, expect, it } from 'vitest'

import {
  WORKER_CLAIM_FAILURE_LIMIT,
  WORKER_ERROR_BACKOFF_MS,
  WORKER_HEARTBEAT_INTERVAL_MS,
  WORKER_IDLE_POLL_MS,
  WORKER_STALE_AFTER_MS,
  workerLiveness,
  type WorkerPulse,
} from './liveness'
import { JOB_LEASE_SECONDS } from './types'

const NOW = Date.parse('2026-11-24T18:00:00.000Z')

/** Seconds before `NOW`, as the ISO-8601 string PostgREST hands back. */
const secondsAgo = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

function pulse(overrides: Partial<WorkerPulse> = {}): WorkerPulse {
  return {
    id: 'worker',
    kinds: ['niche-scan'],
    bootedAt: secondsAgo(3600),
    lastSeenAt: secondsAgo(5),
    jobKind: null,
    jobStartedAt: null,
    jobsFinished: 3,
    claimFailures: 0,
    revision: 'abc1234',
    ...overrides,
  }
}

describe('the thresholds are consistent with the beat they judge', () => {
  it('allows several missed beats before calling a worker gone', () => {
    // A window one beat wide alerts on the first dropped write, which happens
    // on any redeploy. Several beats is the margin that makes an alert mean
    // something.
    expect(WORKER_STALE_AFTER_MS).toBeGreaterThanOrEqual(4 * WORKER_HEARTBEAT_INTERVAL_MS)
  })

  it('allows a worker to ride out more than one failed database call', () => {
    // The heartbeat and the claim fail together when Supabase is unreachable,
    // so the staleness window has to be wider than the backoff between tries
    // or a single blip reads as death.
    expect(WORKER_STALE_AFTER_MS).toBeGreaterThan(WORKER_ERROR_BACKOFF_MS)
  })

  it('beats no more often than it polls for work', () => {
    // Not a safety property, a cost one: the beat is a write and the poll is a
    // read, and there is no reason for the bookkeeping to be busier than the
    // work it describes.
    expect(WORKER_HEARTBEAT_INTERVAL_MS).toBeGreaterThanOrEqual(WORKER_IDLE_POLL_MS)
  })

  it('keeps beating for the whole of the longest job', () => {
    // The timer, not the loop, is what writes the beat (see `liveness.ts`).
    // This is the assertion that the lease cannot outlast the staleness window
    // — if it could, every long scan would be reported as a dead worker.
    expect(JOB_LEASE_SECONDS * 1000).toBeGreaterThan(WORKER_STALE_AFTER_MS)
  })
})

describe('a healthy worker', () => {
  it('is idle when it is beating with nothing in hand', () => {
    // Act
    const liveness = workerLiveness(pulse(), NOW)

    // Assert
    expect(liveness.ok).toBe(true)
    expect(liveness.state).toBe('idle')
    expect(liveness.secondsSinceSeen).toBe(5)
    expect(liveness.jobSeconds).toBeNull()
  })

  it('is working, not stalled, through a six-minute scan', () => {
    // Arrange: the slowest scan observed (D118), still inside the lease.
    const scanning = pulse({
      jobKind: 'niche-scan',
      jobStartedAt: secondsAgo(360),
      lastSeenAt: secondsAgo(10),
    })

    // Act
    const liveness = workerLiveness(scanning, NOW)

    // Assert: this is the case a loop-driven heartbeat would have called dead.
    expect(liveness.ok).toBe(true)
    expect(liveness.state).toBe('working')
    expect(liveness.jobSeconds).toBe(360)
  })

  it('tolerates a dropped beat', () => {
    // Arrange: two intervals missed, still inside the window.
    const blipped = pulse({ lastSeenAt: secondsAgo((WORKER_HEARTBEAT_INTERVAL_MS / 1000) * 2) })

    // Assert
    expect(workerLiveness(blipped, NOW).ok).toBe(true)
  })

  it('is healthy after a single failed claim', () => {
    // One failure is a dropped connection. Alerting on it would alert weekly.
    expect(workerLiveness(pulse({ claimFailures: 1 }), NOW).ok).toBe(true)
  })
})

describe('a worker that is not there', () => {
  it('reports absent when nothing has ever beaten', () => {
    // Act
    const liveness = workerLiveness(null, NOW)

    // Assert: the case D125 named — a quiet afternoon and a dead worker look
    // identical from the queue, and this row is what tells them apart.
    expect(liveness.ok).toBe(false)
    expect(liveness.state).toBe('absent')
    expect(liveness.secondsSinceSeen).toBeNull()
  })

  it('reports stalled once the beat is older than the window', () => {
    // Arrange
    const stale = pulse({ lastSeenAt: secondsAgo(WORKER_STALE_AFTER_MS / 1000 + 1) })

    // Act
    const liveness = workerLiveness(stale, NOW)

    // Assert
    expect(liveness.ok).toBe(false)
    expect(liveness.state).toBe('stalled')
  })

  it('calls a stale row stalled even when it claims to hold a job', () => {
    // Arrange: a crashed worker leaves its last beat saying "working". Nothing
    // is updating that row, so the job it names is a claim about the past.
    const crashedMidJob = pulse({
      jobKind: 'niche-scan',
      jobStartedAt: secondsAgo(200),
      lastSeenAt: secondsAgo(600),
    })

    // Assert
    expect(workerLiveness(crashedMidJob, NOW).state).toBe('stalled')
  })

  it('treats an unreadable timestamp as absent rather than fresh', () => {
    // The expensive direction of this ambiguity is "assume healthy".
    const nonsense = pulse({ lastSeenAt: 'not a date' })

    expect(workerLiveness(nonsense, NOW).state).toBe('absent')
  })
})

describe('a worker that is up but not doing its job', () => {
  it('reports not-claiming when the claim keeps failing', () => {
    // Arrange: the shape of a bad merge — the process boots and beats, and
    // `claim_job` refuses because a grant or a name changed.
    const refused = pulse({ claimFailures: WORKER_CLAIM_FAILURE_LIMIT })

    // Act
    const liveness = workerLiveness(refused, NOW)

    // Assert
    expect(liveness.ok).toBe(false)
    expect(liveness.state).toBe('not-claiming')
  })

  it('reports over-lease once a job outlives its claim', () => {
    // Arrange: the double-billing window. `claim_job` reclaims an expired
    // lease, so a second worker starts the same scan.
    const overrun = pulse({
      jobKind: 'niche-scan',
      jobStartedAt: secondsAgo(JOB_LEASE_SECONDS + 1),
      lastSeenAt: secondsAgo(5),
    })

    // Act
    const liveness = workerLiveness(overrun, NOW)

    // Assert
    expect(liveness.ok).toBe(false)
    expect(liveness.state).toBe('over-lease')
    expect(liveness.detail).toContain('bill the run twice')
  })
})

describe('what the verdict is allowed to say', () => {
  it('never quotes anything but our own identifiers, counts and seconds', () => {
    // The health route serves `detail` verbatim, so this is the same rule
    // `api/health/supabase/route.ts` carries and the same rule D127 applied to
    // rejection logging: names and numbers, never content.
    const states: readonly WorkerPulse[] = [
      pulse(),
      pulse({ jobKind: 'niche-scan', jobStartedAt: secondsAgo(60) }),
      pulse({ claimFailures: 9 }),
      pulse({ lastSeenAt: secondsAgo(9999) }),
      pulse({ jobKind: 'render-cuts', jobStartedAt: secondsAgo(JOB_LEASE_SECONDS + 60) }),
    ]

    for (const state of states) {
      const { detail } = workerLiveness(state, NOW)

      // The pulse carries no secret, and the sentence must not acquire one by
      // interpolating something that is not in the pulse at all.
      expect(detail).not.toMatch(/sb_secret|eyJ|service_role|https?:\/\//)
    }
  })
})

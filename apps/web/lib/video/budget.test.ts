/**
 * Everything a render job may spend has to fit inside its lease, with margin.
 *
 * The scan's `lib/jobs/budget.test.ts` exists because nobody added the scan's
 * legs up until a production run spent 829 seconds of a 900-second lease. This
 * is the same assertion for the other kind of job, written before the lesson
 * rather than after it — and it has one extra thing to prove, because the
 * render job does not use the scan's lease.
 *
 * **Why a different lease is the right answer rather than a shortcut.**
 * Transcribing an hour of audio on two vCPUs is twenty minutes of honest work.
 * It cannot be made to fit in fifteen minutes by caring more, and the failure
 * mode of trying is the expensive one: `claim_job` reclaims an expired lease,
 * so a second worker starts the same encode and the client is billed twice for
 * one upload. `claim_job(job_kinds, lease_seconds)` already takes the lease per
 * claim, so the video worker passes a longer one. These tests are what keep the
 * two numbers related.
 */

import { describe, expect, it } from 'vitest'

import { JOB_LEASE_SECONDS } from '../jobs/types'

import {
  MAX_SOURCE_SECONDS,
  RENDER_JOB_LEASE_SECONDS,
  RENDER_TIME_BUDGET_MS,
  TRANSCRIBE_TIME_BUDGET_MS,
  TRANSFER_TIME_BUDGET_MS,
} from './types'

/**
 * How much of the lease must be left over: a third, the same fraction the
 * scan's test demands and for the same reason. The budgets bound the slow
 * legs, and a job is more than its slow legs — claiming it, reading the draft,
 * aligning the beats, writing rows. None of those is slow, and "none of those
 * is slow" is exactly the assumption that produced the 829-second leg.
 */
const REQUIRED_MARGIN = 1 / 3

const leaseMs = RENDER_JOB_LEASE_SECONDS * 1000
const spentMs = TRANSCRIBE_TIME_BUDGET_MS + RENDER_TIME_BUDGET_MS + TRANSFER_TIME_BUDGET_MS

describe('a render job inside its lease', () => {
  it('spends less wall clock than the lease allows', () => {
    expect(spentMs).toBeLessThan(leaseMs)
  })

  it('leaves at least a third of the lease unspent', () => {
    const margin = (leaseMs - spentMs) / leaseMs
    expect(margin).toBeGreaterThanOrEqual(REQUIRED_MARGIN)
  })

  it('needs a longer lease than a scan, which is why it passes its own', () => {
    // If this ever stops being true, the render job should go back to the
    // shared lease rather than keeping a second number alive for no reason.
    expect(RENDER_JOB_LEASE_SECONDS).toBeGreaterThan(JOB_LEASE_SECONDS)
    expect(spentMs).toBeGreaterThan(JOB_LEASE_SECONDS * 1000)
  })
})

describe('the transcription budget and the source limit agree', () => {
  it('allows at least a quarter of realtime for the longest source we accept', () => {
    // faster-whisper `small` int8 runs at roughly 0.2-0.4x realtime on two
    // vCPUs. The budget has to clear the slow end of that for a source at the
    // limit, or `MAX_SOURCE_SECONDS` is a promise the worker cannot keep.
    const slowestPlausibleMs = MAX_SOURCE_SECONDS * 1000 * 0.4
    expect(TRANSCRIBE_TIME_BUDGET_MS).toBeGreaterThanOrEqual(slowestPlausibleMs)
  })

  it('refuses to let the source limit outgrow the budget silently', () => {
    // The pair is the point: raising MAX_SOURCE_SECONDS without raising the
    // budget turns a longer upload into a job that cannot finish and is
    // therefore run twice. This test is what tells whoever raises one what else
    // has to move.
    expect(MAX_SOURCE_SECONDS).toBeLessThanOrEqual(TRANSCRIBE_TIME_BUDGET_MS / 1000 / 0.4)
  })
})

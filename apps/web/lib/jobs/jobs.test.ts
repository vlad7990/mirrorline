/**
 * The two decisions the job queue makes in the browser's half (D119).
 *
 * Both are small functions, and both have an expensive wrong answer, which is
 * why they are tested rather than eyeballed:
 *
 * - **`isJobPending`** decides whether the studio says "Scanning…". Say yes
 *   for a job nothing will ever pick up and the client watches a spinner
 *   forever; say no while a worker is busy and the button re-enables and buys
 *   a second six-minute scan.
 * - **`parseJobOutcome`** decides whether a finished scan reads as a report or
 *   as the spend cap declining. `jobs.result` is jsonb, so its input is
 *   genuinely arbitrary.
 *
 * The worker's own loop is proved against a real database rather than here:
 * claiming is `for update skip locked`, and a mocked Postgres would be testing
 * the mock.
 */

import { describe, expect, test } from 'vitest'

import { isJobPending, parseJobOutcome, type JobSummary } from './types'

function job(overrides: Partial<JobSummary> = {}): JobSummary {
  return {
    id: 'job-1',
    kind: 'niche-scan',
    status: 'queued',
    createdAt: '2026-11-23T02:00:00Z',
    outcome: null,
    error: null,
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }
}

describe('isJobPending', () => {
  test('a queued job is pending, because no worker has taken it yet', () => {
    expect(isJobPending(job({ status: 'queued' }))).toBe(true)
  })

  test('a running job is pending', () => {
    expect(isJobPending(job({ status: 'running', attempts: 1 }))).toBe(true)
  })

  test('a complete job is not pending', () => {
    expect(isJobPending(job({ status: 'complete', attempts: 1, outcome: 'complete' }))).toBe(false)
  })

  /**
   * The regression this file exists for.
   *
   * `max_attempts` is 3, so a failed job with one attempt *looks* retryable
   * and the obvious implementation returns true here. Nothing requeues it —
   * the worker marks a failure terminal and stops — so "pending" would leave
   * the studio showing "Scanning…" for a job no worker will ever claim again,
   * with the button disabled and no way forward but a reload.
   *
   * `attempts` bounds crash recovery, not retries. See `types.ts`.
   */
  test('a failed job is not pending, even with attempts left', () => {
    expect(isJobPending(job({ status: 'failed', attempts: 1, maxAttempts: 3 }))).toBe(false)
  })

  test('a failed job with its attempts spent is not pending either', () => {
    expect(isJobPending(job({ status: 'failed', attempts: 3, maxAttempts: 3 }))).toBe(false)
  })
})

describe('parseJobOutcome', () => {
  test('reads the outcome the worker wrote', () => {
    expect(parseJobOutcome({ outcome: 'complete', message: 'Scanned.' })).toBe('complete')
    expect(parseJobOutcome({ outcome: 'refused', message: 'Cap reached.' })).toBe('refused')
  })

  test('a job that has not finished has no outcome', () => {
    expect(parseJobOutcome(null)).toBeNull()
  })

  /**
   * jsonb accepts anything, so this function is a boundary and is treated like
   * one: nothing unrecognised is passed through to be rendered.
   */
  test.each([
    ['a string', 'refused'],
    ['a number', 7],
    ['an array', ['refused']],
    ['an unknown outcome', { outcome: 'cancelled' }],
    ['a missing outcome', { message: 'no outcome here' }],
    ['a non-string outcome', { outcome: 42 }],
  ])('refuses %s', (_label, value) => {
    expect(parseJobOutcome(value)).toBeNull()
  })
})

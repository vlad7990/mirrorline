/**
 * Everything one job may spend has to fit inside the lease, with margin.
 *
 * This is the arithmetic nobody was doing when the first production scan ran a
 * single leg for **829 seconds** against a **900-second** lease, with the
 * script agent still to come after it. Each piece was individually defensible:
 * the scan's five-minute value is a connection guard rather than a deadline,
 * and the script agent simply had no timeout. Nothing added them up.
 *
 * **The failure mode is the expensive one.** A job that outlives its lease is
 * not a slow job — `claim_job` reclaims expired leases, so a second worker
 * claims it and bills a second Sonnet research run for a report already being
 * written. The worker's own comment says exactly that, and then called the
 * lease "comfortably longer than the slowest scan observed (six minutes)",
 * which the 829-second run made false.
 *
 * So the relationship is asserted rather than remembered. If somebody raises a
 * budget, this test is what tells them what else has to move.
 */

import { describe, expect, it } from 'vitest'

import {
  SCAN_SEARCH_CEILING,
  SCAN_SEARCH_PROJECTION,
  SCAN_TIME_BUDGET_MS,
} from '../niche-scan/scan'
import { SCRIPT_TIME_BUDGET_MS } from '../scripts/first-videos'

import { JOB_LEASE_SECONDS } from './types'

/**
 * How much of the lease must be left over.
 *
 * A third. The budgets bound the *model calls*, and a job is more than its
 * model calls: claiming it, reading the profile, writing the report, writing a
 * `trends` row per example, recording the run. None of those is slow — and
 * "none of those is slow" is exactly the assumption that produced an
 * 829-second leg, so the margin is wide enough not to rest on it.
 */
const REQUIRED_MARGIN = 1 / 3

const leaseMs = JOB_LEASE_SECONDS * 1000
const spentMs = SCAN_TIME_BUDGET_MS + SCRIPT_TIME_BUDGET_MS

describe('a niche-scan job fits inside its lease', () => {
  it('spends less wall clock than the lease allows', () => {
    expect(spentMs).toBeLessThan(leaseMs)
  })

  it('leaves at least a third of the lease unspent', () => {
    // Act
    const margin = (leaseMs - spentMs) / leaseMs

    // Assert
    expect(margin).toBeGreaterThanOrEqual(REQUIRED_MARGIN)
  })

  it('would have caught the run that caused this test', () => {
    // Arrange: leg one of the first production scan, which no budget bounded.
    const theRunThatFailed = 829 * 1000

    // Assert: it does not fit, and the scan's budget now forbids it.
    expect(theRunThatFailed).toBeGreaterThan(SCAN_TIME_BUDGET_MS)
    expect(theRunThatFailed + SCRIPT_TIME_BUDGET_MS).toBeGreaterThan(leaseMs)
  })

  it('targets six minutes or less for the research itself', () => {
    // Vlad's number, written down so that raising it is a decision rather
    // than a drift.
    expect(SCAN_TIME_BUDGET_MS).toBeLessThanOrEqual(6 * 60 * 1000)
  })
})

describe('the search ceiling is the number we charge for', () => {
  it('enforces exactly what the spend cap projects', () => {
    // If these drift apart the cap guards a different request from the one we
    // make: a ceiling above the projection is spend nobody approved, and one
    // below it refuses runs we already paid to allow.
    expect(SCAN_SEARCH_CEILING).toBe(SCAN_SEARCH_PROJECTION)
  })
})

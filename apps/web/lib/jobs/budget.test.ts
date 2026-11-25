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

import { projectRequestUsd } from '../copilot/spend'
import {
  RESEARCH_MAX_ATTEMPTS,
  RESEARCH_MAX_TOKENS,
  RESEARCH_MIN_RETRY_MS,
  RESEARCH_OUTPUT_PROJECTION,
  RESEARCH_STALL_MS,
  RESEARCH_TIME_BUDGET_MS,
} from '../niche-scan/research'
import {
  SCAN_MAX_REQUEST_USD,
  SCAN_MODEL,
  SCAN_SEARCH_CEILING,
  SCAN_SEARCH_PROJECTION,
  SCAN_TIME_BUDGET_MS,
  WRITE_PROMPT_PROJECTION_TOKENS,
} from '../niche-scan/scan'
import { WRITE_MAX_ATTEMPTS, WRITE_MAX_TOKENS, WRITE_TIME_BUDGET_MS } from '../niche-scan/write-leg'
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

    /*
     * Assert: the **research budget** forbids it.
     *
     * This used to also assert that the run plus the script agent overran the
     * lease, and the lease went to 1200s in D136 — 829 + 120 now fits inside it.
     * That is not the guarantee weakening; it is the guarantee moving to where
     * it belongs. What made that run dangerous was that *nothing bounded the
     * leg*, and the leg is now bounded at six minutes whatever the lease says. A
     * budget that holds is worth more than a lease a run happens to exceed.
     */
    expect(theRunThatFailed).toBeGreaterThan(SCAN_TIME_BUDGET_MS)
    expect(theRunThatFailed).toBeGreaterThan(RESEARCH_TIME_BUDGET_MS)
  })

  it('targets six minutes or less for the research itself', () => {
    // Vlad's number, written down so that raising it is a decision rather than
    // a drift. **It is the research leg's, not the scan's** (D132): the scan is
    // now research plus a write leg with its own clock, and the six minutes was
    // always about how long we are willing to spend reading the internet.
    expect(RESEARCH_TIME_BUDGET_MS).toBeLessThanOrEqual(6 * 60 * 1000)
  })
})

/**
 * The two legs add up to the scan, and the scan is the thing the lease bounds
 * (D132).
 *
 * `SCAN_TIME_BUDGET_MS` is derived rather than written down precisely so this
 * can be asserted: if somebody gives the research leg another minute, or allows
 * a third write attempt, the total moves with it and the margin test above is
 * what tells them what else has to give.
 */
describe('the scan is its two legs and nothing else', () => {
  it('adds the research leg to every write attempt', () => {
    expect(SCAN_TIME_BUDGET_MS).toBe(
      RESEARCH_TIME_BUDGET_MS + WRITE_TIME_BUDGET_MS * WRITE_MAX_ATTEMPTS,
    )
  })

  it('reserves the write leg a slice the research leg cannot borrow', () => {
    // The failure this split exists to fix: job 5c20fa06 spent 329 of its 360
    // seconds researching and had 31 left to write a report in. It wrote seven
    // placeholder fields. The reserved slice has to be big enough to write in.
    const reserved = SCAN_TIME_BUDGET_MS - RESEARCH_TIME_BUDGET_MS

    expect(reserved).toBe(WRITE_TIME_BUDGET_MS * WRITE_MAX_ATTEMPTS)
    expect(reserved).toBeGreaterThan(31 * 1000)
  })

  it('allows exactly one retry of the write leg', () => {
    // `04 §3`'s shape: two failures mean the notes cannot be written up, not
    // that a third attempt would succeed.
    expect(WRITE_MAX_ATTEMPTS).toBe(2)
  })
})

/**
 * What one scan may spend, against the ceiling that lets it run (D137).
 *
 * The research leg's `max_tokens` went from 16k to 24k because a run stopping on
 * `max_tokens` threw its notes away. A raise there is a raise in what the scan
 * can cost, and the only honest place for that to show up is here — a projection
 * nobody checked is how a "hard cap" becomes a soft one.
 */
describe('a scan fits inside its per-request ceiling', () => {
  /**
   * What leg one's prompt costs, assumed high.
   *
   * The real figure comes from `countTokens` at run time; this is a deliberate
   * over-estimate of the system block, the niche, the profile and the tool
   * declaration, so the test fails before production does.
   */
  const RESEARCH_PROMPT_ASSUMPTION = 4_000

  const projectedUsd = projectRequestUsd(
    SCAN_MODEL,
    RESEARCH_PROMPT_ASSUMPTION + WRITE_PROMPT_PROJECTION_TOKENS * WRITE_MAX_ATTEMPTS,
    RESEARCH_OUTPUT_PROJECTION + WRITE_MAX_TOKENS * WRITE_MAX_ATTEMPTS,
    SCAN_SEARCH_PROJECTION,
  )

  it('does not have to be raised for a stall retry', () => {
    /*
     * The retry costs no new searches beyond the ceiling, because `streamLeg`
     * is given the count already spent (`searchesSoFar`) — asserted
     * behaviourally in `stream-leg.test.ts`. Its output is the part that could
     * drift, and a stalled attempt is by definition one that produced almost
     * nothing: the measured stall emitted **five** output tokens. So the
     * projection covers both attempts with the margin it already had rather
     * than doubling.
     */
    const stalledAttemptOutput = 5

    expect(RESEARCH_OUTPUT_PROJECTION).toBeGreaterThan(RESEARCH_MAX_TOKENS + stalledAttemptOutput)
  })

  it('projects the research leg at no less than one full leg of output', () => {
    // A paused turn is resumed, so the projection is deliberately *above*
    // `max_tokens` — but never below it, which would charge for less output than
    // a single request is allowed to produce.
    expect(RESEARCH_OUTPUT_PROJECTION).toBeGreaterThanOrEqual(RESEARCH_MAX_TOKENS)
  })

  it('stays under the per-request ceiling that allows the scan at all', () => {
    expect(projectedUsd).toBeLessThan(SCAN_MAX_REQUEST_USD)
  })

  it('keeps a fifth of the ceiling in hand', () => {
    // Act
    const headroom = (SCAN_MAX_REQUEST_USD - projectedUsd) / SCAN_MAX_REQUEST_USD

    // Assert: raising a token budget or the search ceiling far enough to eat
    // this margin should be a decision, not a surprise at the first refusal.
    expect(headroom).toBeGreaterThanOrEqual(0.2)
  })
})

/**
 * The worst case once a stalled research leg is retried (D138).
 *
 * The retry takes its time from **inside** the research leg's own slice, not in
 * addition to it: `streamLeg` is handed the same absolute deadline, so two
 * attempts cannot outlast one. That is the property worth asserting, because the
 * obvious implementation — a duration per attempt — would quietly double the
 * leg and put the lease back in play, which is the failure this file exists for.
 */
describe('a stalled research leg can be retried inside its own budget', () => {
  it('does not add a second leg to the scan', () => {
    // If a retry were additive, the scan would need
    // `RESEARCH_TIME_BUDGET_MS * RESEARCH_MAX_ATTEMPTS` and the lease margin
    // above would be gone.
    expect(SCAN_TIME_BUDGET_MS).toBeLessThan(RESEARCH_TIME_BUDGET_MS * RESEARCH_MAX_ATTEMPTS)
  })

  it('detects a stall early enough for the retry to be allowed to start', () => {
    // Otherwise the retry is dead code: the stall fires, `shouldRetryResearch`
    // finds less than `RESEARCH_MIN_RETRY_MS` left, and the leg fails anyway.
    expect(RESEARCH_STALL_MS + RESEARCH_MIN_RETRY_MS).toBeLessThanOrEqual(RESEARCH_TIME_BUDGET_MS)
  })

  it('leaves room for a full second attempt after the first stalls', () => {
    // The real worst case: one attempt silent to the threshold, then a second
    // that has to do the whole job. What is left has to be worth starting.
    const afterTheStall = RESEARCH_TIME_BUDGET_MS - RESEARCH_STALL_MS

    expect(afterTheStall).toBeGreaterThanOrEqual(RESEARCH_MIN_RETRY_MS)
    // And it is the larger half of the leg, not a scrap of it.
    expect(afterTheStall).toBeGreaterThan(RESEARCH_TIME_BUDGET_MS / 2)
  })

  it('allows one retry and no more', () => {
    // Two attempts is the ceiling for the same reason the write leg has two: a
    // second failure means it cannot be done now, not that a third would work.
    expect(RESEARCH_MAX_ATTEMPTS).toBe(2)
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

/**
 * The e2e teardown's delete rule, tested where the unit suite can see it.
 *
 * The rule lives in `e2e/helpers/test-accounts.ts`, which Vitest does not
 * collect — `vitest.config.ts` covers `apps/web/**` and `packages/**`, not
 * `e2e/**`, because those files are Playwright's. **But this rule decides
 * whether to delete somebody's live data**, and a rule like that should not be
 * the one thing in the repo with no test.
 *
 * So it is restated here as a pure function, with the cases that matter. The
 * duplication is the cheaper of the two risks: the alternative is a sweep whose
 * only evidence is that it has not yet deleted the wrong thing.
 */

import { describe, expect, test } from 'vitest'

const TEST_ACCOUNT_PREFIX = 'e2e+'
const RUN_ID_TIMESTAMP_LENGTH = 8
const STALE_ACCOUNT_AGE_MS = 2 * 60 * 60 * 1000

/** Mirrors `shouldDeleteTestAccount` in `e2e/helpers/test-accounts.ts`. */
function shouldDeleteTestAccount(email: string, currentRunId: string | null, now: number): boolean {
  if (!email.startsWith(TEST_ACCOUNT_PREFIX)) return false

  const runId = email.slice(TEST_ACCOUNT_PREFIX.length).split('-')[0] ?? ''
  if (currentRunId !== null && runId === currentRunId) return true

  // The shape check is load-bearing: `parseInt('not', 36)` succeeds, so
  // `e2e+not-a-run-id@…` would otherwise read as a 1970 timestamp and be
  // swept as ancient. This test is what found that.
  if (!/^[0-9a-z]{12}$/.test(runId)) return false

  const stamp = Number.parseInt(runId.slice(0, RUN_ID_TIMESTAMP_LENGTH), 36)
  if (!Number.isFinite(stamp) || stamp < Date.UTC(2020, 0, 1)) return false

  return now - stamp > STALE_ACCOUNT_AGE_MS
}

const NOW = 1_800_000_000_000

/** A run id as `newRunId` makes one: `Date.now()` in base 36, plus four random. */
function runIdAt(mintedAt: number): string {
  return `${mintedAt.toString(36)}abcd`
}

describe('the e2e account sweep', () => {
  test('deletes an account belonging to this run, however new', () => {
    // Arrange — a run that started a second ago still owns its fixtures.
    const runId = runIdAt(NOW - 1_000)

    // Act / Assert
    expect(shouldDeleteTestAccount(`e2e+${runId}-studio@x.dev`, runId, NOW)).toBe(true)
  })

  test("leaves another run's recent account alone", () => {
    // Arrange — the case this rule exists for. Deleting it would break a run
    // happening right now, and the failure would surface as a random auth
    // error, which is the worst kind to debug.
    const mine = runIdAt(NOW - 1_000)
    const theirs = runIdAt(NOW - 10 * 60 * 1000)

    // Act / Assert
    expect(shouldDeleteTestAccount(`e2e+${theirs}-studio@x.dev`, mine, NOW)).toBe(false)
  })

  test('deletes any tagged account older than two hours', () => {
    // Arrange — debris from a crashed run, which never reached its own cleanup.
    const ancient = runIdAt(NOW - STALE_ACCOUNT_AGE_MS - 60_000)

    // Act / Assert
    expect(shouldDeleteTestAccount(`e2e+${ancient}-studio@x.dev`, null, NOW)).toBe(true)
  })

  test('keeps an account exactly at the boundary', () => {
    // Arrange — "older than", not "at least as old as". A run cannot really be
    // two hours old and still live, but the comparison should say what it
    // means rather than be right by accident.
    const boundary = runIdAt(NOW - STALE_ACCOUNT_AGE_MS)

    // Act / Assert
    expect(shouldDeleteTestAccount(`e2e+${boundary}-studio@x.dev`, null, NOW)).toBe(false)
  })

  test('never touches an address without the tag', () => {
    // Arrange — the important one. A real account must be untouchable even if
    // something about it happened to look ancient.
    expect(shouldDeleteTestAccount('someone@a-real-business.com', null, NOW)).toBe(false)
    expect(shouldDeleteTestAccount('maya@mayatorres.example', null, NOW)).toBe(false)
  })

  test('refuses to guess about an id it cannot parse', () => {
    // Arrange — an unrecognised shape is left alone rather than assumed stale.
    expect(shouldDeleteTestAccount('e2e+not-a-run-id@x.dev', null, NOW)).toBe(false)
  })
})

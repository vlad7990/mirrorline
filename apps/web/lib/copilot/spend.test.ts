/**
 * The cap has to actually hold (spec 18 §6, non-negotiable 11).
 *
 * The tests that matter here are the ones about *refusing*. A spend tracker
 * that counts correctly and never stops anything satisfies the word "cap" and
 * not the rule, and §6 says "hard stop, not a warning" twice because that is
 * the easy thing to get wrong.
 *
 * Dates are injected rather than read from the clock, so a month boundary is
 * a thing these tests can stand on rather than something that happens to them
 * on the 1st.
 */

import { beforeEach, describe, expect, test } from 'vitest'

import {
  DEFAULT_MONTHLY_CAP_USD,
  MAX_REQUEST_USD,
  cacheHealth,
  cacheReadShare,
  checkSpend,
  monthKey,
  monthlyCapUsd,
  projectRequestUsd,
  readLedger,
  recordUsage,
  resetLedgers,
  spendSummary,
  usageUsd,
} from './spend'

const NOVEMBER = new Date('2026-11-15T09:00:00Z')
const DECEMBER = new Date('2026-12-01T00:00:00Z')
const SITE_MODEL = 'claude-haiku-4-5'
const STUDIO_MODEL = 'claude-sonnet-5'

beforeEach(() => {
  resetLedgers()
})

describe('what a call costs', () => {
  test('prices input and output at the model’s own rates', () => {
    // A million input tokens on Haiku 4.5 is $1; a million output is $5.
    const cost = usageUsd(SITE_MODEL, {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    })
    expect(cost).toBeCloseTo(6, 5)
  })

  test('prices a cache read at a tenth of input, which is the point of caching', () => {
    const cached = usageUsd(SITE_MODEL, {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheCreationTokens: 0,
    })
    const uncached = usageUsd(SITE_MODEL, {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    })

    expect(cached).toBeCloseTo(uncached / 10, 5)
  })

  test('prices an unknown model at the dearest rate, never at zero', () => {
    // A model id changing is routine. A cap that silently stops counting when
    // it does is not a cap, and the failure would be invisible until a bill.
    const unknown = usageUsd('claude-something-new', {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
    })
    expect(unknown).toBeGreaterThan(0)
    expect(unknown).toBeCloseTo(3, 5)
  })
})

describe('the cap is a hard stop, before the call', () => {
  test('allows an ordinary question', () => {
    const decision = checkSpend('demo', SITE_MODEL, 7_000, 1_024, NOVEMBER, {})
    expect(decision.allowed).toBe(true)
  })

  test('refuses once the month is spent, and says the sentence §7 specifies', () => {
    // Spend the month on one enormous recorded call, then ask again.
    recordUsage(
      'demo',
      STUDIO_MODEL,
      {
        inputTokens: 0,
        outputTokens: 2_000_000,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
      NOVEMBER,
    )

    const decision = checkSpend('demo', STUDIO_MODEL, 5_000, 8_000, NOVEMBER, {})

    expect(decision.allowed).toBe(false)
    expect(decision.allowed === false && decision.message).toBe(
      'This workspace has reached its cap for the month.',
    )
    // The log line carries the numbers; the person gets the sentence. A
    // message with dollar figures in it would be leaking the operator's view
    // into a client's panel.
    expect(decision.allowed === false && decision.reason).toContain('month at $')
  })

  test('refuses one oversized request even on a cold ledger', () => {
    // The per-request ceiling is what makes the cap survive an instance with
    // no history — and the in-process ledger means every new instance has
    // none. A runaway single call cannot be walked around by restarting.
    expect(readLedger('fresh', NOVEMBER).usd).toBe(0)

    const huge = checkSpend('fresh', STUDIO_MODEL, 900_000, 8_000, NOVEMBER, {})
    expect(huge.allowed).toBe(false)
    expect(huge.allowed === false && huge.reason).toContain('per-request ceiling')
    expect(projectRequestUsd(STUDIO_MODEL, 900_000, 8_000)).toBeGreaterThan(MAX_REQUEST_USD)
  })

  test('keeps one workspace’s spend out of another’s', () => {
    recordUsage(
      'noisy',
      STUDIO_MODEL,
      { inputTokens: 0, outputTokens: 2_000_000, cacheReadTokens: 0, cacheCreationTokens: 0 },
      NOVEMBER,
    )

    expect(checkSpend('noisy', STUDIO_MODEL, 1_000, 1_000, NOVEMBER, {}).allowed).toBe(false)
    expect(checkSpend('quiet', STUDIO_MODEL, 1_000, 1_000, NOVEMBER, {}).allowed).toBe(true)
  })

  test('starts the next month at zero without anything having to sweep', () => {
    recordUsage(
      'demo',
      STUDIO_MODEL,
      { inputTokens: 0, outputTokens: 2_000_000, cacheReadTokens: 0, cacheCreationTokens: 0 },
      NOVEMBER,
    )

    expect(monthKey(NOVEMBER)).toBe('2026-11')
    expect(monthKey(DECEMBER)).toBe('2026-12')
    expect(readLedger('demo', DECEMBER).usd).toBe(0)
    expect(checkSpend('demo', STUDIO_MODEL, 1_000, 1_000, DECEMBER, {}).allowed).toBe(true)
  })

  test('reads the cap from the environment, and ignores nonsense', () => {
    expect(monthlyCapUsd({})).toBe(DEFAULT_MONTHLY_CAP_USD)
    expect(monthlyCapUsd({ COPILOT_MONTHLY_CAP_USD: '5' })).toBe(5)
    // A typo must not become an unlimited budget.
    expect(monthlyCapUsd({ COPILOT_MONTHLY_CAP_USD: 'lots' })).toBe(DEFAULT_MONTHLY_CAP_USD)
    expect(monthlyCapUsd({ COPILOT_MONTHLY_CAP_USD: '-1' })).toBe(DEFAULT_MONTHLY_CAP_USD)
    expect(monthlyCapUsd({ COPILOT_MONTHLY_CAP_USD: '0' })).toBe(DEFAULT_MONTHLY_CAP_USD)
  })
})

describe('what the ledger records', () => {
  test('adds up without mutating what was there before', () => {
    const first = recordUsage(
      'demo',
      SITE_MODEL,
      { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheCreationTokens: 5 },
      NOVEMBER,
    )
    const second = recordUsage(
      'demo',
      SITE_MODEL,
      { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheCreationTokens: 5 },
      NOVEMBER,
    )

    expect(second.usage.inputTokens).toBe(200)
    expect(second.calls).toBe(2)
    // The earlier reading is untouched, per the house immutability rule.
    expect(first.usage.inputTokens).toBe(100)
    expect(first.calls).toBe(1)
  })

  test('says “spend this month” in the words the Agents screen already uses', () => {
    // §6: the co-pilot is "an eighth line there, not a separate dashboard".
    const ledger = readLedger('demo', NOVEMBER)
    expect(spendSummary(ledger, {})).toMatch(/^spend this month \$0\.00 of \$20\.00 in caps$/)
  })
})

describe('the cache-read share, which is the only symptom of a broken prefix', () => {
  test('is null before any call, because no calls is not a zero', () => {
    const ledger = readLedger('demo', NOVEMBER)
    expect(cacheReadShare(ledger)).toBeNull()
    expect(cacheHealth(ledger)).toContain('No calls yet')
  })

  test('reads zero loudly when nothing came from the cache', () => {
    // §6: "if it is zero across repeated questions, the corpus prefix is
    // being invalidated and the bill is several times what it should be. That
    // is the metric that catches it." There is no error to catch instead, so
    // the number has to say it in words.
    const ledger = recordUsage(
      'demo',
      SITE_MODEL,
      { inputTokens: 7_000, outputTokens: 200, cacheReadTokens: 0, cacheCreationTokens: 0 },
      NOVEMBER,
    )

    expect(cacheReadShare(ledger)).toBe(0)
    expect(cacheHealth(ledger)).toContain('prefix is being invalidated')
  })

  test('reports a healthy share once the prefix is being read', () => {
    const ledger = recordUsage(
      'demo',
      SITE_MODEL,
      { inputTokens: 100, outputTokens: 200, cacheReadTokens: 6_900, cacheCreationTokens: 0 },
      NOVEMBER,
    )

    expect(cacheReadShare(ledger)).toBeCloseTo(6_900 / 7_000, 5)
    expect(cacheHealth(ledger)).toMatch(/9\d% of input tokens came from the cache/)
  })
})

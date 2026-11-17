/**
 * The eighth line says true things, including when there is nothing to say.
 *
 * The failure this guards is the one 18 §6 describes without naming: a line
 * that reads "$0.00 spent, 0% from cache" is indistinguishable from a working
 * co-pilot that nobody has asked a question, and from a broken prefix that is
 * being rebuilt on every call. One of those needs acting on. So the zero and
 * the absence have to be different on the screen, and that is what is tested.
 */

import { afterEach, describe, expect, test } from 'vitest'

import { copilotCapUsd, copilotOperations } from './operations'
import { DEFAULT_MONTHLY_CAP_USD, recordUsage, resetLedgers, type Usage } from './spend'

const NOW = new Date('2026-11-15T00:00:00Z')

const NO_KEY = {} as const
const WITH_KEY = { ANTHROPIC_API_KEY: 'sk-ant-not-a-real-key-for-tests' } as const

function usage(overrides: Partial<Usage>): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    ...overrides,
  }
}

afterEach(() => {
  resetLedgers()
})

describe('the mode is never implied, only stated', () => {
  test('sample mode says nothing is spent, because nothing can be', () => {
    const line = copilotOperations('demo', NOW, NO_KEY)

    expect(line.mode).toBe('sample')
    expect(line.modeNote).toContain('nothing is spent')
    // The sentence the Agents screen already uses, in its own words (§6).
    expect(line.spend).toBe('spend this month $0.00 of $20.00 in caps')
  })

  test('live mode says a question is a real call', () => {
    const line = copilotOperations('demo', NOW, WITH_KEY)

    expect(line.mode).toBe('live')
    expect(line.modeNote).toContain('real call')
  })
})

describe('no calls is not the same as a broken cache', () => {
  test('before any question, the share is absent rather than zero', () => {
    const line = copilotOperations('quiet', NOW, WITH_KEY)

    expect(line.calls).toBe(0)
    // `null`, not `0`. A zero here would read as "the cache is not working".
    expect(line.cacheReadShare).toBeNull()
    expect(line.cacheNote).toContain('Not the same as a cache miss')
  })

  test('a working prefix reports the share it actually read', () => {
    // The shape of the live run on 15 November: a small question against a
    // large cached corpus.
    recordUsage(
      'demo',
      'claude-haiku-4-5',
      usage({ inputTokens: 200, outputTokens: 150, cacheReadTokens: 6_800 }),
      NOW,
    )

    const line = copilotOperations('demo', NOW, WITH_KEY)

    expect(line.calls).toBe(1)
    expect(line.cacheReadShare).toBeGreaterThan(0.9)
    expect(line.cacheNote).toMatch(/9\d% of input tokens came from the cache/)
  })

  test('a prefix being rebuilt every time says so in words that can be acted on', () => {
    // No cache reads at all, across a real call. This is the symptom §6 asks
    // to be watched for, and it has no error attached to it anywhere else.
    recordUsage('demo', 'claude-haiku-4-5', usage({ inputTokens: 7_000, outputTokens: 150 }), NOW)

    const line = copilotOperations('demo', NOW, WITH_KEY)

    expect(line.calls).toBe(1)
    expect(line.cacheReadShare).toBe(0)
    expect(line.cacheNote).toContain('paying full price for the whole corpus')
  })
})

describe('one workspace cannot read another’s spend', () => {
  test('the public bot’s month does not appear on a client’s screen', () => {
    recordUsage(
      'public-site',
      'claude-haiku-4-5',
      usage({ inputTokens: 100_000, outputTokens: 50_000 }),
      NOW,
    )

    // The studio screen asks for `demo` and gets `demo`. A client seeing the
    // public site's bill would be a privacy leak dressed as a KPI.
    expect(copilotOperations('demo', NOW, WITH_KEY).spend).toBe(
      'spend this month $0.00 of $20.00 in caps',
    )
    expect(copilotOperations('public-site', NOW, WITH_KEY).calls).toBe(1)
  })
})

describe('the cap the share is measured against', () => {
  test('defaults to the documented figure and follows the override', () => {
    expect(copilotCapUsd({})).toBe(DEFAULT_MONTHLY_CAP_USD)
    expect(copilotCapUsd({ COPILOT_MONTHLY_CAP_USD: '5' })).toBe(5)
  })
})

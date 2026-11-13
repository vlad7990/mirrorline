import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  AUDIENCE_PARAM,
  type AccountChoice,
  DEFAULT_CHOICE,
  GOALS,
  STAGE_PARAM,
  STORAGE_KEY,
  parseChoiceFromParams,
  readStoredChoice,
  suggestedPlanId,
  withChoiceParams,
  writeStoredChoice,
} from './account-type'

/** Replaces `window.localStorage` for one test. */
function stubStorage(implementation: Partial<Storage>): void {
  vi.stubGlobal('window', { localStorage: implementation })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseChoiceFromParams', () => {
  test('reads a complete, valid pair', () => {
    const params = { [AUDIENCE_PARAM]: 'individual', [STAGE_PARAM]: 'new' }

    expect(parseChoiceFromParams(params)).toEqual({ audience: 'individual', stage: 'new' })
  })

  test('returns null when only half the choice is present', () => {
    expect(parseChoiceFromParams({ [AUDIENCE_PARAM]: 'business' })).toBeNull()
  })

  test('returns null for an unrecognised value rather than guessing', () => {
    const params = { [AUDIENCE_PARAM]: 'coach', [STAGE_PARAM]: 'existing' }

    expect(parseChoiceFromParams(params)).toBeNull()
  })

  test('takes the first value when a param repeats', () => {
    const params = { [AUDIENCE_PARAM]: ['individual', 'business'], [STAGE_PARAM]: 'new' }

    expect(parseChoiceFromParams(params)?.audience).toBe('individual')
  })
})

describe('readStoredChoice', () => {
  test('reads back what writeStoredChoice wrote', () => {
    const choice: AccountChoice = { audience: 'individual', stage: 'new' }
    const store = new Map<string, string>()
    stubStorage({
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    })

    writeStoredChoice(choice)

    expect(store.get(STORAGE_KEY)).toBe('{"audience":"individual","stage":"new"}')
    expect(readStoredChoice()).toEqual(choice)
  })

  test('returns null when storage throws, instead of propagating', () => {
    // Safari private mode and blocked-storage settings both throw on access.
    // A marketing page must not white-screen because of it.
    stubStorage({
      getItem: () => {
        throw new Error('SecurityError')
      },
    })

    expect(readStoredChoice()).toBeNull()
  })

  test('returns null for stored JSON we did not write', () => {
    stubStorage({ getItem: () => '{"audience":"coach","stage":"new"}' })

    expect(readStoredChoice()).toBeNull()
  })

  test('returns null for text that is not JSON at all', () => {
    stubStorage({ getItem: () => 'not json' })

    expect(readStoredChoice()).toBeNull()
  })

  test('writeStoredChoice swallows a storage failure', () => {
    stubStorage({
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })

    expect(() => writeStoredChoice(DEFAULT_CHOICE)).not.toThrow()
  })
})

describe('withChoiceParams', () => {
  test('adds the pair to a bare path', () => {
    expect(withChoiceParams('/pricing', { audience: 'business', stage: 'new' })).toBe(
      '/pricing?who=business&account=new',
    )
  })

  test('appends to an existing query string', () => {
    expect(withChoiceParams('/pricing?plan=growth', DEFAULT_CHOICE)).toBe(
      '/pricing?plan=growth&who=business&account=existing',
    )
  })

  test('keeps a hash at the end, where a browser expects it', () => {
    expect(withChoiceParams('/#upload', DEFAULT_CHOICE)).toBe(
      '/?who=business&account=existing#upload',
    )
  })
})

describe('suggestedPlanId', () => {
  test('a business is offered the pilot, whichever account state it is in', () => {
    expect(suggestedPlanId({ audience: 'business', stage: 'new' })).toBe('pilot')
    expect(suggestedPlanId({ audience: 'business', stage: 'existing' })).toBe('pilot')
  })

  test('an individual with an audience is offered Creator, one starting out Studio', () => {
    expect(suggestedPlanId({ audience: 'individual', stage: 'existing' })).toBe('creator')
    expect(suggestedPlanId({ audience: 'individual', stage: 'new' })).toBe('studio')
  })
})

describe('GOALS', () => {
  test('carries the seven goals from 15 §2, no more and no fewer', () => {
    expect(GOALS).toHaveLength(7)
  })

  test('every goal has a headline KPI, so none renders an empty metric', () => {
    for (const goal of GOALS) {
      expect(goal.headlineKpi.length).toBeGreaterThan(0)
    }
  })

  test('no goal is named after an industry', () => {
    // 10_SALES_FOCUS.md §1: segmentation is by account type and goal only.
    const industryWords = /coach|clinic|dentist|gym|salon|restaurant|real estate|law|contractor/i

    for (const goal of GOALS) {
      expect(goal.label).not.toMatch(industryWords)
    }
  })
})

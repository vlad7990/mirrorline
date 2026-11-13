/**
 * The studio metrics layer's rules, held by assertion rather than by comment.
 *
 * Several of these exist because the honest branch is the one that looks
 * broken: an account with no KPIs, a brand with no progress bar, a custom KPI
 * with no figure. Each is the correct rendering of "we have not measured
 * this", and each is one careless default away from becoming a zero.
 */

import { describe, expect, test } from 'vitest'

import { KPI_DEFINITIONS } from '@/components/kpi/sample-dashboard'

import { ACCOUNT_METRICS, CONNECTED_ACCOUNT_METRICS, WORKSPACE_LEADS } from './accounts'
import { SAMPLE_CASCADE, SAMPLE_CUSTOM_KPIS, type KeyResult, keyResultPace } from './cascade'
import {
  ALERT_WEEKS_THRESHOLD,
  RAISED_ALERTS,
  SAMPLE_ALERTS,
  SAMPLE_FORMAT_RANKING,
  isAlertWorthRaising,
} from './insights'
import { PORTFOLIO_TOTALS, SAMPLE_PORTFOLIO, hasAgreedTarget } from './portfolio'
import {
  DEFAULT_RESULTS_TAB,
  RESULTS_TABS,
  parseResultsTab,
  resultsTabHref,
} from './results-tabs'

const KPI_KEYS = new Set(KPI_DEFINITIONS.map((definition) => definition.key))

function keyResult(overrides: Partial<KeyResult>): KeyResult {
  return {
    id: 'kr-test',
    kpiKey: 'leads',
    label: 'Leads',
    baseline: 0,
    target: 100,
    current: 50,
    unitLabel: 'leads',
    basis: 'test',
    due: 'end of quarter',
    ...overrides,
  }
}

describe('the goal cascade', () => {
  test('every key result names a KPI that exists', () => {
    // Arrange
    const keys = SAMPLE_CASCADE.objectives.flatMap((objective) =>
      objective.keyResults.map((result) => result.kpiKey),
    )

    // Act & Assert
    for (const key of keys) {
      expect(KPI_KEYS.has(key)).toBe(true)
    }
  })

  test('every key result states where its target came from', () => {
    const results = SAMPLE_CASCADE.objectives.flatMap((objective) => objective.keyResults)

    for (const result of results) {
      // 15 §1: a target with no stated basis reads as a promise.
      expect(result.basis.length).toBeGreaterThan(0)
    }
  })

  test('reports ahead of pace when progress outruns the period', () => {
    expect(keyResultPace(keyResult({ current: 80 }), 0.5)).toBe('ahead')
  })

  test('reports behind pace when progress trails the period', () => {
    expect(keyResultPace(keyResult({ current: 20 }), 0.5)).toBe('behind')
  })

  test('treats a small gap as on pace rather than flipping week to week', () => {
    expect(keyResultPace(keyResult({ current: 52 }), 0.5)).toBe('on-pace')
  })

  test('does not report ahead of pace when a key result asks for no movement', () => {
    // A zero span would divide to Infinity and paint the card green for free.
    expect(keyResultPace(keyResult({ baseline: 10, target: 10, current: 10 }), 0.5)).toBe('on-pace')
  })
})

describe('custom KPIs', () => {
  test('an unfilled custom KPI holds null, never a zero', () => {
    const unfilled = SAMPLE_CUSTOM_KPIS.find((kpi) => kpi.key === 'custom_walk_ins')

    expect(unfilled?.current).toBeNull()
    expect(unfilled?.lastEntry).toBeNull()
  })

  test('every custom KPI records how its figures arrive', () => {
    for (const kpi of SAMPLE_CUSTOM_KPIS) {
      expect(['manual', 'csv']).toContain(kpi.entry)
    }
  })
})

describe('per-account metrics', () => {
  test('an account that is not connected carries no KPIs at all', () => {
    const notConnected = ACCOUNT_METRICS.filter((entry) => entry.account.status === 'not-connected')

    expect(notConnected.length).toBeGreaterThan(0)
    for (const entry of notConnected) {
      expect(entry.kpis).toHaveLength(0)
      expect(entry.leadShare).toBeNull()
    }
  })

  test('the connected accounts’ leads add up to the workspace total', () => {
    const total = CONNECTED_ACCOUNT_METRICS.reduce((sum, entry) => {
      const leads = entry.kpis.find((kpi) => kpi.definition.key === 'leads')
      return sum + (leads?.value.state === 'measured' ? leads.value.value : 0)
    }, 0)

    // A dashboard whose parts do not sum to its whole teaches the reader not
    // to trust either number.
    expect(total).toBe(WORKSPACE_LEADS)
  })

  test('every account KPI names a definition that exists', () => {
    for (const entry of ACCOUNT_METRICS) {
      for (const kpi of entry.kpis) {
        expect(KPI_KEYS.has(kpi.definition.key)).toBe(true)
      }
    }
  })
})

describe('alerts', () => {
  test('raises an alert only after two periods off track', () => {
    const first = SAMPLE_ALERTS[0]
    expect(first).toBeDefined()
    const oneWeek = { ...first!, weeksOffTrack: 1 }

    expect(isAlertWorthRaising(oneWeek)).toBe(false)
    expect(isAlertWorthRaising({ ...oneWeek, weeksOffTrack: ALERT_WEEKS_THRESHOLD })).toBe(true)
  })

  test('every raised alert names a KPI that exists', () => {
    for (const alert of RAISED_ALERTS) {
      expect(KPI_KEYS.has(alert.kpiKey)).toBe(true)
    }
  })
})

describe('the content leaderboard', () => {
  test('ranks by the goal-side measure rather than by views', () => {
    const sends = SAMPLE_FORMAT_RANKING.map((format) => format.sendsPer1k)
    const descending = [...sends].sort((a, b) => b - a)

    // 15 §5 tab 3: "top posts by the user's goal, not by views".
    expect(sends).toEqual(descending)
  })
})

describe('the Results tabs', () => {
  test('carries the seven tabs 15 §5 names, in its order', () => {
    expect(RESULTS_TABS.map((tab) => tab.label)).toEqual([
      'Overview',
      'Funnel',
      'Content',
      'Accounts',
      'Goals and KPIs',
      'Ledger',
      'Agent insights',
    ])
  })

  test('falls back to Overview for a stale or hand-edited tab', () => {
    // A bad link should land the reader on their dashboard, not on an error.
    expect(parseResultsTab('nonsense')).toBe(DEFAULT_RESULTS_TAB)
    expect(parseResultsTab(undefined)).toBe(DEFAULT_RESULTS_TAB)
  })

  test('reads the first value when a parameter repeats', () => {
    expect(parseResultsTab(['ledger', 'funnel'])).toBe('ledger')
  })

  test('gives the default tab the bare path, so each screen has one URL', () => {
    expect(resultsTabHref('overview')).toBe('/app/results')
    expect(resultsTabHref('ledger')).toBe('/app/results?tab=ledger')
  })
})

describe('the portfolio', () => {
  test('a brand still inside its baseline has no agreed target', () => {
    const baselining = SAMPLE_PORTFOLIO.find((brand) => brand.periodElapsed === null)

    expect(baselining).toBeDefined()
    expect(hasAgreedTarget(baselining!)).toBe(false)
  })

  test('totals are sums of the brands rather than averages', () => {
    expect(PORTFOLIO_TOTALS.brands).toBe(SAMPLE_PORTFOLIO.length)
    expect(PORTFOLIO_TOTALS.accounts).toBe(
      SAMPLE_PORTFOLIO.reduce((sum, brand) => sum + brand.accountCount, 0),
    )
  })

  test('every brand keeps its own goal rather than sharing one', () => {
    const goals = new Set(SAMPLE_PORTFOLIO.map((brand) => brand.goalKey))

    expect(goals.size).toBeGreaterThan(1)
  })
})

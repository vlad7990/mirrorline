/**
 * The studio metrics layer's rules, held by assertion rather than by comment.
 *
 * Several of these exist because the honest branch is the one that looks
 * broken: an account with no KPIs, a brand with no progress bar, a custom KPI
 * with no figure. Each is the correct rendering of "we have not measured
 * this", and each is one careless default away from becoming a zero.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { workspace } from '@mirrorline/mock'
import { describe, expect, test } from 'vitest'

import { KPI_DEFINITIONS } from '@/components/kpi/sample-dashboard'

import { ACCOUNT_METRICS, CONNECTED_ACCOUNT_METRICS, WORKSPACE_LEADS } from './accounts'
import { SAMPLE_CASCADE, SAMPLE_CUSTOM_KPIS, type KeyResult, keyResultPace } from './cascade'
import {
  ALERT_WEEKS_THRESHOLD,
  type ConnectionAlert,
  RAISED_ALERTS,
  SAMPLE_ALERTS,
  SAMPLE_FORMAT_RANKING,
  type TrendAlert,
  isAlertWorthRaising,
} from './insights'
import { PORTFOLIO_TOTALS, SAMPLE_PORTFOLIO, hasAgreedTarget, isCurrentBrand } from './portfolio'
import {
  DEFAULT_RESULTS_TAB,
  RESULTS_TABS,
  parseResultsTab,
  resultsTabHref,
} from './results-tabs'

const KPI_KEYS = new Set(KPI_DEFINITIONS.map((definition) => definition.key))

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

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
  const trend: TrendAlert = {
    kind: 'trend',
    id: 'alert-test-trend',
    kpiKey: 'leads',
    title: 'Leads behind',
    message: 'Behind target.',
    weeksOffTrack: 1,
  }

  const connection: ConnectionAlert = {
    kind: 'connection',
    id: 'alert-test-connection',
    kpiKey: 'posts_published',
    title: 'Instagram needs reconnecting',
    message: 'Nothing has published since.',
    since: '11 November',
  }

  test('raises a trend alert only after two periods off track', () => {
    expect(isAlertWorthRaising(trend)).toBe(false)
    expect(isAlertWorthRaising({ ...trend, weeksOffTrack: ALERT_WEEKS_THRESHOLD })).toBe(true)
  })

  test('raises a connection alert the day it happens', () => {
    // The bug this replaced: the two-week rule was applied to every alert, so
    // an account that disconnected today stayed silent for a fortnight while
    // nothing published. A connection alert has no week count to wait on.
    expect(isAlertWorthRaising(connection)).toBe(true)
  })

  test('the disconnection in the sample data is raised, not held back', () => {
    const raised = RAISED_ALERTS.find((alert) => alert.kind === 'connection')

    expect(raised).toBeDefined()
    expect(raised?.id).toBe('alert-reconnect-instagram')
  })

  test('a connection alert does not repeat the date it already carries', () => {
    // The UI writes the date once, from `since`. A message that also spells
    // it out says it twice in one alert and gives the date two sources of
    // truth — change `since` and the prose goes quietly stale.
    for (const alert of SAMPLE_ALERTS) {
      if (alert.kind !== 'connection') continue

      expect(
        alert.message.includes(alert.since),
        `${alert.id} repeats "${alert.since}" in its message; the timing note already says it`,
      ).toBe(false)
    }
  })

  test('every raised alert names a KPI that exists', () => {
    for (const alert of RAISED_ALERTS) {
      expect(KPI_KEYS.has(alert.kpiKey)).toBe(true)
    }
  })

  test('the alerts table enforces the same timing rule as the app', () => {
    // Two copies of a rule is a drift waiting to happen, and this one would
    // drift silently: a metrics job writing straight to the database bypasses
    // `isAlertWorthRaising` entirely.
    const sql = readFileSync(
      path.join(REPO_ROOT, 'supabase/migrations/20261113120000_metrics_and_goals.sql'),
      'utf8',
    )

    expect(sql).toMatch(/constraint alerts_timing_matches_kind check/)
    // A trend alert needs its two weeks and no break date; a connection alert
    // needs the break date and no week count.
    expect(sql).toMatch(/kind = 'trend' and weeks_off_track >= 2 and broken_since is null/)
    expect(sql).toMatch(
      /kind = 'connection' and weeks_off_track is null and broken_since is not null/,
    )
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
    const goals = SAMPLE_PORTFOLIO.map((brand) => brand.goalKey)

    // Not "more than one" — every brand. Two of three sharing a goal would
    // still pass a size check and would still be the wrong screen.
    expect(new Set(goals).size).toBe(SAMPLE_PORTFOLIO.length)
  })

  test('every brand is a different trade', () => {
    // 16 §1: the product works for any business in any industry, and this is
    // the only screen that shows more than one business. It was three views
    // of one coaching business once; an edit that made them one trade again
    // would pass every other check in the repo, so it fails here.
    const niches = SAMPLE_PORTFOLIO.map((brand) => brand.niche.toLowerCase())

    expect(new Set(niches).size).toBe(SAMPLE_PORTFOLIO.length)
    for (const niche of niches) {
      expect(niche.length).toBeGreaterThan(0)
    }
  })

  test('no two brands share a word in their trade', () => {
    // "Coaching" and "Business coaching" are different strings and the same
    // industry. Comparing the words catches that; comparing the strings does
    // not.
    const wordsPerBrand = SAMPLE_PORTFOLIO.map(
      (brand) =>
        new Set(
          brand.niche
            .toLowerCase()
            .split(/[^a-z]+/)
            .filter(Boolean),
        ),
    )

    for (const [index, words] of wordsPerBrand.entries()) {
      for (const [otherIndex, otherWords] of wordsPerBrand.entries()) {
        if (index >= otherIndex) continue
        const shared = [...words].filter((word) => otherWords.has(word))

        expect(
          shared,
          `${SAMPLE_PORTFOLIO[index]?.name} and ${SAMPLE_PORTFOLIO[otherIndex]?.name} share "${shared.join(', ')}"`,
        ).toEqual([])
      }
    }
  })

  test('includes the signed-in workspace, and only once', () => {
    // The switcher and the portfolio both decide "you are here" from this, so
    // zero matches would leave neither highlighting anything, and two would
    // have them highlighting different brands.
    const current = SAMPLE_PORTFOLIO.filter(isCurrentBrand)

    expect(current).toHaveLength(1)
    expect(current[0]?.name).toBe(workspace.name)
  })
})

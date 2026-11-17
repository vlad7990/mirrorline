import { describe, expect, test } from 'vitest'

import { KPI_TIERS, changeTone, formatChange, formatFreshness, formatKpiValue } from './kpi-types'
import { KPI_DEFINITIONS, SAMPLE_KPIS, SAMPLE_NOW } from './sample-dashboard'

describe('KPI tiers', () => {
  test('there are the seven from 15 §3, numbered in order', () => {
    expect(KPI_TIERS).toHaveLength(7)
    expect(KPI_TIERS.map((tier) => tier.number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  test('every tier names where its numbers come from', () => {
    // 15 §3: each KPI shows its source. A tier with no source would leave
    // every card under it unable to say where the figure came from.
    for (const tier of KPI_TIERS) {
      expect(tier.source.length).toBeGreaterThan(0)
    }
  })
})

describe('formatKpiValue', () => {
  test('groups thousands in counts', () => {
    expect(formatKpiValue(48300, 'count')).toBe('48,300')
  })

  test('keeps one decimal on percentages and drops a trailing zero', () => {
    expect(formatKpiValue(48.24, 'percent')).toBe('48.2%')
    expect(formatKpiValue(94, 'percent')).toBe('94%')
  })

  test('rounds currency to whole units', () => {
    expect(formatKpiValue(41.4, 'currency')).toBe('$41')
  })

  test('writes days in words so "1 days" never ships', () => {
    expect(formatKpiValue(1, 'days')).toBe('1 day')
    expect(formatKpiValue(2.5, 'days')).toBe('2.5 days')
  })
})

describe('formatChange', () => {
  test('signs a rise and a fall', () => {
    expect(formatChange(0.18)).toBe('+18%')
    expect(formatChange(-0.04)).toBe('−4%')
  })

  test('uses a true minus sign, not a hyphen', () => {
    // It sits in tabular figures beside a number; a hyphen is narrower and
    // sits at the wrong height.
    expect(formatChange(-0.04).startsWith('−')).toBe(true)
    expect(formatChange(-0.04).startsWith('-')).toBe(false)
  })

  test('drops the sign when nothing moved', () => {
    expect(formatChange(0)).toBe('0%')
  })
})

describe('changeTone', () => {
  test('a rise is good when up is good', () => {
    expect(changeTone(0.18, 'up')).toBe('up')
    expect(changeTone(-0.18, 'up')).toBe('down')
  })

  test('a fall is good when down is good', () => {
    // Cost per lead and days-to-first-post improve by falling. Colouring
    // their fall red would tell the user they are losing while they are
    // winning.
    expect(changeTone(-0.18, 'down')).toBe('up')
    expect(changeTone(0.18, 'down')).toBe('down')
  })

  test('a tiny move is flat, so the arrow does not flicker week to week', () => {
    expect(changeTone(0.001, 'up')).toBe('flat')
  })
})

describe('formatFreshness', () => {
  const now = new Date('2026-11-13T09:00:00Z')

  test('counts minutes, hours and days', () => {
    expect(formatFreshness('2026-11-13T08:30:00Z', now)).toBe('updated 30m ago')
    expect(formatFreshness('2026-11-13T07:00:00Z', now)).toBe('updated 2h ago')
    expect(formatFreshness('2026-11-11T09:00:00Z', now)).toBe('updated 2d ago')
  })

  test('says "just now" rather than "0m ago"', () => {
    expect(formatFreshness('2026-11-13T09:00:00Z', now)).toBe('updated just now')
  })

  test('degrades to a vague phrase rather than NaN on a bad timestamp', () => {
    expect(formatFreshness('not a date', now)).toBe('updated recently')
  })
})

describe('the sample dashboard keeps 15 §8 honest', () => {
  test('every definition has a formula and a source a user could read', () => {
    for (const item of KPI_DEFINITIONS) {
      expect(item.formula.length, item.key).toBeGreaterThan(10)
      expect(item.source.length, item.key).toBeGreaterThan(0)
    }
  })

  test('definition keys are unique', () => {
    const keys = KPI_DEFINITIONS.map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('shows a not-connected KPI rather than a zero', () => {
    // The rule this guards: a zero is a claim about a number nobody measured.
    const notConnected = SAMPLE_KPIS.filter((kpi) => kpi.value.state === 'not-connected')

    expect(notConnected.length).toBeGreaterThan(0)
    for (const kpi of notConnected) {
      expect(
        kpi.value.state === 'not-connected' && kpi.value.missingSource.length,
      ).toBeGreaterThan(0)
    }
  })

  test('labels its projection with what it is based on', () => {
    const projected = SAMPLE_KPIS.filter((kpi) => kpi.value.state === 'projected')

    expect(projected.length).toBeGreaterThan(0)
    for (const kpi of projected) {
      expect(kpi.value.state === 'projected' && kpi.value.basis.length).toBeGreaterThan(0)
    }
  })

  test('no measured KPI is stamped in the future', () => {
    for (const kpi of SAMPLE_KPIS) {
      if (kpi.value.state !== 'measured') continue
      expect(new Date(kpi.value.capturedAt).getTime(), kpi.definition.key).toBeLessThanOrEqual(
        SAMPLE_NOW.getTime(),
      )
    }
  })

  test('every target states its basis, so no number reads as a promise', () => {
    for (const kpi of SAMPLE_KPIS) {
      if (!kpi.target) continue
      expect(kpi.target.basis, kpi.definition.key).not.toMatch(/guarantee|promise|will/i)
      expect(kpi.target.basis.length).toBeGreaterThan(0)
    }
  })
})

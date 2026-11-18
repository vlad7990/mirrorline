import { describe, expect, test } from 'vitest'

import {
  buildGoalCascade,
  type CascadeRows,
  MAX_TARGET,
  parseTargetInput,
  periodElapsed,
} from './goal-cascade'

/**
 * The mapper from database rows to the shape the Goals screen renders.
 *
 * Two things here are worth more than the plumbing. First, **an unmeasured key
 * result stays unmeasured** — `metric_snapshots` is empty until B6 ingests
 * anything, and the temptation to default `current` to `0` or to the baseline
 * is exactly the invented figure non-negotiable 7 forbids. Second, the period
 * maths decides whether somebody is told they are behind, so it is worth
 * pinning rather than eyeballing.
 */

const GOAL = {
  id: 'g1',
  goal_type: 'leads',
  outcome_text: 'Get more customers from short video',
  period: 'quarter',
  created_at: '2026-10-07T00:00:00.000Z',
}

const ROWS: CascadeRows = {
  goal: GOAL,
  objectives: [{ id: 'o1', goal_id: 'g1', text: 'Publish daily', position: 0 }],
  keyResults: [
    {
      id: 'k1',
      objective_id: 'o1',
      kpi_key: 'leads_per_week',
      baseline: 10,
      target: 40,
      basis: '14-day baseline + niche benchmarks',
      due: '2027-01-06',
    },
  ],
  kpiDefinitions: [{ key: 'leads_per_week', name: 'Leads per week', unit: 'count' }],
  latestByKpi: {},
}

const NOW = new Date('2026-11-18T00:00:00.000Z')

describe('buildGoalCascade', () => {
  test('returns null when the workspace has no goal yet', () => {
    // Onboarding writes the goal, so this is a real state: signed up, wizard
    // not finished. The screen shows its empty state rather than a blank one.
    expect(buildGoalCascade({ ...ROWS, goal: null }, NOW)).toBeNull()
  })

  test('carries the outcome through in the user’s own words', () => {
    const cascade = buildGoalCascade(ROWS, NOW)

    expect(cascade?.outcome).toBe('Get more customers from short video')
    expect(cascade?.goalKey).toBe('leads')
  })

  test('leaves current null when nothing has measured the key result', () => {
    // The whole point. `latestByKpi` is empty because `metric_snapshots` is
    // empty, and the honest answer is "we have not read this account yet".
    const cascade = buildGoalCascade(ROWS, NOW)
    const keyResult = cascade?.objectives[0]?.keyResults[0]

    expect(keyResult?.current).toBeNull()
    expect(keyResult?.baseline).toBe(10)
    expect(keyResult?.target).toBe(40)
  })

  test('uses the latest measurement when one exists', () => {
    const cascade = buildGoalCascade({ ...ROWS, latestByKpi: { leads_per_week: 26 } }, NOW)

    expect(cascade?.objectives[0]?.keyResults[0]?.current).toBe(26)
  })

  test('names the key result from its KPI definition rather than inventing one', () => {
    const cascade = buildGoalCascade(ROWS, NOW)

    expect(cascade?.objectives[0]?.keyResults[0]?.label).toBe('Leads per week')
  })

  test('falls back to the raw kpi_key when no definition is present', () => {
    // A key result referencing a KPI we have no definition for is a data
    // problem, not a reason to drop the row from somebody's goal. Showing the
    // key is ugly and truthful; hiding the row would be neither.
    const cascade = buildGoalCascade({ ...ROWS, kpiDefinitions: [] }, NOW)

    expect(cascade?.objectives[0]?.keyResults[0]?.label).toBe('leads_per_week')
  })

  test('orders objectives by position, not by insertion', () => {
    const cascade = buildGoalCascade(
      {
        ...ROWS,
        objectives: [
          { id: 'o2', goal_id: 'g1', text: 'Second', position: 1 },
          { id: 'o1', goal_id: 'g1', text: 'First', position: 0 },
        ],
      },
      NOW,
    )

    expect(cascade?.objectives.map((o) => o.text)).toEqual(['First', 'Second'])
  })

  test('keeps an objective with no key results rather than dropping it', () => {
    // An objective the Analyst has not yet proposed measurements for is still
    // something the user wrote down.
    const cascade = buildGoalCascade({ ...ROWS, keyResults: [] }, NOW)

    expect(cascade?.objectives).toHaveLength(1)
    expect(cascade?.objectives[0]?.keyResults).toEqual([])
  })
})

describe('periodElapsed', () => {
  test('is 0 on the first day and approaches 1 at the end of a quarter', () => {
    const start = new Date('2026-10-07T00:00:00.000Z')

    expect(periodElapsed('quarter', start, start)).toBe(0)
    // 42 of 91 days.
    expect(periodElapsed('quarter', start, NOW)).toBeCloseTo(42 / 91, 5)
  })

  test('clamps rather than exceeding 1 once the period has run out', () => {
    // A quarter that ended months ago is 100% elapsed, not 300%, or the pace
    // maths would paint every key result "behind" forever.
    const start = new Date('2026-01-01T00:00:00.000Z')

    expect(periodElapsed('quarter', start, NOW)).toBe(1)
  })

  test('never goes below zero if a clock disagrees', () => {
    const start = new Date('2026-12-01T00:00:00.000Z')

    expect(periodElapsed('quarter', start, NOW)).toBe(0)
  })

  test('understands month and year periods too', () => {
    const start = new Date('2026-11-01T00:00:00.000Z')

    // 17 of 30 days.
    expect(periodElapsed('month', start, NOW)).toBeCloseTo(17 / 30, 5)
    // 17 of 365.
    expect(periodElapsed('year', start, NOW)).toBeCloseTo(17 / 365, 5)
  })

  test('treats an unrecognised period as a quarter rather than dividing by zero', () => {
    const start = new Date('2026-10-07T00:00:00.000Z')

    expect(periodElapsed('fortnight', start, NOW)).toBeCloseTo(42 / 91, 5)
  })
})

describe('parseTargetInput', () => {
  test('accepts a plain number and a decimal', () => {
    expect(parseTargetInput('40')).toEqual({ ok: true, value: 40 })
    expect(parseTargetInput('  12.5 ')).toEqual({ ok: true, value: 12.5 })
  })

  test('accepts zero, which is a real target for a rate we want gone', () => {
    expect(parseTargetInput('0')).toEqual({ ok: true, value: 0 })
  })

  test('refuses an empty box rather than storing nothing as zero', () => {
    expect(parseTargetInput('').ok).toBe(false)
    expect(parseTargetInput('   ').ok).toBe(false)
  })

  test('refuses words', () => {
    // `Number('forty')` is NaN, and a NaN reaching `numeric` is a 400 from
    // PostgREST rather than a sentence the person can act on.
    expect(parseTargetInput('forty').ok).toBe(false)
  })

  test('refuses a negative rather than quietly clamping it to zero', () => {
    const result = parseTargetInput('-40')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/negative/i)
  })

  test('refuses an implausible figure that is almost certainly a typo', () => {
    expect(parseTargetInput(String(MAX_TARGET + 1)).ok).toBe(false)
    expect(parseTargetInput(String(MAX_TARGET)).ok).toBe(true)
  })

  test('refuses a non-string without throwing', () => {
    expect(parseTargetInput(undefined).ok).toBe(false)
    expect(parseTargetInput(null).ok).toBe(false)
  })
})

/**
 * The goal picker's honesty rules, as assertions.
 *
 * 15 §8 says a dashboard never shows a zero for something nobody measured and
 * never mixes a projection into an actual. On a marketing page that rule is
 * easiest to break by accident: a preview is tempting to make look healthy,
 * and dropping the not-connected card would make every goal look better. So
 * the two awkward states are required in all seven sets and the suite says so.
 */

import { describe, expect, it } from 'vitest'

import { SAMPLE_KPIS } from '@/components/kpi/sample-dashboard'
import { GOALS } from '@/lib/audience/account-type'

import { GOAL_KEYS, GOAL_VIEWS, NOT_CONNECTED_KEY, PROJECTED_KEY } from './goal-picker-content'

const views = Object.entries(GOAL_VIEWS)

describe('GOAL_VIEWS', () => {
  it('covers all seven goals and invents none', () => {
    // Arrange
    const defined = Object.keys(GOAL_VIEWS).sort()

    // Assert
    expect(defined).toEqual([...GOAL_KEYS].sort())
    expect(GOALS).toHaveLength(7)
  })

  it.each(views)('%s names only KPIs the sample account actually has', (_key, view) => {
    const available = new Set(SAMPLE_KPIS.map((kpi) => kpi.definition.key))

    for (const key of view.kpiKeys) {
      expect(available.has(key)).toBe(true)
    }
  })

  it.each(views)('%s keeps a not-connected KPI', (_key, view) => {
    // 15 §8. Dropping this is the single easiest way to make the preview
    // look better than the product, which is what the rule exists to stop.
    expect(view.kpiKeys).toContain(NOT_CONNECTED_KEY)
  })

  it.each(views)('%s keeps a labelled projection', (_key, view) => {
    expect(view.kpiKeys).toContain(PROJECTED_KEY)
  })

  it('the two awkward states really are what the fixture says they are', () => {
    // Guards the assumption the two tests above rest on: if someone later
    // connects `bookings` in the fixture, those tests would still pass while
    // asserting nothing.
    const find = (key: string) => SAMPLE_KPIS.find((kpi) => kpi.definition.key === key)

    expect(find(NOT_CONNECTED_KEY)?.value.state).toBe('not-connected')
    expect(find(PROJECTED_KEY)?.value.state).toBe('projected')
  })

  it.each(views)('%s shows four cards, with no repeats', (_key, view) => {
    expect(view.kpiKeys).toHaveLength(4)
    expect(new Set(view.kpiKeys).size).toBe(4)
  })

  it.each(views)('%s says where its targets come from', (_key, view) => {
    // 15 §1: a target is a proposal with a stated basis, never a promise.
    expect(view.targetBasis.trim().length).toBeGreaterThan(20)
    expect(view.targetBasis.toLowerCase()).not.toContain('guarantee')
  })

  it('judges different goals at different points in the funnel', () => {
    // If every goal were judged at the same step the picker would be
    // decoration: the funnel is the part that shows a goal changes what
    // counts as success.
    const steps = new Set(views.map(([, view]) => view.funnelStep))

    expect(steps.size).toBeGreaterThan(1)
  })
})

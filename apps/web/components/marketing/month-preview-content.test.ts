/**
 * The month preview draws whatever this function returns, so the arithmetic
 * is pinned here rather than inspected in a screenshot.
 *
 * The property that matters most is the first one: the picture must add up to
 * the number printed beside it. A calendar showing 89 dots next to the words
 * "90 posts a month" is the kind of small dishonesty nobody notices and
 * nobody can defend.
 */

import { describe, expect, it } from 'vitest'

import { busiestDay, distributePosts } from './month-preview-content'
import { PRICING_TIERS } from './pricing-tiers'

describe('distributePosts', () => {
  it('draws exactly as many posts as the plan claims', () => {
    // Arrange: Creator, 40 posts across 30 days — the one that does not
    // divide evenly.
    const total = 40
    const days = 30

    // Act
    const distribution = distributePosts(total, days)

    // Assert
    expect(distribution).toHaveLength(days)
    expect(distribution.reduce((sum, count) => sum + count, 0)).toBe(total)
  })

  it('spreads a remainder rather than piling it on one day', () => {
    // 40 over 30 is ten days of two and twenty of one, not one day of eleven.
    const distribution = distributePosts(40, 30)

    expect(busiestDay(distribution)).toBe(2)
    expect(distribution.filter((count) => count === 2)).toHaveLength(10)
    expect(distribution.filter((count) => count === 1)).toHaveLength(20)
  })

  it('divides evenly when it can', () => {
    // Growth: 90 over 30 is three a day, every day.
    expect(distributePosts(90, 30).every((count) => count === 3)).toBe(true)
  })

  it('handles a fortnight as readily as a month', () => {
    // Pilot: 12 videos over 14 days. Two quiet days, not a short month.
    const distribution = distributePosts(12, 14)

    expect(distribution).toHaveLength(14)
    expect(distribution.filter((count) => count === 1)).toHaveLength(12)
    expect(distribution.filter((count) => count === 0)).toHaveLength(2)
  })

  it('draws nothing for a plan with no volume', () => {
    // Not an empty month — no month at all. The caller renders neither.
    expect(distributePosts(0, 30)).toEqual([])
  })

  it('refuses a period with no days rather than dividing by zero', () => {
    expect(distributePosts(90, 0)).toEqual([])
  })

  it('adds up for every plan that has a volume', () => {
    // The invariant across the real data, not just the hand-picked cases.
    for (const tier of PRICING_TIERS) {
      if (tier.postsInPeriod === null) continue
      const distribution = distributePosts(tier.postsInPeriod, tier.days)
      expect(distribution.reduce((sum, count) => sum + count, 0)).toBe(tier.postsInPeriod)
    }
  })
})

describe('busiestDay', () => {
  it('is zero for an empty month', () => {
    expect(busiestDay([])).toBe(0)
  })

  it('finds the tallest day', () => {
    expect(busiestDay([1, 3, 2])).toBe(3)
  })
})

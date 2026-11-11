/**
 * The per-day figure has to be derived, never typed.
 *
 * repurpose.io leads with "$1.17/day" and puts "$35 billed monthly"
 * underneath (docs/design/COMPETITOR_REFERENCES.md §2.5). The framing is
 * worth borrowing on a retainer. The risk is not: a hand-written per-day
 * number is a second price that drifts from the first, and a pricing page
 * that contradicts itself is worse than one that never had the framing.
 *
 * So `perDayUsd` computes it, and these tests pin both the arithmetic and the
 * invariant that every sellable tier can actually produce one.
 */

import { describe, expect, it } from 'vitest'

import { PRICING_TIERS, SELLABLE_TIERS, perDayUsd } from './pricing-tiers'

function tier(id: string) {
  const found = PRICING_TIERS.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`no tier ${id}`)
  return found
}

describe('perDayUsd', () => {
  it('divides a two-week price by fourteen days', () => {
    // Arrange: Pilot is $750 for 2 weeks.
    const pilot = tier('pilot')

    // Act
    const perDay = perDayUsd(pilot)

    // Assert: 750 / 14 = 53.57, rounded to whole dollars.
    expect(perDay).toBe(54)
  })

  it('divides a monthly price by thirty days', () => {
    // Arrange
    const growth = tier('growth')

    // Act
    const perDay = perDayUsd(growth)

    // Assert: 1500 / 30.
    expect(perDay).toBe(50)
  })

  it('scales with the price', () => {
    // Assert: 3000 / 30. Twice Growth's volume, twice its daily rate.
    expect(perDayUsd(tier('scale'))).toBe(100)
  })

  it('returns null for a tier whose price is a range', () => {
    // Arrange: Studio is "$49 to $149" and is not sold yet.
    const studio = tier('studio')

    // Act
    const perDay = perDayUsd(studio)

    // Assert: no single number can honestly be shown, so none is.
    expect(perDay).toBeNull()
  })
})

describe('PRICING_TIERS', () => {
  it('gives every sellable tier a per-day figure', () => {
    // The pricing page prints one for each, so a tier that cannot produce
    // one would render a hole. Better to fail here than there.
    for (const sellable of SELLABLE_TIERS) {
      expect(perDayUsd(sellable), `${sellable.id} has no per-day figure`).not.toBeNull()
    }
  })

  it('keeps the display price and the numeric price in step', () => {
    // The two are written separately, so nothing but this stops them
    // disagreeing — which is exactly the drift the derived figure avoids.
    for (const candidate of PRICING_TIERS) {
      if (candidate.priceUsd === null) continue
      expect(candidate.price, `${candidate.id}`).toBe(
        `$${candidate.priceUsd.toLocaleString('en-US')}`,
      )
    }
  })

  it('prices the pilot higher per day than the month it leads into', () => {
    // Not a presentation detail: it is the argument for the monthly tier,
    // and the page says so. If a price change ever inverts it, the copy
    // becomes wrong and this test is what notices.
    const pilot = perDayUsd(tier('pilot'))
    const growth = perDayUsd(tier('growth'))

    expect(pilot).not.toBeNull()
    expect(growth).not.toBeNull()
    expect(Number(pilot)).toBeGreaterThan(Number(growth))
  })
})

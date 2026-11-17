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

describe('postsInPeriod', () => {
  /**
   * The volume is written twice — once as prose in `includes` and once as a
   * number for the month preview to draw. This is the assertion that makes
   * the duplication safe, and it is the same guarantee `price`/`priceUsd`
   * already has.
   *
   * It reads the digits back out of the prose on purpose. Parsing is the
   * wrong way to *render* the calendar, because it would make a sentence
   * load-bearing; it is exactly the right way to *check* it, because the
   * check should fail when the sentence and the number stop agreeing.
   */
  it.each(
    PRICING_TIERS.filter((candidate) => candidate.postsInPeriod !== null).map((candidate) => [
      candidate.id,
      candidate,
    ]),
  )('the number for %s matches the volume its own copy claims', (_id, candidate) => {
    // Arrange: the line that states a post or video count.
    const volumeLine = candidate.includes.find((line) => /\d+\s+(posts|videos)/.test(line))

    // Act
    const claimed = Number(volumeLine?.match(/(\d+)\s+(?:posts|videos)/)?.[1])

    // Assert
    expect(volumeLine).toBeDefined()
    expect(claimed).toBe(candidate.postsInPeriod)
  })

  it('draws no month for a plan nobody can buy', () => {
    // Studio is a waitlist. A calendar full of posts for it would be a
    // picture of something that does not happen.
    expect(tier('studio').postsInPeriod).toBeNull()
  })

  it('never claims more posts a day than the largest plan delivers', () => {
    // Six a day is the most any plan promises (Scale). A tier above that
    // would be a volume we have never said we can produce.
    for (const candidate of PRICING_TIERS) {
      if (candidate.postsInPeriod === null) continue
      expect(candidate.postsInPeriod / candidate.days).toBeLessThanOrEqual(6)
    }
  })
})

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

  it('divides the creator price by thirty days', () => {
    // Arrange: Creator is $499 a month, added in v4 from 09 §11.
    const creator = tier('creator')

    // Act
    const perDay = perDayUsd(creator)

    // Assert: 499 / 30 = 16.63, rounded to whole dollars.
    expect(perDay).toBe(17)
  })

  it('returns null for a tier that cannot be bought', () => {
    // Arrange: Studio is $79 but is a waitlist, not a purchase.
    const studio = tier('studio')

    // Act
    const perDay = perDayUsd(studio)

    // Assert: a per-day figure invites a comparison with something you can
    // buy today, and this cannot be bought at all. So none is shown.
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

  it('gives every plan a "best for" that names an account type, not a trade', () => {
    // 09 §11 requires a "best for" on every plan, and 10 §1 forbids sorting
    // anyone by industry. The four home cards used to be trades; this is the
    // same rule applied where a visitor is choosing what to pay for.
    const industryWords = /coach|consultant|clinic|dentist|gym|salon|restaurant|real estate/i

    for (const candidate of PRICING_TIERS) {
      expect(candidate.bestFor.length, `${candidate.id} has no "best for"`).toBeGreaterThan(0)
      expect(candidate.bestFor, candidate.id).not.toMatch(industryWords)
    }
  })

  it('keeps Studio unbuyable, because it is a waitlist', () => {
    // 09 §11: "nothing on the site implies it can be bought today."
    const studio = tier('studio')

    expect(studio.comingLaterLabel).toBe('Waitlist')
    expect(SELLABLE_TIERS.map((candidate) => candidate.id)).not.toContain('studio')
  })

  it('sells the four plans that are actually open', () => {
    expect(SELLABLE_TIERS.map((candidate) => candidate.id)).toEqual([
      'pilot',
      'growth',
      'scale',
      'creator',
    ])
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

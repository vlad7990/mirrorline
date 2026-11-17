/**
 * The add-on's copy, and the three ways it could quietly become dishonest.
 *
 * 09 §11 is the one place a price is written down, so the first test is the
 * same guarantee `pricing-tiers.test.ts` gives the plans: the words and the
 * number cannot disagree.
 *
 * The other two guard decisions rather than values. Folding the add-on into
 * `PRICING_TIERS` is the tempting simplification and it breaks three screens
 * at once; and a card for an unaudited product is exactly the "invented
 * product" 19 v2 refused, so the caveat is the thing that has to survive a
 * copy edit.
 */

import { describe, expect, test } from 'vitest'

import { YOUTUBE_PRIVATE_UNTIL_APPROVED } from '@/lib/copy/platform-limits'
import {
  ADDON_FACTS,
  ADDON_NAME,
  ADDON_PERIOD,
  ADDON_PRICE,
  ADDON_PRICE_USD,
  ADDON_SUMMARY,
  ADDON_EPISODES_PER_MONTH,
  PRIVATE_UNTIL_APPROVED,
  WAITLIST_LABEL,
  WHY_NOT_OPEN,
} from './long-form-addon'
import { PRICING_TIERS } from './pricing-tiers'

describe('the long-form YouTube add-on', () => {
  test('the written price and the number never disagree', () => {
    // Arrange: 09 §11 writes "$400/mo". Two spellings of one figure drift the
    // moment one of them is edited, which is the bug `priceUsd` has always
    // been paired against on the plans.
    const written = Number(ADDON_PRICE.replace(/[^0-9.]/g, ''))

    // Assert
    expect(written).toBe(ADDON_PRICE_USD)
  })

  test('is not a plan, so no plan surface can pick it up', () => {
    // Arrange: `PlanPicker` renders every tier, the pricing hero numbers every
    // tier, and `perDayUsd` divides every tier by its days. An add-on priced
    // on top of a plan is wrong in all three, so it must never be in the list.
    const names = PRICING_TIERS.map((tier) => tier.name)

    // Assert
    expect(names).not.toContain(ADDON_NAME)
    expect(PRICING_TIERS.some((tier) => tier.price === ADDON_PRICE)).toBe(false)
  })

  test('the price is a flat month, never a per-unit charge', () => {
    // 09 §10 is a promise, not a style preference: "no credits, no per-minute
    // charges, no setup fee". The volume may be stated; the *price* may not be
    // attached to a unit.
    const copy = [ADDON_PERIOD, ADDON_SUMMARY, WHY_NOT_OPEN, ...ADDON_FACTS.map((f) => f.detail)]

    for (const line of copy) {
      expect(line).not.toMatch(/per (?:video|clip|minute|upload|episode)\b/i)
      // "no credits" is the promise 09 §10 makes and the sentence we want;
      // a bare "credits" is the charge we are forbidding. The lookbehind is
      // the same device `banned-phrases.ts` uses to keep "never guarantees".
      expect(line).not.toMatch(/(?<!no )\bcredits?\b/i)
    }
    expect(ADDON_PERIOD).toContain('a month')
  })

  test('carries the platform limit in the calendar legend’s words', () => {
    // The whole answer to 19 v2's objection that a card for an add-on whose
    // audit has not started "would be an invented product". The card is honest
    // because of this sentence, so it is asserted against the shared template
    // rather than against a copy of the words.
    expect(PRIVATE_UNTIL_APPROVED).toBe(YOUTUBE_PRIVATE_UNTIL_APPROVED)
    expect(PRIVATE_UNTIL_APPROVED).toContain('stay private until our app is approved')
  })

  test('says it cannot be bought, and never implies it can', () => {
    // 09 §11's rule for Studio, applied to the one other thing that is not
    // open: "nothing on the site implies it can be bought today."
    expect(WAITLIST_LABEL).toBe('Waitlist')
    expect(WHY_NOT_OPEN).toMatch(/audit/i)
    // No date, and no "any day now". We do not control Google's queue.
    expect(WHY_NOT_OPEN).not.toMatch(/soon|shortly|weeks?|months?|20\d\d/i)
  })

  test('names the limit that decides whether it is for you, beside the features', () => {
    // 09 §11: an account on "we create" alone has nothing for this to publish.
    // A buyer should meet that in the list, not discover it after paying — so
    // it is asserted as present rather than left to a copy editor's judgement.
    const labels = ADDON_FACTS.map((fact) => fact.label).join(' ')
    const details = ADDON_FACTS.map((fact) => fact.detail).join(' ')

    expect(labels).toMatch(/you send/i)
    expect(details).toMatch(/your own long recording/i)
    expect(ADDON_FACTS.length).toBeGreaterThanOrEqual(3)
  })

  test('the volume it promises is stated once and is a number', () => {
    // The figure in the prose and the figure a caption could render are the
    // same one. `postsInPeriod` has the identical arrangement on the plans,
    // and for the identical reason: a sentence should not be load-bearing.
    expect(ADDON_EPISODES_PER_MONTH).toBe(2)
    expect(ADDON_FACTS[0]?.label).toContain('Two')
  })
})

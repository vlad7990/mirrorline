/**
 * The helper has to be able to talk somebody out of buying.
 *
 * That is the requirement 19 v2 ★4 actually states, and it is the one most
 * at risk of being quietly edited away later — a branch changed here, a
 * default changed there, and a year from now every path ends at a plan and
 * nobody remembers it was ever supposed not to. These assertions are what
 * make that change loud.
 */

import { describe, expect, it } from 'vitest'

import {
  CADENCE_QUESTION,
  CONTROL_QUESTION,
  FOOTAGE_QUESTION,
  allAnswerCombinations,
  recommend,
} from './decision-helper-content'
import { PRICING_TIERS } from './pricing-tiers'

describe('recommend', () => {
  it('sends someone with no footage away, whatever else they answer', () => {
    // Arrange: the two answers that would otherwise be our best case.
    const answers = { footage: 'none', cadence: 'daily', control: 'approve' } as const

    // Act
    const result = recommend(answers)

    // Assert
    expect(result.isUs).toBe(false)
    expect(result.planId).toBeNull()
    expect(result.id).toBe('record-first')
  })

  it('sends someone who wants to direct the edit to a freelancer', () => {
    const result = recommend({ footage: 'regular', cadence: 'daily', control: 'direct' })

    expect(result.isUs).toBe(false)
    expect(result.title).toMatch(/freelance editor/i)
  })

  it('tells an occasional poster to do it themselves', () => {
    const result = recommend({ footage: 'regular', cadence: 'rarely', control: 'approve' })

    expect(result.isUs).toBe(false)
    expect(result.id).toBe('diy')
  })

  it('recommends us for daily posting from real footage', () => {
    const result = recommend({ footage: 'regular', cadence: 'daily', control: 'approve' })

    expect(result.isUs).toBe(true)
    expect(result.planId).toBe('growth')
  })

  it('names a plan that exists whenever it names one at all', () => {
    // A verdict pointing at a plan we do not sell would be worse than no
    // verdict: it is a promise with nothing behind it.
    const ids = new Set(PRICING_TIERS.map((tier) => tier.id))

    for (const answers of allAnswerCombinations()) {
      const { planId } = recommend(answers)
      if (planId !== null) expect(ids.has(planId)).toBe(true)
    }
  })

  it('offers nothing to buy on every outcome that is not us', () => {
    // The rule the component relies on: "not us" and "here is a plan" must
    // never be true at the same time.
    for (const answers of allAnswerCombinations()) {
      const result = recommend(answers)
      if (!result.isUs) expect(result.planId).toBeNull()
    }
  })

  it('does not recommend us to most people who answer it', () => {
    // The honesty requirement, as a number. Of the eighteen combinations the
    // three questions allow, the majority end somewhere other than a plan of
    // ours — and if an edit ever flips that, this fails.
    const results = allAnswerCombinations().map(recommend)
    const ours = results.filter((result) => result.isUs)

    expect(results).toHaveLength(18)
    expect(ours.length).toBeLessThan(results.length / 2)
  })

  it('reaches every verdict it defines from some real set of answers', () => {
    // A branch nobody can arrive at is dead copy pretending to be a choice.
    const reached = new Set(allAnswerCombinations().map((answers) => recommend(answers).id))

    expect(reached).toEqual(
      new Set([
        'record-first',
        'freelancer-control',
        'diy',
        'freelancer-volume',
        'creator',
        'growth',
      ]),
    )
  })
})

describe('the questions', () => {
  it('asks nothing about the visitor’s trade', () => {
    // 16 §1 and 13 §1: the only segmentation is account type and goal. A
    // question about industry would contradict the premise of the site.
    const text = [FOOTAGE_QUESTION, CADENCE_QUESTION, CONTROL_QUESTION]
      .flatMap((entry) => [entry.question, ...entry.options.map((option) => option.label)])
      .join(' ')
      .toLowerCase()

    for (const word of ['industry', 'niche', 'sector', 'coach', 'restaurant', 'salon']) {
      expect(text).not.toContain(word)
    }
  })

  it('gives every option a distinct value', () => {
    for (const entry of [FOOTAGE_QUESTION, CADENCE_QUESTION, CONTROL_QUESTION]) {
      const values = entry.options.map((option) => option.value)
      expect(new Set(values).size).toBe(values.length)
    }
  })
})

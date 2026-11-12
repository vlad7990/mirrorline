/**
 * The join between an audience and the sample hook shown beside it.
 *
 * `Audience.sampleNiche` is a name rather than an index precisely so the two
 * lists can be reordered independently. That only holds if something checks
 * the names still resolve — otherwise a rename turns into a card with no
 * frame, which renders as a narrower card rather than as an error, and would
 * ship.
 */

import { describe, expect, it } from 'vitest'

import { AUDIENCES, SHOWCASE_CARDS } from './home-content'

describe('AUDIENCES sample hooks', () => {
  it('names a showcase card that exists, for every audience', () => {
    const niches = new Set(SHOWCASE_CARDS.map((card) => card.niche))

    for (const audience of AUDIENCES) {
      expect(niches.has(audience.sampleNiche), `${audience.title} → ${audience.sampleNiche}`).toBe(
        true,
      )
    }
  })

  it('does not show the same hook against two audiences', () => {
    // Four cards side by side, so a duplicate is visible rather than subtle —
    // and it would quietly suggest two different trades make the same post.
    const used = AUDIENCES.map((audience) => audience.sampleNiche)

    expect(new Set(used).size).toBe(used.length)
  })

  it('keeps every goal a goal, never a promise', () => {
    // Non-negotiable 7. The card renders "Aimed at: {goal}", so the goal has
    // to read as a destination and never as an outcome being guaranteed.
    for (const audience of AUDIENCES) {
      expect(audience.goal).not.toMatch(/guarantee|guaranteed|will get|promise/i)
    }
  })
})

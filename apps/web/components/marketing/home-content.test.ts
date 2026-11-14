/**
 * The join between an account type and the sample hook shown beside it, and
 * the rule that neither list names an industry.
 *
 * `Audience.sampleContext` is a name rather than an index precisely so the two
 * lists can be reordered independently. That only holds if something checks
 * the names still resolve — otherwise a rename turns into a card with no
 * frame, which renders as a narrower card rather than as an error, and would
 * ship.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { AUDIENCES, SHOWCASE_CARDS } from './home-content'

/**
 * Trades the site must never sort people into. Four of these were card titles
 * until v4, and one was a showcase label.
 */
const INDUSTRY_WORDS =
  /coach|consultant|clinic|dentist|med.?spa|wellness|gym|salon|restaurant|real estate|therapist|contractor|law firm/i

describe('AUDIENCES sample hooks', () => {
  it('names a showcase card that exists, for every account type', () => {
    const contexts = new Set(SHOWCASE_CARDS.map((card) => card.context))

    for (const audience of AUDIENCES) {
      expect(
        contexts.has(audience.sampleContext),
        `${audience.title} → ${audience.sampleContext}`,
      ).toBe(true)
    }
  })

  it('does not show the same hook against two account types', () => {
    // Four cards side by side, so a duplicate is visible rather than subtle.
    const used = AUDIENCES.map((audience) => audience.sampleContext)

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

describe('SHOWCASE_CARDS frames', () => {
  const publicDir = path.join(__dirname, '..', '..', 'public')

  it('points every card at a frame that is really on disk', () => {
    // The same promise `reel-assets.test.ts` keeps for the cut wall: an entry
    // must not outlive its asset. A renamed file would otherwise ship as a
    // broken image in the marquee and pass every other test here.
    for (const card of SHOWCASE_CARDS) {
      expect(card.frameSrc, card.context).toMatch(/^\/samples\/[\w-]+\.(webp|avif|jpg)$/)
      expect(
        existsSync(path.join(publicDir, card.frameSrc)),
        `${card.context}: ${card.frameSrc} is listed but missing`,
      ).toBe(true)
    }
  })

  it('shows a different account in every frame', () => {
    // The point of the set. Two cards on one frame would say the opposite of
    // what the section heading claims, and a drifting rail is exactly where a
    // repeat is noticed.
    const frames = SHOWCASE_CARDS.map((card) => card.frameSrc)

    expect(new Set(frames).size).toBe(frames.length)
  })

  it('carries enough frames to fill both rails', () => {
    // Each rail renders the whole set twice and translates by half its width.
    // Below about ten cards the doubled track is narrower than a desktop
    // viewport, and the seam the duplication exists to hide becomes a gap.
    expect(SHOWCASE_CARDS.length).toBeGreaterThanOrEqual(10)
  })
})

describe('no industry anywhere in the home copy', () => {
  it('names account types, not trades', () => {
    // 16 §1 and 10 §1. These four cards were "Coaches and consultants",
    // "Clinics and wellness", "Studios and gyms" and "Local services", which
    // told every visitor outside those four that the product was not for them.
    for (const audience of AUDIENCES) {
      expect(audience.title, audience.title).not.toMatch(INDUSTRY_WORDS)
      expect(audience.body, audience.title).not.toMatch(INDUSTRY_WORDS)
    }
  })

  it('labels showcase samples by goal, not by trade', () => {
    for (const card of SHOWCASE_CARDS) {
      expect(card.context, card.context).not.toMatch(INDUSTRY_WORDS)
      expect(`${card.lead} ${card.highlight}`, card.context).not.toMatch(INDUSTRY_WORDS)
    }
  })

  it('covers both audiences and both account stages', () => {
    // The set has to span the 2×2 from 13 §1, or the section quietly favours
    // one kind of visitor the way the industry cards did.
    const titles = AUDIENCES.map((audience) => audience.title.toLowerCase()).join(' ')

    expect(titles).toContain('a business')
    expect(titles).toContain('an individual')
    expect(titles).toMatch(/starting|zero/)
    expect(titles).toMatch(/has|audience/)
  })
})

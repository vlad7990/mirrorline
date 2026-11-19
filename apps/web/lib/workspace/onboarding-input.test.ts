import { describe, expect, test } from 'vitest'

import {
  NICHE_MAX_LENGTH,
  OUTCOME_MAX_LENGTH,
  parseOnboardingSubmission,
} from './onboarding-input'

/**
 * Onboarding is the only place the niche and the outcome are ever asked for,
 * and `goals.outcome_text` is `not null`. So this parser is the boundary that
 * decides whether a workspace gets a real goal or a row that fails on insert —
 * which makes "what counts as empty" the whole job.
 */

const VALID = {
  niche: 'Leadership coaching for first-time managers',
  audience: 'business',
  stage: 'existing',
  goalType: 'leads',
  outcomeText: 'Ten qualified enquiries a month from people who already trust me',
} as const

describe('parseOnboardingSubmission', () => {
  test('accepts a complete answer and hands back the five fields', () => {
    // Arrange / Act
    const result = parseOnboardingSubmission(VALID)

    // Assert
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      niche: VALID.niche,
      audience: 'business',
      stage: 'existing',
      goalType: 'leads',
      outcomeText: VALID.outcomeText,
    })
  })

  test('trims the two free-text fields, because a space is not an answer', () => {
    const result = parseOnboardingSubmission({
      ...VALID,
      niche: '   Independent bakery in Leeds   ',
      outcomeText: '\n  Fifty walk-ins a week  \t',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.niche).toBe('Independent bakery in Leeds')
    expect(result.value.outcomeText).toBe('Fifty walk-ins a week')
  })

  test('refuses a niche that is only whitespace', () => {
    const result = parseOnboardingSubmission({ ...VALID, niche: '    ' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/niche/i)
  })

  test('refuses a missing outcome, which is what keeps the goal insert honest', () => {
    // `goals.outcome_text` is `not null`. Letting an empty string through would
    // turn a question the user skipped into a database error a layer down.
    const result = parseOnboardingSubmission({ ...VALID, outcomeText: '' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/own words|outcome|success/i)
  })

  test('refuses free text longer than the column allows, rather than truncating it', () => {
    // Silently cutting somebody's sentence in half is worse than asking them
    // to shorten it: they never find out it happened.
    const longNiche = parseOnboardingSubmission({
      ...VALID,
      niche: 'a'.repeat(NICHE_MAX_LENGTH + 1),
    })
    const longOutcome = parseOnboardingSubmission({
      ...VALID,
      outcomeText: 'b'.repeat(OUTCOME_MAX_LENGTH + 1),
    })

    expect(longNiche.ok).toBe(false)
    expect(longOutcome.ok).toBe(false)
  })

  test('accepts free text exactly at the limit', () => {
    const result = parseOnboardingSubmission({
      ...VALID,
      niche: 'a'.repeat(NICHE_MAX_LENGTH),
      outcomeText: 'b'.repeat(OUTCOME_MAX_LENGTH),
    })

    expect(result.ok).toBe(true)
  })

  test.each([
    ['audience', 'charity'],
    ['stage', 'halfway'],
    ['goalType', 'followers'],
  ])('refuses an unrecognised %s rather than defaulting it', (field, value) => {
    // The three vocabularies are checked in the database too
    // (`workspace_bootstrap.sql`). A default invented here would be an answer
    // put in somebody's mouth, and 16 §1 is explicit that all three are the
    // user's own choice.
    const result = parseOnboardingSubmission({ ...VALID, [field]: value })

    expect(result.ok).toBe(false)
  })

  test('refuses a missing field instead of treating undefined as a choice', () => {
    const result = parseOnboardingSubmission({ ...VALID, goalType: undefined })

    expect(result.ok).toBe(false)
  })

  test('accepts every one of the seven goals', () => {
    // 15 §2. If one of these ever stops parsing, the goal it belongs to has
    // quietly become unreachable from onboarding.
    for (const goalType of [
      'leads',
      'bookings',
      'sales',
      'audience',
      'awareness',
      'community',
      'launch',
    ]) {
      expect(parseOnboardingSubmission({ ...VALID, goalType }).ok).toBe(true)
    }
  })
})

/**
 * The profile the agents are given, and the facts a script may stand on.
 *
 * Two things here are worth testing and the rest is shape checking:
 *
 * 1. **`profileFacts` is the list the V2 gate checks against.** If a real fact
 *    falls out of it, honest scripts get rejected; if junk gets in, invented
 *    ones get through. Both failures are quiet.
 * 2. **`profileBrief` is what the model actually reads.** The "never
 *    recommend" line is the one with consequences — a format contradicting the
 *    client's method is one they would have to refuse in public.
 */

import { describe, expect, test } from 'vitest'

import {
  EMPTY_PROFILE,
  isProfileEmpty,
  parseClientProfile,
  profileBrief,
  profileFacts,
} from './client-profile'

/** A row as Postgres hands it back: snake_case columns, jsonb values. */
const ROW = {
  service_area: 'Miami',
  method: 'positive reinforcement only',
  avoid: ['Prong collars', 'Board-and-train'],
  services: [
    { name: 'Reactive dog intensive', price: '$450 for 4 sessions' },
    { name: 'Puppy start', price: null },
  ],
  handles: { instagram: '@example', tiktok: '@example', linkedin: '@ignored' },
}

describe('a row becomes a profile, or nothing', () => {
  test('keeps every field the agents read', () => {
    const profile = parseClientProfile(ROW)

    expect(profile.serviceArea).toBe('Miami')
    expect(profile.method).toBe('positive reinforcement only')
    expect(profile.avoid).toEqual(['Prong collars', 'Board-and-train'])
    expect(profile.services[0]).toEqual({
      name: 'Reactive dog intensive',
      price: '$450 for 4 sessions',
    })
  })

  test('a service with no price is still a service', () => {
    expect(parseClientProfile(ROW).services[1]).toEqual({ name: 'Puppy start', price: null })
  })

  test('a bare string is a service without a price', () => {
    const profile = parseClientProfile({ services: ['Puppy start'] })

    expect(profile.services).toEqual([{ name: 'Puppy start', price: null }])
  })

  test('drops a platform we do not ask about', () => {
    // `linkedin` is in the row and not in `PROFILE_PLATFORMS`. Storing it is
    // harmless; *rendering* it would claim we read a platform we do not.
    expect(parseClientProfile(ROW).handles).toEqual({
      instagram: '@example',
      tiktok: '@example',
    })
  })

  test('an absent row is the empty profile, not a crash', () => {
    expect(parseClientProfile(null)).toEqual(EMPTY_PROFILE)
    expect(isProfileEmpty(EMPTY_PROFILE)).toBe(true)
  })

  test('one answered field is not an empty profile', () => {
    expect(isProfileEmpty(parseClientProfile({ service_area: 'Miami' }))).toBe(false)
  })
})

describe('the facts a script is allowed to claim', () => {
  test('includes the area, the method, the services and their prices', () => {
    const facts = profileFacts(parseClientProfile(ROW), 'independent dog trainers')

    expect(facts).toContain('Miami')
    expect(facts).toContain('positive reinforcement only')
    expect(facts).toContain('Reactive dog intensive')
    expect(facts).toContain('$450 for 4 sessions')
  })

  test('includes the niche, which is often a new workspace’s only fact', () => {
    expect(profileFacts(EMPTY_PROFILE, 'independent dog trainers')).toEqual([
      'independent dog trainers',
    ])
  })

  test('is empty when we know nothing, which is what stops the script agent', () => {
    // `writeFirstVideos` reads this: no facts, no call. Every draft would fail
    // the fact check, and spending money to produce nothing is worse than
    // saying why there is nothing.
    expect(profileFacts(EMPTY_PROFILE, null)).toEqual([])
  })

  test('a null price does not become a fact', () => {
    const facts = profileFacts(parseClientProfile({ services: ['Puppy start'] }), null)

    expect(facts).toEqual(['Puppy start'])
  })
})

describe('what the model is told', () => {
  test('names the avoid list as a prohibition, not a preference', () => {
    const brief = profileBrief(parseClientProfile(ROW))

    expect(brief).toContain('never recommend, and you must never suggest: Prong collars')
  })

  test('omits sections nobody answered rather than saying "none"', () => {
    // A model given "What they sell: none" reads an instruction about nothing
    // and occasionally answers it.
    const brief = profileBrief(parseClientProfile({ service_area: 'Miami' }))

    expect(brief).toBe('Where they work: Miami')
  })

  test('an empty profile briefs nothing at all', () => {
    expect(profileBrief(EMPTY_PROFILE)).toBe('')
  })
})

/**
 * The name on the report (D131).
 *
 * The first live report's cover read "Prepared for VN & MN Product Group" — the
 * workspace name, which is our account label, on a PDF addressed to somebody
 * else's business.
 */
describe('the brand name', () => {
  test('is read from the row, in either case convention', () => {
    // Arrange
    const row = { ...ROW, brand_name: 'Oakline Dog Training' }

    // Act
    const parsed = parseClientProfile(row)

    // Assert
    expect(parsed.brandName).toBe('Oakline Dog Training')
    expect(parseClientProfile({ brandName: 'Oakline Dog Training' }).brandName).toBe(
      'Oakline Dog Training',
    )
  })

  test('is null when nobody has said, which the cover leaves out', () => {
    expect(parseClientProfile(ROW).brandName).toBeNull()
  })

  test('is a fact a script may stand on', () => {
    // Without this, "book with Oakline this week" would be refused by the fact
    // check as an invention.
    const facts = profileFacts(parseClientProfile({ ...ROW, brand_name: 'Oakline' }))

    expect(facts).toContain('Oakline')
  })

  test('is the first thing the agents are told', () => {
    const brief = profileBrief(parseClientProfile({ brand_name: 'Oakline', service_area: 'Miami' }))

    expect(brief).toBe('What the business is called: Oakline\nWhere they work: Miami')
  })

  test('a profile holding only a brand name is not empty', () => {
    expect(isProfileEmpty(parseClientProfile({ brand_name: 'Oakline' }))).toBe(false)
  })
})

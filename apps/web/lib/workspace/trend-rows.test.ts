/**
 * The last fixtures leave the studio (V1).
 *
 * `numeric` arrives from PostgREST as a **string**, so every case below feeds
 * strings where Postgres would — a converter tested only with numbers passes
 * and then renders `NaN` against the real database.
 */

import { describe, expect, test } from 'vitest'

import { growthLabel, toBeats, toTrendCard, toTrendCards, type TrendRow } from './trend-rows'

const ROW: TrendRow = {
  id: 'trend-1',
  format: 'Myth vs fact',
  from_niche: 'independent coffee roasters',
  platform: 'tiktok',
  growth_percent: '340',
  fit: '86',
  views_per_follower: '9.6',
  beats: ['State the myth', 'Give the fact'],
  why_it_works: 'The myth is on screen before the first word.',
}

describe('a row becomes a card', () => {
  test('reads numerics that arrive as strings', () => {
    const card = toTrendCard(ROW, 'independent coffee roasters')

    expect(card).toMatchObject({
      id: 'trend-1',
      format: 'Myth vs fact',
      platform: 'tiktok',
      growthPercent: 340,
      fit: 86,
      viewsPerFollower: 9.6,
    })
  })

  test('numbers also work, because the service role returns them', () => {
    const card = toTrendCard({ ...ROW, growth_percent: 120, fit: 70, views_per_follower: 2.5 }, null)

    expect(card?.growthPercent).toBe(120)
    expect(card?.viewsPerFollower).toBe(2.5)
  })

  test('drops a row with no format, rather than drawing a blank tile', () => {
    expect(toTrendCard({ ...ROW, format: null }, null)).toBeNull()
    expect(toTrendCard({ ...ROW, format: '   ' }, null)).toBeNull()
  })

  test('drops a row whose platform we do not support', () => {
    expect(toTrendCard({ ...ROW, platform: 'threads' }, null)).toBeNull()
    expect(toTrendCard({ ...ROW, platform: null }, null)).toBeNull()
  })

  test('accepts a platform in any case, because an agent wrote it', () => {
    expect(toTrendCard({ ...ROW, platform: 'TikTok' }, null)?.platform).toBe('tiktok')
  })
})

describe('an unmeasured growth figure says so', () => {
  test('prints the sentence rather than +0%', () => {
    // 15 §8 and B2.4: an unmeasured value is never a zero. "+0%" is a
    // measurement claiming the format is flat; we simply did not measure it.
    expect(growthLabel(null)).toBe('Not measured yet')
  })

  test('always carries a sign, so the figure cannot read as a share', () => {
    expect(growthLabel(340)).toBe('+340%')
    expect(growthLabel(-12)).toBe('-12%')
    expect(growthLabel(0)).toBe('+0%')
  })

  test('rounds rather than printing a long decimal', () => {
    expect(growthLabel(12.4)).toBe('+12%')
  })

  test('a row with no growth figure still becomes a card', () => {
    const card = toTrendCard({ ...ROW, growth_percent: null }, null)

    expect(card?.growthLabel).toBe('Not measured yet')
    // The numeric field is not nullable on the card, so 0 sits behind the
    // honest string rather than in front of it.
    expect(card?.growthPercent).toBe(0)
  })

  /**
   * The same rule as the sentence above, for the figure that had it wrong.
   *
   * `views_per_follower` was read through a `?? 0`, and the card formats the
   * number directly — so an unmeasured example rendered as **"0.0× views per
   * follower"**. Not a gap: a measurement, and the worst available one, about a
   * format we were recommending.
   *
   * Nothing caught it because every fixture in this repo carries a figure. The
   * first live scan carried none on any example — the prompt tells the model to
   * omit what it cannot verify, and it obeyed. This test is that run, kept.
   */
  test('an unmeasured views-per-follower stays null, and never becomes 0', () => {
    expect(toTrendCard({ ...ROW, views_per_follower: null }, null)?.viewsPerFollower).toBeNull()

    // And a measured zero stays zero: the fix must not turn a real 0 into
    // "unmeasured", which would be the same lie pointing the other way.
    expect(toTrendCard({ ...ROW, views_per_follower: 0 }, null)?.viewsPerFollower).toBe(0)
  })
})

describe('the storyboard, in either shape an agent writes', () => {
  test('a list of strings becomes ordered beats', () => {
    expect(toBeats(['Hook', 'Payoff'])).toEqual([
      { order: 1, label: 'Hook' },
      { order: 2, label: 'Payoff' },
    ])
  })

  test('a list of objects keeps the order it was given', () => {
    expect(
      toBeats([
        { order: 2, label: 'Payoff' },
        { order: 1, label: 'Hook' },
      ]),
    ).toEqual([
      { order: 2, label: 'Payoff' },
      { order: 1, label: 'Hook' },
    ])
  })

  test('drops entries that would render as [object Object]', () => {
    expect(toBeats([{ nope: true }, 'Hook', 42, null])).toEqual([{ order: 2, label: 'Hook' }])
  })

  test('is empty for anything that is not a list', () => {
    expect(toBeats(null)).toEqual([])
    expect(toBeats('Hook, then payoff')).toEqual([])
  })
})

describe('isFromMyNiche drives the filter, so it must not split on case', () => {
  test('matches the workspace niche ignoring case and padding', () => {
    // One side is typed by a person at onboarding, the other written by an
    // agent. Treating these as different niches would quietly empty the
    // "My niche" filter.
    expect(toTrendCard(ROW, '  Independent Coffee Roasters ')?.isFromMyNiche).toBe(true)
  })

  test('a different niche is not mine', () => {
    expect(toTrendCard(ROW, 'dentists')?.isFromMyNiche).toBe(false)
  })

  test('an unknown workspace niche is not a match for everything', () => {
    // The dangerous direction: `null === null` would make every nearby-niche
    // format look like the client's own.
    expect(toTrendCard({ ...ROW, from_niche: null }, null)?.isFromMyNiche).toBe(false)
    expect(toTrendCard(ROW, null)?.isFromMyNiche).toBe(false)
  })
})

describe('the list conversion', () => {
  test('keeps the drawable rows and the order given', () => {
    const cards = toTrendCards(
      [ROW, { ...ROW, id: 'trend-2', format: null }, { ...ROW, id: 'trend-3' }],
      null,
    )

    expect(cards.map((card) => card.id)).toEqual(['trend-1', 'trend-3'])
  })

  test('an empty read is an empty list, never a fixture', () => {
    // The whole point of this file. D110: an empty state is a state, and a
    // fallback to `@mirrorline/mock` here is how eight invented formats
    // reached a workspace that had never been scanned.
    expect(toTrendCards([], 'anything')).toEqual([])
  })
})

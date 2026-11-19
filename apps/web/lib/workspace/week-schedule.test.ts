import { describe, expect, test } from 'vitest'

import {
  buildWeekSchedule,
  parseSlot,
  thumbnailColorFor,
  timeLabelFor,
  toScheduledPost,
  weekEndFor,
  weekPostsFrom,
  weekStartFor,
  type ScheduledPostRow,
} from './week-schedule'

/** Mon 16 – Sun 22 November 2026. */
const MONDAY = '2026-11-16'
const WEDNESDAY = '2026-11-18'
const SUNDAY = '2026-11-22'

function row(overrides: Partial<ScheduledPostRow> = {}): ScheduledPostRow {
  return {
    id: 'post-1',
    cut_id: null,
    platform: 'instagram',
    title: 'The 3-word reframe',
    status: 'scheduled',
    scheduled_date: WEDNESDAY,
    scheduled_time24: '14:15',
    has_ai_scenes: false,
    ...overrides,
  }
}

describe('weekStartFor', () => {
  test('returns the Monday of a midweek date', () => {
    expect(weekStartFor(WEDNESDAY)).toBe(MONDAY)
  })

  test('returns the date itself when it is already a Monday', () => {
    expect(weekStartFor(MONDAY)).toBe(MONDAY)
  })

  test('treats Sunday as the end of its week, not the start of the next', () => {
    // The trap: `getUTCDay()` calls Sunday 0, so a naive offset would send this
    // forward a week and show an empty grid every Sunday.
    expect(weekStartFor(SUNDAY)).toBe(MONDAY)
  })

  test('crosses a month boundary', () => {
    // Tue 1 December 2026 belongs to the week starting Mon 30 November.
    expect(weekStartFor('2026-12-01')).toBe('2026-11-30')
  })

  test('crosses a year boundary', () => {
    // Fri 1 January 2027 belongs to the week starting Mon 28 December 2026.
    expect(weekStartFor('2027-01-01')).toBe('2026-12-28')
  })
})

describe('weekEndFor', () => {
  test('is the Sunday six days after the start', () => {
    expect(weekEndFor(MONDAY)).toBe(SUNDAY)
  })
})

describe('timeLabelFor', () => {
  test('formats an afternoon time the way the designs do', () => {
    expect(timeLabelFor('14:15')).toBe('2:15 pm')
  })

  test('drops the leading zero from a morning hour', () => {
    expect(timeLabelFor('07:30')).toBe('7:30 am')
  })

  test('calls noon 12 pm and midnight 12 am', () => {
    // The two a bare `hours % 12` gets wrong.
    expect(timeLabelFor('12:15')).toBe('12:15 pm')
    expect(timeLabelFor('00:05')).toBe('12:05 am')
  })

  test('returns an unparseable value unchanged rather than inventing midnight', () => {
    // The column carries a regex check, so this is reachable only if something
    // wrote around it — and a silent '12:00 am' would hide that.
    expect(timeLabelFor('not-a-time')).toBe('not-a-time')
    expect(timeLabelFor('25:00')).toBe('25:00')
  })
})

describe('thumbnailColorFor', () => {
  test('is stable for the same post', () => {
    expect(thumbnailColorFor('post-abc')).toBe(thumbnailColorFor('post-abc'))
  })

  test('is a colour from the palette', () => {
    // Act
    const color = thumbnailColorFor('cf4f3e44-0000-4000-8000-000000000001')

    // Assert
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('toScheduledPost', () => {
  test('derives the three labels rather than reading them from the row', () => {
    // Act
    const post = toScheduledPost(row({ status: 'needs-review', platform: 'youtube' }))

    // Assert
    expect(post).toMatchObject({
      timeLabel: '2:15 pm',
      platformLabel: 'YouTube Shorts',
      statusLabel: 'Needs review',
    })
  })

  test('carries hasAiScenes through, because nothing else implies it', () => {
    expect(toScheduledPost(row({ has_ai_scenes: true }))?.hasAiScenes).toBe(true)
  })

  test('drops a row whose platform is not one we draw', () => {
    // A value outside the check constraint means something wrote past the
    // schema. A chip in the wrong row would be worse than no chip.
    expect(toScheduledPost(row({ platform: 'myspace' }))).toBeNull()
  })

  test('drops a row whose status is not one we label', () => {
    expect(toScheduledPost(row({ status: 'half-done' }))).toBeNull()
  })
})

describe('buildWeekSchedule', () => {
  test('lays out seven days from the Monday, with names and numbers', () => {
    // Act
    const schedule = buildWeekSchedule([], { startDate: MONDAY, today: WEDNESDAY })

    // Assert
    expect(schedule.days).toHaveLength(7)
    expect(schedule.days[0]).toMatchObject({
      date: MONDAY,
      dayLabel: 'Mon',
      dayOfMonth: 16,
      monthLabel: 'November',
    })
    expect(schedule.days[6]).toMatchObject({ date: SUNDAY, dayLabel: 'Sun', dayOfMonth: 22 })
  })

  test('marks today, and only today', () => {
    // Act
    const schedule = buildWeekSchedule([], { startDate: MONDAY, today: WEDNESDAY })

    // Assert
    expect(schedule.days.filter((day) => day.isToday).map((day) => day.date)).toEqual([WEDNESDAY])
  })

  test('marks no day when the workspace has no time zone', () => {
    // Act — `today: null` is D97's "not captured".
    const schedule = buildWeekSchedule([], { startDate: MONDAY, today: null })

    // Assert — highlighting a guess would be worse than highlighting nothing.
    expect(schedule.days.some((day) => day.isToday)).toBe(false)
  })

  test('has no rows for a week with no posts', () => {
    // A brand-new workspace looks exactly like this, so the view must cope.
    expect(buildWeekSchedule([], { startDate: MONDAY, today: null }).rows).toEqual([])
  })

  test('draws a row only for a platform that has a post', () => {
    // Arrange
    const rows = [row({ id: 'a', platform: 'tiktok' }), row({ id: 'b', platform: 'instagram' })]

    // Act
    const schedule = buildWeekSchedule(rows, { startDate: MONDAY, today: null })

    // Assert — instagram first, because the row order is PLATFORM_ORDER rather
    // than the order the rows arrived in.
    expect(schedule.rows.map((r) => r.platform)).toEqual(['instagram', 'tiktok'])
    expect(schedule.rows[0]?.platformLabel).toBe('Instagram')
  })

  test('puts each post in its own day and leaves the other cells empty', () => {
    // Arrange
    const rows = [row({ id: 'a', scheduled_date: MONDAY }), row({ id: 'b', scheduled_date: SUNDAY })]

    // Act
    const schedule = buildWeekSchedule(rows, { startDate: MONDAY, today: null })
    const cells = schedule.rows[0]?.cells ?? []

    // Assert
    expect(cells.map((cell) => cell.posts.length)).toEqual([1, 0, 0, 0, 0, 0, 1])
    expect(cells[0]?.posts[0]?.id).toBe('a')
    expect(cells[6]?.posts[0]?.id).toBe('b')
  })

  test('orders the chips inside a day by time', () => {
    // Arrange — deliberately out of order.
    const rows = [
      row({ id: 'evening', scheduled_time24: '19:45' }),
      row({ id: 'morning', scheduled_time24: '07:30' }),
      row({ id: 'afternoon', scheduled_time24: '14:15' }),
    ]

    // Act
    const schedule = buildWeekSchedule(rows, { startDate: MONDAY, today: null })
    const wednesday = schedule.rows[0]?.cells[2]

    // Assert
    expect(wednesday?.posts.map((post) => post.id)).toEqual(['morning', 'afternoon', 'evening'])
  })

  test('drops a post outside the window rather than drawing it in the wrong cell', () => {
    // Arrange — the Monday of the following week.
    const rows = [row({ id: 'next-week', scheduled_date: '2026-11-23' })]

    // Act
    const schedule = buildWeekSchedule(rows, { startDate: MONDAY, today: null })

    // Assert
    expect(schedule.rows).toEqual([])
  })

  test('drops an undrawable row without losing the rest of the week', () => {
    // Arrange
    const rows = [row({ id: 'bad', platform: 'myspace' }), row({ id: 'good' })]

    // Act
    const schedule = buildWeekSchedule(rows, { startDate: MONDAY, today: null })

    // Assert
    expect(weekPostsFrom(schedule).map((post) => post.id)).toEqual(['good'])
  })
})

describe('parseSlot', () => {
  test('accepts a day and time the grid could have produced', () => {
    // Act
    const parsed = parseSlot(WEDNESDAY, '14:15')

    // Assert
    expect(parsed).toEqual({ ok: true, value: { date: WEDNESDAY, time24: '14:15' } })
  })

  test('accepts midnight and the last minute of the day', () => {
    expect(parseSlot(WEDNESDAY, '00:00').ok).toBe(true)
    expect(parseSlot(WEDNESDAY, '23:59').ok).toBe(true)
  })

  test('rejects a 24th hour and a 60th minute', () => {
    expect(parseSlot(WEDNESDAY, '24:00').ok).toBe(false)
    expect(parseSlot(WEDNESDAY, '12:60').ok).toBe(false)
  })

  test('rejects a date that matches the shape but is not a day', () => {
    // 31 February passes the regex and is not a date. The round-trip through
    // `Date` is the only thing that catches it.
    expect(parseSlot('2026-02-31', '09:00').ok).toBe(false)
  })

  test('rejects a date in the wrong format', () => {
    expect(parseSlot('18/11/2026', '09:00').ok).toBe(false)
    expect(parseSlot('2026-11-18T09:00:00Z', '09:00').ok).toBe(false)
  })

  test('rejects values that are not strings, which is how a forged call arrives', () => {
    expect(parseSlot(null, '09:00').ok).toBe(false)
    expect(parseSlot(WEDNESDAY, 540).ok).toBe(false)
    expect(parseSlot({ date: WEDNESDAY }, '09:00').ok).toBe(false)
  })

  test('gives a sentence rather than a code when it refuses', () => {
    // Act
    const parsed = parseSlot('nope', 'nope')

    // Assert
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.message).toMatch(/schedule/)
  })
})

describe('weekPostsFrom', () => {
  test('flattens every chip on the grid', () => {
    // Arrange
    const rows = [
      row({ id: 'a', platform: 'instagram' }),
      row({ id: 'b', platform: 'tiktok' }),
      row({ id: 'c', platform: 'tiktok', scheduled_date: MONDAY }),
    ]

    // Act
    const posts = weekPostsFrom(buildWeekSchedule(rows, { startDate: MONDAY, today: null }))

    // Assert
    expect(posts.map((post) => post.id).sort()).toEqual(['a', 'b', 'c'])
  })
})

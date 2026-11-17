/**
 * The rules a reschedule has to keep, none of which are visible in a drag.
 *
 * The screen's own test is the e2e walk; this is for the things that go wrong
 * silently — a chip that lands in its new cell *and* stays in the old one, a
 * cell that stops being in time order, and above all a fixture that got
 * edited, which would leak this session's moves into every other screen.
 */

import { weekPosts, weekSchedule } from '@mirrorline/mock'
import { describe, expect, it } from 'vitest'

import {
  applyMoves,
  isSameSlot,
  movedPost,
  movedWeekPosts,
  type ScheduleMoves,
  timeSlotsFor,
} from './schedule-moves'

/** A post from the middle of the week, so there is room either side of it. */
const SUBJECT = weekPosts[3] ?? weekPosts[0]
// Not an `expect`: this runs at module scope and every test below reads it,
// so a missing fixture should stop the file rather than fail nine times.
if (!SUBJECT) throw new Error('the week fixtures have no posts to move')

function cellsOf(schedule: typeof weekSchedule, platform: string) {
  return schedule.rows.find((row) => row.platform === platform)?.cells ?? []
}

function idsOn(schedule: typeof weekSchedule, platform: string, date: string): string[] {
  return (cellsOf(schedule, platform).find((cell) => cell.date === date)?.posts ?? []).map(
    (post) => post.id,
  )
}

describe('applyMoves', () => {
  it('returns the schedule untouched when nothing has moved', () => {
    expect(applyMoves(weekSchedule, {})).toBe(weekSchedule)
  })

  it('takes the post out of its old cell as well as putting it in the new one', () => {
    // The half that is easy to forget. A chip in two cells reads as a bug in
    // the fixtures rather than in the move.
    const target = weekSchedule.days.find((day) => day.date !== SUBJECT.date)
    expect(target, 'the week needs a second day to move to').toBeDefined()
    if (!target) return

    const moves: ScheduleMoves = {
      [SUBJECT.id]: { date: target.date, time24: SUBJECT.time24, timeLabel: SUBJECT.timeLabel },
    }
    const next = applyMoves(weekSchedule, moves)

    expect(idsOn(next, SUBJECT.platform, target.date)).toContain(SUBJECT.id)
    expect(idsOn(next, SUBJECT.platform, SUBJECT.date)).not.toContain(SUBJECT.id)

    // And exactly once across the whole row, which the two checks above would
    // still pass if the post were duplicated into some third cell.
    const everywhere = cellsOf(next, SUBJECT.platform)
      .flatMap((cell) => cell.posts)
      .filter((post) => post.id === SUBJECT.id)
    expect(everywhere).toHaveLength(1)
  })

  it('keeps every cell in time order after a move', () => {
    const target = weekSchedule.days.find((day) => day.date !== SUBJECT.date)
    if (!target) return

    // Deliberately the earliest possible time, so an appended chip would land
    // in the wrong place and the sort is really being exercised.
    const moves: ScheduleMoves = {
      [SUBJECT.id]: { date: target.date, time24: '00:05', timeLabel: '12:05 am' },
    }
    const next = applyMoves(weekSchedule, moves)

    for (const row of next.rows) {
      for (const cell of row.cells) {
        const times = cell.posts.map((post) => post.time24)
        expect(
          [...times].sort((a, b) => a.localeCompare(b)),
          `${row.platform} ${cell.date}`,
        ).toEqual(times)
      }
    }
  })

  it('never edits the fixtures', () => {
    // The whole reason this module is pure. A mutation here would follow the
    // reader to Results and survive a navigation, which is exactly what
    // "not saved" promises it will not do.
    const before = JSON.stringify(weekSchedule)
    const target = weekSchedule.days.find((day) => day.date !== SUBJECT.date)
    if (!target) return

    applyMoves(weekSchedule, {
      [SUBJECT.id]: { date: target.date, time24: '23:59', timeLabel: '11:59 pm' },
    })

    expect(JSON.stringify(weekSchedule)).toBe(before)
  })

  it('leaves the posts it was not asked to move exactly where they were', () => {
    const target = weekSchedule.days.find((day) => day.date !== SUBJECT.date)
    if (!target) return

    const next = applyMoves(weekSchedule, {
      [SUBJECT.id]: { date: target.date, time24: SUBJECT.time24, timeLabel: SUBJECT.timeLabel },
    })

    const movedIds = new Set([SUBJECT.id])
    for (const row of weekSchedule.rows) {
      for (const cell of row.cells) {
        const expected = cell.posts.filter((post) => !movedIds.has(post.id)).map((post) => post.id)
        const actual = idsOn(next, row.platform, cell.date).filter((id) => !movedIds.has(id))
        expect(actual, `${row.platform} ${cell.date}`).toEqual(expected)
      }
    }
  })
})

describe('movedPost and movedWeekPosts', () => {
  it('rewrites the day and the time, and nothing else', () => {
    const next = movedPost(SUBJECT, {
      [SUBJECT.id]: { date: '2026-11-30', time24: '08:00', timeLabel: '8:00 am' },
    })

    expect(next.date).toBe('2026-11-30')
    expect(next.time24).toBe('08:00')
    expect(next.timeLabel).toBe('8:00 am')
    // Platform in particular: a move is a scheduling change, never a
    // publishing one. See the module header.
    expect(next.platform).toBe(SUBJECT.platform)
    expect(next.title).toBe(SUBJECT.title)
    expect(next.status).toBe(SUBJECT.status)
  })

  it('returns the same object when that post has not moved', () => {
    expect(movedPost(SUBJECT, {})).toBe(SUBJECT)
  })

  it('keeps the flat list the same length', () => {
    const moved = movedWeekPosts(weekPosts, {
      [SUBJECT.id]: { date: '2026-11-30', time24: '08:00', timeLabel: '8:00 am' },
    })
    expect(moved).toHaveLength(weekPosts.length)
  })
})

describe('timeSlotsFor', () => {
  it('offers the slots that platform already posts in, in order and deduplicated', () => {
    const slots = timeSlotsFor(weekSchedule, SUBJECT.platform)

    expect(slots.length).toBeGreaterThan(0)
    expect(new Set(slots.map((slot) => slot.time24)).size).toBe(slots.length)

    const times = slots.map((slot) => slot.time24)
    expect([...times].sort((a, b) => a.localeCompare(b))).toEqual(times)

    // Every slot is one this row really uses — the menu must not invent a
    // posting time the plan did not buy.
    const real = new Set(
      cellsOf(weekSchedule, SUBJECT.platform)
        .flatMap((cell) => cell.posts)
        .map((post) => post.time24),
    )
    for (const slot of slots) expect(real.has(slot.time24)).toBe(true)
  })

  it('returns nothing for a platform that is not on the grid', () => {
    expect(timeSlotsFor(weekSchedule, 'not-a-platform')).toEqual([])
  })
})

describe('isSameSlot', () => {
  it('spots the move that is not a move', () => {
    expect(isSameSlot(SUBJECT, SUBJECT.date, SUBJECT.time24)).toBe(true)
    expect(isSameSlot(SUBJECT, SUBJECT.date, '23:59')).toBe(false)
    expect(isSameSlot(SUBJECT, '2026-11-30', SUBJECT.time24)).toBe(false)
  })
})

/**
 * Rescheduling a post, as a pure transform over the week fixtures.
 *
 * The screen owns a map of moves in exactly the way it already owns a map of
 * status overrides: nothing here edits `weekSchedule` or `weekPosts`, because
 * those are module-level constants from `@mirrorline/mock` and a mutation
 * would follow the reader to every other screen in the session — and would
 * survive a navigation, which is the part that would make it look saved.
 *
 * **Nothing is persisted, and that is the product, not a shortcut.** There is
 * no API behind this yet. The calendar says so on the screen rather than only
 * in a comment, because a drag that appears to work and is gone on reload is
 * worse than one that admits it is a sample.
 *
 * **A move changes the day and the time, never the platform.** The grid's
 * rows are platforms, so dropping across rows would mean "post this to TikTok
 * instead", which is a different decision under different rules — TikTok
 * posts stay private until our app is approved, for one. Moving within a row
 * is a scheduling change; moving across one is a publishing change, and
 * conflating the two in a drag would be a trap.
 */

import type { CalendarRow, ScheduledPost, WeekSchedule } from '@mirrorline/mock'

/** Where a post has been moved to, in this session only. */
export interface PostMove {
  /** ISO date of the day column it now sits in. */
  readonly date: string
  /** "14:15" — sorts the cell and drives the label. */
  readonly time24: string
  /** "2:15 pm", the fixtures' own format. */
  readonly timeLabel: string
}

export type ScheduleMoves = Readonly<Record<string, PostMove>>

/** The post as the screen should show it, after any move made this session. */
export function movedPost(post: ScheduledPost, moves: ScheduleMoves): ScheduledPost {
  const move = moves[post.id]
  if (!move) return post
  return { ...post, date: move.date, time24: move.time24, timeLabel: move.timeLabel }
}

/** Chips sit in time order inside a day, however they got there. */
function byTime(a: ScheduledPost, b: ScheduledPost): number {
  return a.time24.localeCompare(b.time24)
}

/**
 * The week, rebuilt with every moved post in its new cell.
 *
 * Re-bucketed from the row's own posts rather than patched in place: a move
 * has to take the chip out of where it was as well as put it where it went,
 * and a patch that only did the second half would quietly duplicate it.
 */
export function applyMoves(schedule: WeekSchedule, moves: ScheduleMoves): WeekSchedule {
  if (Object.keys(moves).length === 0) return schedule

  const rows: CalendarRow[] = schedule.rows.map((row) => {
    const moved = row.cells.flatMap((cell) => cell.posts).map((post) => movedPost(post, moves))

    return {
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        posts: moved.filter((post) => post.date === cell.date).sort(byTime),
      })),
    }
  })

  return { ...schedule, rows }
}

/** Every post on the week, with moves applied. Mirrors `weekPosts`. */
export function movedWeekPosts(
  posts: readonly ScheduledPost[],
  moves: ScheduleMoves,
): readonly ScheduledPost[] {
  return posts.map((post) => movedPost(post, moves))
}

/**
 * The slots a post can be moved into: the times that platform already uses.
 *
 * A free-text time would invent a scheduling engine we do not have. The
 * Publisher posts in the slots this account's plan bought, so the honest menu
 * is the set already on that row — deduplicated, in order.
 */
export function timeSlotsFor(
  schedule: WeekSchedule,
  platform: string,
): readonly { readonly time24: string; readonly timeLabel: string }[] {
  const row = schedule.rows.find((candidate) => candidate.platform === platform)
  if (!row) return []

  const seen = new Map<string, string>()
  for (const cell of row.cells) {
    for (const post of cell.posts) {
      if (!seen.has(post.time24)) seen.set(post.time24, post.timeLabel)
    }
  }

  return [...seen.entries()]
    .map(([time24, timeLabel]) => ({ time24, timeLabel }))
    .sort((a, b) => a.time24.localeCompare(b.time24))
}

/** True when the target is where the post already is — nothing to announce. */
export function isSameSlot(post: ScheduledPost, date: string, time24: string): boolean {
  return post.date === date && post.time24 === time24
}

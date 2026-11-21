/**
 * Rescheduling a post, as a pure transform over a week.
 *
 * Nothing here writes anything, and nothing here edits the week it is given:
 * every function returns a new one. That was originally because the week *was*
 * `weekSchedule` from `@mirrorline/mock` — a module-level constant a mutation
 * would have followed to every other screen in the session.
 *
 * **It is still true, for a better reason.** Since B2.2 the week arrives as
 * server-component props built from `scheduled_posts`
 * (`lib/workspace/read-week-schedule.ts`), and a move is persisted by
 * `movePostToSlot`. These functions are the *display* half of that: they put a
 * chip where the move says it is while the write is in flight, and they are
 * what a rollback un-applies. A transform that mutated its input could not be
 * undone — which is exactly what `ScheduleMovesProvider` has to do when a save
 * fails.
 *
 * Applying a move the data already reflects is therefore harmless and expected:
 * it is the same date and the same time, written twice.
 *
 * **A move changes the day and the time, never the platform.** The grid's rows
 * are platforms, so dropping across rows would mean "post this to TikTok
 * instead", which is a different decision under different rules — TikTok posts
 * stay private until our app is approved, for one. Moving within a row is a
 * scheduling change; moving across one is a publishing change, and conflating
 * the two in a drag would be a trap. The database agrees: `authenticated` may
 * update `scheduled_date` and `scheduled_time24`, and not `platform` (D95).
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

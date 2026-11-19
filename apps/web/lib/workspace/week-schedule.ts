/**
 * The week calendar, built from `scheduled_posts` rows (B2.2).
 *
 * Pure, so it can be tested without a database — the same split
 * `goal-cascade.ts` has from `read-goal-cascade.ts`. Everything that needs the
 * network lives in `read-week-schedule.ts`; everything that needs deciding
 * lives here.
 *
 * ============================================================================
 * What is derived, and why it is derived rather than stored
 * ============================================================================
 *
 * D95 stored `scheduled_date` and `scheduled_time24` and nothing about how they
 * read, because `timeLabel`, `platformLabel` and `statusLabel` are functions of
 * other columns. A stored label is a label that can disagree with the value it
 * describes — `14:15` beside "2:30 pm" — and no migration fixes a row that is
 * already wrong.
 *
 * So this module owns that vocabulary. It mirrors `PLATFORM_LABELS` and
 * `POST_STATUS_LABELS` in `packages/mock/src/internal.ts`, which are not
 * exported: the studio is leaving `@mirrorline/mock` behind for data, and
 * reaching into the fixtures for its wording would be the half-move. The
 * *types* still come from there — `Platform`, `PostStatus` and `ScheduledPost`
 * are the shared shape rather than sample data.
 *
 * ============================================================================
 * The time zone is used for display and for nothing else
 * ============================================================================
 *
 * `today` arrives as an ISO date the caller has already resolved in the
 * workspace's zone (D97). It decides which column is highlighted and which week
 * is shown. **No posting logic is built on it** — per Vlad's instruction with
 * D97, and because the Publisher does not exist yet.
 */

import type {
  CalendarCell,
  CalendarDay,
  CalendarRow,
  Platform,
  PostStatus,
  ScheduledPost,
  WeekSchedule,
} from '@mirrorline/mock'
// The tokens subpath, not the package root: this module is reached from the
// co-pilot's server-side `canned.ts`, and `@mirrorline/ui` pulls in every
// Radix component with it. `packages/ui/package.json` exports './tokens'
// for "anything that must not pull React in", which is this.
import { THUMBNAIL_COLORS } from '@mirrorline/ui/tokens'

/** One `scheduled_posts` row, exactly as the select asks for it. */
export interface ScheduledPostRow {
  readonly id: string
  readonly cut_id: string | null
  readonly platform: string
  readonly title: string
  readonly status: string
  /** `YYYY-MM-DD`, a local date with no zone attached (D95). */
  readonly scheduled_date: string
  /** `HH:MM`, 24-hour. */
  readonly scheduled_time24: string
  readonly has_ai_scenes: boolean
}

export interface WeekWindow {
  /** The Monday the grid starts on, `YYYY-MM-DD`. */
  readonly startDate: string
  /** Today in the workspace's zone, or null when it is not known. */
  readonly today: string | null
}

const DAYS_IN_WEEK = 7

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Mirrors `PLATFORM_LABELS` in `packages/mock/src/internal.ts`. */
const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
  linkedin: 'LinkedIn',
}

/**
 * Also the row order of the grid, so it is a decision rather than an accident:
 * the three platforms we publish to today, then LinkedIn.
 */
const PLATFORM_ORDER: readonly Platform[] = ['instagram', 'tiktok', 'youtube', 'linkedin']

/** Mirrors `POST_STATUS_LABELS` in `packages/mock/src/internal.ts`. */
const STATUS_LABELS: Record<PostStatus, string> = {
  published: 'Published',
  'published-private': 'Published (private)',
  scheduled: 'Scheduled',
  'needs-review': 'Needs review',
  approved: 'Approved',
}

const FALLBACK_THUMBNAIL_COLOR = THUMBNAIL_COLORS[0] ?? '#12545A'

function isPlatform(value: string): value is Platform {
  return value in PLATFORM_LABELS
}

function isPostStatus(value: string): value is PostStatus {
  return value in STATUS_LABELS
}

/**
 * `YYYY-MM-DD` arithmetic, done through a UTC date.
 *
 * `new Date('2026-11-17T00:00:00Z')` is midnight UTC and every accessor used
 * here is a `getUTC*` one, so the calendar never shifts by a day because the
 * server happens to sit west of Greenwich. These dates carry no zone (D95);
 * treating them as UTC *internally* is how they stay inert.
 */
function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

function isoFrom(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const date = utcDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return isoFrom(date)
}

/**
 * The Monday of the week an ISO date falls in.
 *
 * Monday because the grid's first column is Monday (`DAY_LABELS`), and the
 * `+ 6` before the modulo is what stops a Sunday — `getUTCDay()` calls it 0 —
 * being treated as the start of the week it actually ends.
 */
export function weekStartFor(isoDate: string): string {
  const offset = (utcDate(isoDate).getUTCDay() + 6) % DAYS_IN_WEEK
  return addDays(isoDate, -offset)
}

/** The last day of the week starting on `startDate`. */
export function weekEndFor(startDate: string): string {
  return addDays(startDate, DAYS_IN_WEEK - 1)
}

/**
 * `'2026-11-19'` → `'Thu'`.
 *
 * Exported for the co-pilot, which proposes "move your Thursday post to
 * Tuesday" and needs the day names of two real dates to say so. Indexed off
 * `getUTCDay()` rather than off a position in the week, so it is right for a
 * date outside the week being drawn.
 */
export function dayLabelFor(isoDate: string): string {
  // `DAY_LABELS` starts on Monday; `getUTCDay()` starts on Sunday.
  const index = (utcDate(isoDate).getUTCDay() + 6) % DAYS_IN_WEEK
  return DAY_LABELS[index] ?? ''
}

/** `'14:15'` → `'2:15 pm'`, the format the fixtures and the designs both use. */
export function timeLabelFor(time24: string): string {
  const [rawHours, minutes] = time24.split(':')
  const hours = Number(rawHours)

  // Returned unchanged rather than guessed: the column carries a regex check,
  // so this is reachable only if something wrote around it, and inventing
  // midnight would hide that.
  if (!Number.isInteger(hours) || hours < 0 || hours > 23 || minutes === undefined) {
    return time24
  }

  const meridiem = hours < 12 ? 'am' : 'pm'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12

  return `${hour12}:${minutes} ${meridiem}`
}

/**
 * A stable colour per post, so a chip does not change shade between renders.
 *
 * The fixtures take the colour from the cut the post was built from; there is
 * no cuts table yet, so this hashes the post id instead. Deterministic, and
 * presentational only — `THUMBNAIL_COLORS` is the palette from
 * `@mirrorline/ui` (DESIGN.md "Colors"), not a value invented here.
 */
export function thumbnailColorFor(postId: string): string {
  let hash = 0
  for (const character of postId) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_003
  }

  return THUMBNAIL_COLORS[hash % THUMBNAIL_COLORS.length] ?? FALLBACK_THUMBNAIL_COLOR
}

/**
 * One row to one `ScheduledPost`, or null when the row is not one we can draw.
 *
 * An unknown platform or status is dropped rather than coerced. Both columns
 * carry a check constraint, so a value outside the list means something wrote
 * past the schema — and a chip in the wrong row, or labelled "undefined", is a
 * worse outcome than a chip that is absent.
 */
export function toScheduledPost(row: ScheduledPostRow): ScheduledPost | null {
  if (!isPlatform(row.platform) || !isPostStatus(row.status)) return null

  return {
    id: row.id,
    cutId: row.cut_id,
    date: row.scheduled_date,
    timeLabel: timeLabelFor(row.scheduled_time24),
    time24: row.scheduled_time24,
    platform: row.platform,
    platformLabel: PLATFORM_LABELS[row.platform],
    title: row.title,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    hasAiScenes: row.has_ai_scenes,
    thumbnailColor: thumbnailColorFor(row.id),
  }
}

function dayFor(startDate: string, dayIndex: number, today: string | null): CalendarDay {
  const date = addDays(startDate, dayIndex)
  const asDate = utcDate(date)

  return {
    date,
    dayLabel: DAY_LABELS[dayIndex] ?? '',
    dayOfMonth: asDate.getUTCDate(),
    monthLabel: MONTH_LABELS[asDate.getUTCMonth()] ?? '',
    // `today === null` means the zone was never captured (D97). No column is
    // highlighted, which is the honest rendering of "we do not know".
    isToday: today !== null && date === today,
  }
}

function byTime(a: ScheduledPost, b: ScheduledPost): number {
  return a.time24.localeCompare(b.time24)
}

/**
 * The week, as the grid needs it.
 *
 * Rows are the platforms that actually have a post this week, in
 * `PLATFORM_ORDER`. Not the connected `social_accounts`, which would be the
 * truer source and has no connect flow behind it yet; and not all four
 * unconditionally, which would draw a LinkedIn row for an account that has
 * never posted there. An empty week therefore has no rows — which is also what
 * a brand-new workspace looks like, so the view has to handle it.
 */
export function buildWeekSchedule(
  rows: readonly ScheduledPostRow[],
  window: WeekWindow,
): WeekSchedule {
  const days = Array.from({ length: DAYS_IN_WEEK }, (_unused, dayIndex) =>
    dayFor(window.startDate, dayIndex, window.today),
  )

  const dates = new Set(days.map((day) => day.date))

  // Filtered here rather than trusted from the query: the reader asks for one
  // week, and this stays correct if a caller ever asks for more.
  const posts = rows
    .map(toScheduledPost)
    .filter((post): post is ScheduledPost => post !== null && dates.has(post.date))

  const platforms = PLATFORM_ORDER.filter((platform) =>
    posts.some((post) => post.platform === platform),
  )

  const calendarRows: readonly CalendarRow[] = platforms.map((platform) => {
    const forPlatform = posts.filter((post) => post.platform === platform)

    const cells: readonly CalendarCell[] = days.map((day) => ({
      date: day.date,
      posts: forPlatform.filter((post) => post.date === day.date).sort(byTime),
    }))

    return { platform, platformLabel: PLATFORM_LABELS[platform], cells }
  })

  return { days, rows: calendarRows }
}

/** Every chip on the week, flat. Mirrors the fixtures' `weekPosts`. */
export function weekPostsFrom(schedule: WeekSchedule): readonly ScheduledPost[] {
  return schedule.rows.flatMap((row) => row.cells.flatMap((cell) => cell.posts))
}

/* -------------------------------------------------------------------------- */
/* The slot a move names                                                      */
/* -------------------------------------------------------------------------- */

export interface Slot {
  readonly date: string
  readonly time24: string
}

export type ParsedSlot =
  | { readonly ok: true; readonly value: Slot }
  | { readonly ok: false; readonly message: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_24 = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

const BAD_SLOT = 'That is not a day and time we can schedule.'

/**
 * The target of a move, validated before it is sent.
 *
 * The values come from the grid's own day columns and the platform's own slot
 * menu, so in normal use they are already right. This is here because a server
 * action is a public endpoint: the two columns a member may write are
 * `scheduled_date` and `scheduled_time24` (D95), and "anybody who is signed in
 * can write anything into them" is not a guarantee worth having.
 *
 * `scheduled_time24` carries a regex check in the schema and `scheduled_date`
 * is a `date`, so a bad value would be refused anyway — as a `22007` or a
 * `23514`, several layers from the person who caused it. This turns it into a
 * sentence instead.
 *
 * The round-trip through `Date` is what rejects `2026-02-31`, which matches the
 * shape and is not a day.
 */
export function parseSlot(date: unknown, time24: unknown): ParsedSlot {
  if (typeof date !== 'string' || typeof time24 !== 'string') {
    return { ok: false, message: BAD_SLOT }
  }

  if (!ISO_DATE.test(date) || !TIME_24.test(time24)) {
    return { ok: false, message: BAD_SLOT }
  }

  if (isoFrom(utcDate(date)) !== date) {
    return { ok: false, message: BAD_SLOT }
  }

  return { ok: true, value: { date, time24 } }
}

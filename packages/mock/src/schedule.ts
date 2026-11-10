/**
 * Today's timeline (S2) and the week calendar (S6).
 *
 * Today's six rows are transcribed from docs/specs/08_MOCK_DATA.md. The rest
 * of the week is derived from the cuts and from the same posting times, with
 * no randomness, so the calendar screenshots never move.
 */

import { cutById, schedulableCutAt } from './cuts'
import { PLATFORM_LABELS, POST_STATUS_LABELS, TODAY, idSuffix, thumbnailColorAt } from './internal'
import type {
  BestTime,
  CalendarCell,
  CalendarDay,
  CalendarRow,
  Platform,
  PostStatus,
  ScheduledPost,
  WeekSchedule,
} from './types'

interface TodayRow {
  readonly timeLabel: string
  readonly time24: string
  readonly platform: Platform
  readonly title: string
  readonly status: PostStatus
  readonly cutId: string | null
  readonly hasAiScenes: boolean
}

const TODAY_ROWS: readonly TodayRow[] = [
  {
    timeLabel: '7:30 am',
    time24: '07:30',
    platform: 'instagram',
    title: "You're not tired. You're over-responsible.",
    status: 'published',
    cutId: 'cut-01',
    hasAiScenes: false,
  },
  {
    timeLabel: '9:00 am',
    time24: '09:00',
    platform: 'youtube',
    title: '3 words that stop a team from burning out',
    status: 'published',
    cutId: 'cut-03',
    hasAiScenes: false,
  },
  {
    timeLabel: '12:15 pm',
    time24: '12:15',
    platform: 'tiktok',
    title: 'Why your best people go quiet',
    status: 'published-private',
    cutId: 'cut-08',
    hasAiScenes: false,
  },
  {
    timeLabel: '2:15 pm',
    time24: '14:15',
    platform: 'instagram',
    title: '"The 3-word reframe" remake (AI scenes)',
    status: 'scheduled',
    cutId: null,
    hasAiScenes: true,
  },
  {
    timeLabel: '5:00 pm',
    time24: '17:00',
    platform: 'youtube',
    title: 'The 10-minute Friday habit',
    status: 'scheduled',
    cutId: 'cut-10',
    hasAiScenes: false,
  },
  {
    timeLabel: '7:45 pm',
    time24: '19:45',
    platform: 'tiktok',
    title: 'New managers: stop saying…',
    status: 'needs-review',
    cutId: 'cut-05',
    hasAiScenes: false,
  },
]

export const todaySchedule: readonly ScheduledPost[] = TODAY_ROWS.map((row, position) => ({
  id: `post-today-${idSuffix(position + 1)}`,
  cutId: row.cutId,
  date: TODAY,
  timeLabel: row.timeLabel,
  time24: row.time24,
  platform: row.platform,
  platformLabel: PLATFORM_LABELS[row.platform],
  title: row.title,
  status: row.status,
  statusLabel: POST_STATUS_LABELS[row.status],
  hasAiScenes: row.hasAiScenes,
  thumbnailColor: row.cutId ? cutById(row.cutId).thumbnailColor : thumbnailColorAt(position),
}))

// --- Week view: Mon 9 – Sun 15 November 2026 -------------------------------

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const WEEK_FIRST_DAY_OF_MONTH = 9
const WEEK_MONTH_LABEL = 'November'
const CHIPS_ON_DENSE_DAY = 3
const CHIPS_ON_LIGHT_DAY = 2
/** Tomorrow's 9 chips back the S6 batch bar: "Approve all 9 for tomorrow." */
const APPROVAL_DAY_INDEX = 1

export const weekDays: readonly CalendarDay[] = WEEK_DAY_LABELS.map((dayLabel, dayIndex) => {
  const dayOfMonth = WEEK_FIRST_DAY_OF_MONTH + dayIndex
  const date = `2026-11-${idSuffix(dayOfMonth)}`
  return {
    date,
    dayLabel,
    dayOfMonth,
    monthLabel: WEEK_MONTH_LABEL,
    isToday: date === TODAY,
  }
})

function calendarDayAt(dayIndex: number): CalendarDay {
  const day = weekDays[dayIndex]
  if (!day) {
    throw new Error(`No calendar day at index ${dayIndex}`)
  }
  return day
}

interface PlatformRowPlan {
  readonly platform: Platform
  /** Slot times reused from 08_MOCK_DATA.md, in posting order. */
  readonly slots: readonly BestTime[]
}

const PLATFORM_ROW_PLANS: readonly PlatformRowPlan[] = [
  {
    platform: 'instagram',
    slots: [
      { timeLabel: '7:30 am', time24: '07:30' },
      { timeLabel: '2:15 pm', time24: '14:15' },
      { timeLabel: '7:45 pm', time24: '19:45' },
    ],
  },
  {
    platform: 'tiktok',
    slots: [
      { timeLabel: '12:15 pm', time24: '12:15' },
      { timeLabel: '5:00 pm', time24: '17:00' },
      { timeLabel: '7:45 pm', time24: '19:45' },
    ],
  },
  {
    platform: 'youtube',
    slots: [
      { timeLabel: '9:00 am', time24: '09:00' },
      { timeLabel: '12:15 pm', time24: '12:15' },
      { timeLabel: '5:00 pm', time24: '17:00' },
    ],
  },
]

/** Tomorrow waits for approval; the day after is approved; the rest are queued. */
function statusForDay(dayIndex: number): PostStatus {
  if (dayIndex === APPROVAL_DAY_INDEX) {
    return 'needs-review'
  }
  if (dayIndex === APPROVAL_DAY_INDEX + 1) {
    return 'approved'
  }
  return 'scheduled'
}

function chipCountForDay(dayIndex: number): number {
  if (dayIndex === APPROVAL_DAY_INDEX) {
    return CHIPS_ON_DENSE_DAY
  }
  return dayIndex % 2 === 0 ? CHIPS_ON_DENSE_DAY : CHIPS_ON_LIGHT_DAY
}

function buildCell(plan: PlatformRowPlan, rowIndex: number, dayIndex: number): CalendarCell {
  const day = calendarDayAt(dayIndex)

  // Monday is today: reuse the rows from "Today's schedule" verbatim.
  if (day.isToday) {
    return {
      date: day.date,
      posts: todaySchedule.filter((post) => post.platform === plan.platform),
    }
  }

  const status = statusForDay(dayIndex)
  const chipCount = Math.min(chipCountForDay(dayIndex), plan.slots.length)
  const posts = plan.slots.slice(0, chipCount).map((slot, slotIndex) => {
    const cut = schedulableCutAt(
      (rowIndex * WEEK_DAY_LABELS.length + dayIndex) * CHIPS_ON_DENSE_DAY + slotIndex,
    )
    return {
      id: `post-${plan.platform}-${day.date}-${slot.time24.replace(':', '')}`,
      cutId: cut.id,
      date: day.date,
      timeLabel: slot.timeLabel,
      time24: slot.time24,
      platform: plan.platform,
      platformLabel: PLATFORM_LABELS[plan.platform],
      title: cut.hook,
      status,
      statusLabel: POST_STATUS_LABELS[status],
      hasAiScenes: false,
      thumbnailColor: cut.thumbnailColor,
    } satisfies ScheduledPost
  })

  return { date: day.date, posts }
}

const weekRows: readonly CalendarRow[] = PLATFORM_ROW_PLANS.map((plan, rowIndex) => ({
  platform: plan.platform,
  platformLabel: PLATFORM_LABELS[plan.platform],
  cells: weekDays.map((_day, dayIndex) => buildCell(plan, rowIndex, dayIndex)),
}))

export const weekSchedule: WeekSchedule = {
  days: weekDays,
  rows: weekRows,
}

/** Flat list of every chip on the week view, for counters and tests. */
export const weekPosts: readonly ScheduledPost[] = weekRows.flatMap((row) =>
  row.cells.flatMap((cell) => cell.posts),
)

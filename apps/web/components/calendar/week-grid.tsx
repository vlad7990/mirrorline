'use client'

/**
 * The week grid: 7 day columns across 3 platform rows.
 *
 * DESIGN.md "Layout": "Wide content (the calendar week grid, tables) scrolls
 * horizontally inside its card instead of breaking the page." The grid keeps
 * its own min-width and sits inside a `.scroll-x` wrapper, so at 390px the
 * card scrolls and the page does not.
 *
 * SC 1.3.1: it is a real <table>. The day is a <th scope="col"> and the
 * platform a <th scope="row">, so every chip is programmatically tied to the
 * day and the platform it sits under — exactly as @mirrorline/ui's StatTable
 * does inside the same `.scroll-x` wrapper.
 */

import type { PostStatus, ScheduledPost, WeekSchedule } from '@mirrorline/mock'
import { cn } from '@mirrorline/ui'

import { PostChip, STATUS_SWATCH_CLASS, statusWord } from './post-chip'

/**
 * Below this the seven columns squeeze the chips out of shape; above it the
 * grid stops fitting beside the drawer at 1440px and would scroll on a desktop
 * that has the room. These are the widths from the approved mockup.
 */
const GRID_MIN_WIDTH = 690
const PLATFORM_COLUMN_WIDTH = 92
const DAY_COLUMN_MIN_WIDTH = 78

/**
 * SC 1.4.1: every state a chip can show has to be named somewhere on the page,
 * including the two the mockup left out — approving a post used to make a new
 * green edge appear with nothing to explain it.
 */
const LEGEND_STATUSES: readonly PostStatus[] = [
  'published',
  'published-private',
  'scheduled',
  'needs-review',
  'approved',
]

export interface WeekGridProps {
  schedule: WeekSchedule
  /** ISO date of the day waiting for approval. Its column is tinted. */
  highlightDate: string | null
  /** The live status of a post, after any approvals made in this session. */
  statusOf: (post: ScheduledPost) => PostStatus
  selectedPostId: string | null
  onSelect: (postId: string) => void
}

/** "Tue 10" for every date in the week, so a chip can say which day it is on. */
function dayLabelsByDate(schedule: WeekSchedule): Readonly<Record<string, string>> {
  return Object.fromEntries(
    schedule.days.map((day) => [day.date, `${day.dayLabel} ${day.dayOfMonth}`]),
  )
}

export function WeekGrid({
  schedule,
  highlightDate,
  statusOf,
  selectedPostId,
  onSelect,
}: WeekGridProps) {
  const dayLabels = dayLabelsByDate(schedule)

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div className="scroll-x pb-1">
        <table
          className="w-full border-separate border-spacing-1.5"
          style={{ minWidth: GRID_MIN_WIDTH }}
        >
          <caption className="sr-only">
            Every post this week, by platform and day. Each chip opens the post for review.
          </caption>
          <thead>
            <tr>
              {/* The corner cell names the row-header column. */}
              <th scope="col" className="text-left" style={{ width: PLATFORM_COLUMN_WIDTH }}>
                <span className="sr-only">Platform</span>
              </th>
              {schedule.days.map((day) => (
                <th
                  key={day.date}
                  scope="col"
                  style={{ minWidth: DAY_COLUMN_MIN_WIDTH }}
                  className={cn(
                    'px-1.5 py-1 text-left align-bottom text-meta',
                    // Today is the coral one; the day waiting for approval is the
                    // near-black one above the tinted column.
                    day.isToday && 'font-bold text-on-accent-soft',
                    !day.isToday && day.date === highlightDate && 'font-bold text-text',
                    !day.isToday && day.date !== highlightDate && 'font-semibold text-text-muted',
                  )}
                >
                  {day.dayLabel} {day.dayOfMonth}
                  {day.isToday ? <span className="sr-only"> (today)</span> : null}
                  {!day.isToday && day.date === highlightDate ? (
                    <span className="sr-only"> (waiting for your approval)</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row) => (
              <GridRow
                key={row.platform}
                row={row}
                dayLabels={dayLabels}
                highlightDate={highlightDate}
                statusOf={statusOf}
                selectedPostId={selectedPostId}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3.5 text-caption font-normal text-on-neutral-soft">
        {LEGEND_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-2.5 rounded-[3px]', STATUS_SWATCH_CLASS[status])}
            />
            {statusWord(status)}
          </span>
        ))}
        {/* 02_BRAND_AND_VOICE: say the limit plainly rather than hide it. */}
        <span>TikTok posts stay private until our app is approved.</span>
      </div>
    </div>
  )
}

interface GridRowProps {
  row: WeekSchedule['rows'][number]
  dayLabels: Readonly<Record<string, string>>
  highlightDate: string | null
  statusOf: (post: ScheduledPost) => PostStatus
  selectedPostId: string | null
  onSelect: (postId: string) => void
}

function GridRow({
  row,
  dayLabels,
  highlightDate,
  statusOf,
  selectedPostId,
  onSelect,
}: GridRowProps) {
  return (
    <tr>
      {/* Sticky so the platform stays readable while the grid scrolls. */}
      <th
        scope="row"
        className="sticky left-0 z-10 bg-surface pr-2 text-left align-middle text-meta font-semibold text-text"
      >
        {row.platformLabel}
      </th>
      {row.cells.map((cell) => (
        <td key={`${row.platform}-${cell.date}`} className="align-top">
          <div
            className={cn(
              'flex min-h-[120px] flex-col gap-1.5 rounded-md p-1.5',
              cell.date === highlightDate ? 'bg-accent-soft/50' : 'bg-background',
            )}
          >
            {cell.posts.map((post) => (
              <PostChip
                key={post.id}
                post={post}
                status={statusOf(post)}
                dayLabel={dayLabels[cell.date] ?? ''}
                isSelected={post.id === selectedPostId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </td>
      ))}
    </tr>
  )
}

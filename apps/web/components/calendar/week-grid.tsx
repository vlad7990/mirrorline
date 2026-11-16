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
import type * as React from 'react'

import { TIKTOK_PRIVATE_UNTIL_APPROVED } from '@/lib/copy/platform-limits'
import { PostChip, STATUS_SWATCH_CLASS, statusWord } from './post-chip'
import { type ChipDragStart, type ChipDragState, DROP_CELL_ATTRIBUTE } from './use-chip-drag'

/**
 * Below this the seven columns squeeze the chips out of shape; above it the
 * grid stops fitting beside the drawer at 1440px and would scroll on a desktop
 * that has the room. These are the widths from the approved mockup.
 *
 * The table is `table-fixed` on purpose. With the browser's automatic layout a
 * column is as wide as its widest chip wants to be, so a single long post title
 * pushed each day column past 270px and only two of the seven fitted beside the
 * drawer. Fixed layout makes these numbers the real column widths and lets the
 * chip titles truncate instead, which is what the mockup does.
 *
 * 76 + 7x78 + 9x4 of horizontal border-spacing = 658, the grid's natural width.
 * The card gives it ~706px at 1440px, and fixed layout shares the surplus out,
 * so each day column lands near 84px — the mockup's density.
 */
const GRID_MIN_WIDTH = 658
const PLATFORM_COLUMN_WIDTH = 76
const DAY_COLUMN_WIDTH = 78

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
  /** The drag in progress, or null. Drives the lifted chip and the drop slot. */
  drag?: ChipDragState | null
  onChipPointerDown?: (start: ChipDragStart, event: React.PointerEvent) => void
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
  drag = null,
  onChipPointerDown,
}: WeekGridProps) {
  const dayLabels = dayLabelsByDate(schedule)

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div className="scroll-x pb-1">
        <table
          className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1.5"
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
                  style={{ width: DAY_COLUMN_WIDTH }}
                  className={cn(
                    'px-1 py-1 text-left align-bottom text-meta',
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
                drag={drag}
                onChipPointerDown={onChipPointerDown}
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
        {/* 02_BRAND_AND_VOICE: say the limit plainly rather than hide it.
            The sentence moved to `lib/copy/platform-limits.ts` in PR D, which
            shows the YouTube version of it on /pricing. Both are built from
            one template, so "the same words" survives a rewrite of either. */}
        <span>{TIKTOK_PRIVATE_UNTIL_APPROVED}</span>
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
  drag: ChipDragState | null
  onChipPointerDown?: (start: ChipDragStart, event: React.PointerEvent) => void
}

function GridRow({
  row,
  dayLabels,
  highlightDate,
  statusOf,
  selectedPostId,
  onSelect,
  drag,
  onChipPointerDown,
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
      {row.cells.map((cell) => {
        // The slot the pointer is over right now. Only the dragged chip's own
        // platform row can light up — `use-chip-drag` refuses the rest, so a
        // cell that cannot take the chip simply never highlights.
        const isDropSlot =
          drag?.over?.platform === row.platform && drag.over.date === cell.date
        // Where it started. Marked too, so letting go over home reads as
        // "back where it was" rather than as a drop that did nothing.
        const isDragOrigin =
          drag?.from.platform === row.platform && drag.from.date === cell.date

        return (
          <td key={`${row.platform}-${cell.date}`} className="align-top">
            <div
              // Read by `document.elementFromPoint` during a drag. The value
              // is the whole target, so the hook never has to walk the DOM
              // upwards guessing which row it landed in.
              {...{ [DROP_CELL_ATTRIBUTE]: `${row.platform}|${cell.date}` }}
              className={cn(
                'flex min-h-[120px] min-w-0 flex-col gap-1.5 rounded-md p-1',
                cell.date === highlightDate ? 'bg-accent-soft/50' : 'bg-background',
                // SC 1.4.11: a 2px inset ring rather than a fill, so the drop
                // slot is legible over both the plain and the tinted column
                // without changing either one's contrast with the chips on it.
                isDropSlot && 'ring-2 ring-inset ring-ink',
                isDragOrigin && !isDropSlot && 'ring-1 ring-inset ring-border-strong',
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
                  isDragging={drag?.postId === post.id}
                  onPointerDown={
                    onChipPointerDown
                      ? (event) =>
                          onChipPointerDown(
                            {
                              postId: post.id,
                              title: post.title,
                              timeLabel: post.timeLabel,
                              platform: row.platform,
                              date: cell.date,
                            },
                            event,
                          )
                      : undefined
                  }
                />
              ))}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

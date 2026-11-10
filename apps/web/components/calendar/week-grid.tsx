'use client'

/**
 * The week grid: 7 day columns across 3 platform rows.
 *
 * DESIGN.md "Layout": "Wide content (the calendar week grid, tables) scrolls
 * horizontally inside its card instead of breaking the page." The grid keeps
 * its own min-width and sits inside a `.scroll-x` wrapper, so at 390px the
 * card scrolls and the page does not.
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

/** DESIGN.md: the legend names three of the five states; the rest read on the chip. */
const LEGEND_STATUSES: readonly PostStatus[] = ['published', 'scheduled', 'needs-review']

export interface WeekGridProps {
  schedule: WeekSchedule
  /** ISO date of the day waiting for approval. Its column is tinted. */
  highlightDate: string | null
  /** The live status of a post, after any approvals made in this session. */
  statusOf: (post: ScheduledPost) => PostStatus
  selectedPostId: string | null
  onSelect: (postId: string) => void
}

export function WeekGrid({
  schedule,
  highlightDate,
  statusOf,
  selectedPostId,
  onSelect,
}: WeekGridProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <div className="scroll-x pb-1">
        <div
          className="grid gap-1.5"
          style={{
            minWidth: GRID_MIN_WIDTH,
            gridTemplateColumns: `${PLATFORM_COLUMN_WIDTH}px repeat(${schedule.days.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
          }}
        >
          {/* The corner cell above the platform labels. */}
          <span />
          {schedule.days.map((day) => (
            <span
              key={day.date}
              className={cn(
                'px-1.5 py-1 text-meta',
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
            </span>
          ))}

          {schedule.rows.map((row) => (
            <GridRow
              key={row.platform}
              row={row}
              highlightDate={highlightDate}
              statusOf={statusOf}
              selectedPostId={selectedPostId}
              onSelect={onSelect}
            />
          ))}
        </div>
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
  highlightDate: string | null
  statusOf: (post: ScheduledPost) => PostStatus
  selectedPostId: string | null
  onSelect: (postId: string) => void
}

function GridRow({ row, highlightDate, statusOf, selectedPostId, onSelect }: GridRowProps) {
  return (
    <>
      {/* Sticky so the platform stays readable while the grid scrolls. */}
      <span className="sticky left-0 z-10 flex items-center bg-surface pr-2 text-meta font-semibold text-text">
        {row.platformLabel}
      </span>
      {row.cells.map((cell) => (
        <div
          key={`${row.platform}-${cell.date}`}
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
              isSelected={post.id === selectedPostId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </>
  )
}

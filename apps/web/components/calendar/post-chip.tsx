'use client'

/**
 * One post on the week grid.
 *
 * DESIGN.md "Calendar post chip": "time, tiny thumbnail and truncated title,
 * with a 4px left edge showing status: grey published, blue scheduled, amber
 * review, green approved."
 *
 * DESIGN.md "Elevation": "Selected items: a 2px #14171C (or primary) border
 * instead of a shadow."
 *
 * The chip is a real button with a full sentence for a name, so the status is
 * never carried by the coloured edge alone.
 */

import type { PostStatus, ScheduledPost } from '@mirrorline/mock'
import { STATUS_STYLES, cn } from '@mirrorline/ui'
import type * as React from 'react'

/**
 * The 4px left edge, one token per lifecycle state.
 *
 * SC 1.4.11: a 4px edge that carries meaning needs 3:1 against the chip's
 * surface. `--color-warning` (#C98A12) only reaches 2.95:1 on light surface,
 * so "needs review" uses the much darker `on-warning-soft` instead. The other
 * four clear the floor as they are (success 3.45:1, info 4.72:1, and the two
 * greys are text tokens).
 */
export const STATUS_EDGE_CLASS: Record<PostStatus, string> = {
  published: 'border-l-text-muted',
  'published-private': 'border-l-text-muted',
  scheduled: 'border-l-info',
  'needs-review': 'border-l-on-warning-soft',
  approved: 'border-l-success',
}

/** The swatch the legend prints beside each word. It must match the edge. */
export const STATUS_SWATCH_CLASS: Record<PostStatus, string> = {
  published: 'bg-text-muted',
  'published-private': 'bg-text-muted',
  scheduled: 'bg-info',
  'needs-review': 'bg-on-warning-soft',
  approved: 'bg-success',
}

/** The word that always travels with the colour. */
export function statusWord(status: PostStatus): string {
  return STATUS_STYLES[status].word
}

export interface PostChipProps {
  post: ScheduledPost
  /** The live status, which may differ from `post.status` after an approval. */
  status: PostStatus
  /** "Tue 10", the day column this chip sits in. First thing the name says. */
  dayLabel: string
  isSelected: boolean
  onSelect: (postId: string) => void
  /** Begins a pointer drag. See `use-chip-drag.ts` for why it is not HTML5 DnD. */
  onPointerDown?: (event: React.PointerEvent) => void
  /** True while this chip is the one travelling, so it reads as lifted. */
  isDragging?: boolean
}

export function PostChip({
  post,
  status,
  dayLabel,
  isSelected,
  onSelect,
  onPointerDown,
  isDragging = false,
}: PostChipProps) {
  const word = statusWord(status)

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(post.id)}
      onPointerDown={onPointerDown}
      // The day comes first: a name without it leaves 20 chips sounding alike.
      aria-label={`${dayLabel}, ${post.timeLabel}, ${post.platformLabel}, ${post.title}, ${word.toLowerCase()}`}
      // The visible title is truncated to one line so seven day columns fit at
      // 1440px. A mouse can still read it whole here; `aria-label` above keeps
      // it for assistive tech, and the tooltip never becomes the chip's name.
      title={post.title}
      className={cn(
        'flex min-h-11 w-full min-w-0 items-center gap-0.5 rounded-md bg-surface p-1 text-left',
        'hover:bg-surface-subtle',
        // DESIGN.md "Motion — Press": a 3% dip on :active, fine pointers only,
        // dropped under prefers-reduced-motion. A chip is the smallest thing on
        // this screen you can press, so it is the one that most needs to say
        // so. `.press` owns the transition shorthand, which is why the hover
        // colour now changes at once rather than fading.
        'press',
        isSelected ? 'border-2 border-ink' : 'border border-border',
        'border-l-4',
        STATUS_EDGE_CLASS[status],
        // The chip left behind while the ghost travels. Dimmed rather than
        // removed: taking it out of flow would collapse the cell and shuffle
        // every other chip out from under the pointer mid-drag.
        isDragging && 'opacity-35',
      )}
    >
      {/* The thumbnail is one of the four fixed demo colours, so it stays a
          plain swatch rather than a theme token. It is too small for a viewer
          mat: a 1px surround at this size renders as a border, not a lightbox,
          so the drawer preview is where the chip's video meets the viewer. */}
      <span
        aria-hidden="true"
        className="h-[28px] w-[15px] shrink-0 rounded-sm"
        style={{ backgroundColor: post.thumbnailColor }}
      />
      <span aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
        {/* DESIGN.md "Calendar post chip": "time in mono". It is the slot the
            Publisher will post in, not something the studio wrote. */}
        <span className="machine text-[11px] font-bold leading-tight text-text">
          {post.timeLabel}
        </span>
        {/* One line, clipped with an ellipsis: the whole title lives in the
            chip's name and its tooltip, never in its width. */}
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-text">
          {post.title}
        </span>
        {/* SC 1.4.1: the status is a word on the chip, not only a coloured
            edge, so it survives both colour blindness and a greyscale print.
            A step smaller than the title so the narrow column still shows the
            word itself rather than its first syllable. */}
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-normal leading-tight tracking-tight text-text-muted">
          {word}
        </span>
      </span>
    </button>
  )
}

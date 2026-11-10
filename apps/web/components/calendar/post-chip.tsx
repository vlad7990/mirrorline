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
}

export function PostChip({ post, status, dayLabel, isSelected, onSelect }: PostChipProps) {
  const word = statusWord(status)

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(post.id)}
      // The day comes first: a name without it leaves 20 chips sounding alike.
      aria-label={`${dayLabel}, ${post.timeLabel}, ${post.platformLabel}, ${post.title}, ${word.toLowerCase()}`}
      // The visible title is truncated to one line so seven day columns fit at
      // 1440px. A mouse can still read it whole here; `aria-label` above keeps
      // it for assistive tech, and the tooltip never becomes the chip's name.
      title={post.title}
      className={cn(
        'flex min-h-11 w-full min-w-0 items-center gap-1 rounded-md bg-surface p-1 text-left',
        'transition-colors duration-150 hover:bg-surface-subtle',
        isSelected ? 'border-2 border-ink' : 'border border-border',
        'border-l-4',
        STATUS_EDGE_CLASS[status],
      )}
    >
      {/* The thumbnail is one of the four fixed demo colours, so it stays a
          plain swatch rather than a theme token. */}
      <span
        aria-hidden="true"
        className="h-[30px] w-[18px] shrink-0 rounded-sm"
        style={{ backgroundColor: post.thumbnailColor }}
      />
      <span aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-bold leading-tight text-text">{post.timeLabel}</span>
        {/* One line, clipped with an ellipsis: the whole title lives in the
            chip's name and its tooltip, never in its width. */}
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight text-text">
          {post.title}
        </span>
        {/* SC 1.4.1: the status is a word on the chip, not only a coloured
            edge, so it survives both colour blindness and a greyscale print. */}
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-normal leading-tight text-text-muted">
          {word}
        </span>
      </span>
    </button>
  )
}

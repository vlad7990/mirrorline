/**
 * The client's videos, which DESIGN.md calls the visual hero.
 *
 * DESIGN.md "Video card": "9:16 thumbnail with a burned-in caption, a length
 * badge (top left) and cut number (top right); then format and score, a
 * compliance chip, an optional reason line, and Preview plus Approve/Review/
 * Fix buttons."
 * DESIGN.md "Don't": "Don't show a trend as someone else's video; show the
 * format as an abstract storyboard." StoryboardFrames is that storyboard — it
 * renders empty frames and never an image.
 */

import * as React from 'react'

import { cn } from '../cn'
import { THUMBNAIL_COLORS } from '../tokens'
import { LogoMark } from './logo'
import { Card } from './primitives'
import { AiLabel, StatusChip, type Status } from './status'

/* -------------------------------------------------------------------------- */
/* VideoThumb                                                                  */
/* -------------------------------------------------------------------------- */

export interface VideoThumbProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The burned-in caption. */
  caption: string
  /** A phrase inside `caption` to highlight on sand in teal. */
  highlight?: string
  /** Position in the grid. Picks the demo colour; wraps every four. */
  index?: number
  /** "0:24". Sits top left. */
  length?: string
  /** Shown as "Cut 3", top right. */
  cutNumber?: number
  /** Adds the "AI scene" badge. Required whenever AI footage is used. */
  aiScene?: boolean
  /** A quiet line under the caption, e.g. "0:40 · @mayatorres.coach". */
  footnote?: React.ReactNode
}

/**
 * The demo thumbnails rotate through four fixed brand colours. These are the
 * only hues that are not theme tokens — DESIGN.md scopes them to "inside
 * thumbnails only", and they must not follow the theme or the white caption
 * would lose its contrast.
 */
function thumbColor(index: number): string {
  const count = THUMBNAIL_COLORS.length
  const safe = ((Math.trunc(index) % count) + count) % count
  return THUMBNAIL_COLORS[safe] ?? THUMBNAIL_COLORS[0]
}

/** Splits the caption so the key phrase can sit on its sand highlight. */
function renderCaption(caption: string, highlight?: string): React.ReactNode {
  if (!highlight) return caption
  const at = caption.indexOf(highlight)
  if (at === -1) return caption

  return (
    <>
      {caption.slice(0, at)}
      <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">{highlight}</mark>
      {caption.slice(at + highlight.length)}
    </>
  )
}

/** A 9:16 frame with the caption burned in, as it will look on the platform. */
export const VideoThumb = React.forwardRef<HTMLDivElement, VideoThumbProps>(function VideoThumb(
  {
    caption,
    highlight,
    index = 0,
    length,
    cutNumber,
    aiScene = false,
    footnote,
    className,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        // DESIGN.md "Shapes": "Video thumbnails 8px".
        'relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-thumb p-3.5',
        className,
      )}
      style={{ backgroundColor: thumbColor(index) }}
      {...props}
    >
      {length ? (
        <span className="absolute left-2.5 top-2.5 rounded-sm bg-on-primary px-1.5 py-0.5 font-body text-caption text-ink">
          {length}
        </span>
      ) : null}

      {cutNumber !== undefined || aiScene ? (
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {aiScene ? <AiLabel /> : null}
          {cutNumber !== undefined ? (
            <span className="rounded-sm bg-on-primary px-1.5 py-0.5 font-body text-caption text-ink">
              Cut {cutNumber}
            </span>
          ) : null}
        </span>
      ) : null}

      {/* Inter Tight 700, white. The frame behind it is always a dark demo
          colour, so on-primary (#FFFFFF) is right in both themes. */}
      <span className="font-heading text-overlay-caption text-on-primary">
        {renderCaption(caption, highlight)}
      </span>
      {footnote ? <span className="mt-2 text-caption text-demo-sand">{footnote}</span> : null}
    </div>
  )
})

/* -------------------------------------------------------------------------- */
/* VideoCard                                                                   */
/* -------------------------------------------------------------------------- */

export interface VideoCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Everything the thumbnail needs. */
  thumb: VideoThumbProps
  /** The hook, repeated as real text below the frame. Defaults to the caption. */
  title?: React.ReactNode
  /** "Hook clip", "Story", "Tip". */
  format: string
  /** 0–100. Rendered as "score 92". */
  score?: number
  status: Status
  /** Why it needs a human: "Claim needs a source". */
  reason?: string
  /** Preview, Approve, Review, Fix — the caller decides which. */
  actions?: React.ReactNode
  /** DESIGN.md "Elevation": selection is a 2px ink border, not a shadow. */
  selected?: boolean
}

export function VideoCard({
  thumb,
  title,
  format,
  score,
  status,
  reason,
  actions,
  selected = false,
  className,
  ...props
}: VideoCardProps) {
  return (
    <Card
      as="article"
      padding="none"
      selected={selected}
      className={cn('flex flex-col gap-2.5 p-2.5', className)}
      {...props}
    >
      <VideoThumb {...thumb} />
      <h3 className="m-0 px-0.5 font-body text-label leading-snug text-text">
        {title ?? thumb.caption}
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <span className="text-caption font-normal text-text-muted">
          {format}
          {score !== undefined ? ` · score ${score}` : ''}
        </span>
        <StatusChip status={status} />
      </div>
      {reason ? <p className="m-0 px-0.5 text-meta text-text-muted">{reason}</p> : null}
      {actions ? <div className="flex flex-wrap gap-2 px-0.5 pb-0.5">{actions}</div> : null}
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* StoryboardFrames                                                            */
/* -------------------------------------------------------------------------- */

export interface StoryboardBeat {
  /** "Hook question", "Common belief", "3-word reframe", "Call to action". */
  label: string
}

export interface StoryboardFramesProps extends React.HTMLAttributes<HTMLOListElement> {
  beats: readonly StoryboardBeat[]
  /** Names the storyboard for assistive technology. */
  label?: string
}

/**
 * One colour per beat, cycling. These mark position in the sequence, never a
 * status, so they carry no meaning beyond "this is beat two".
 */
const BEAT_BARS = ['bg-accent', 'bg-info', 'bg-success', 'bg-warning'] as const

/**
 * The abstract format recipe: empty 9:16 frames, each with a small coloured
 * bar and a beat label. Never a real video, never someone else's footage.
 */
export function StoryboardFrames({
  beats,
  label = 'Beats',
  className,
  ...props
}: StoryboardFramesProps) {
  return (
    <ol
      aria-label={label}
      className={cn('m-0 grid list-none grid-cols-4 gap-1.5 p-0', className)}
      {...props}
    >
      {beats.map((beat, index) => (
        <li key={`${beat.label}-${index}`} className="flex flex-col gap-1">
          <span
            aria-hidden="true"
            className="flex aspect-[9/16] items-end rounded-sm border border-border-strong bg-background p-1"
          >
            <span
              className={cn(
                'block h-1 w-full rounded-full',
                BEAT_BARS[index % BEAT_BARS.length] ?? BEAT_BARS[0],
              )}
            />
          </span>
          <span className="text-caption font-normal leading-tight text-text-muted">
            {beat.label}
          </span>
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* EmptyState                                                                  */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** "No uploads yet". */
  title: string
  /** One helpful line: "Drop a long video. We'll find the moments worth posting." */
  description?: React.ReactNode
  /** A single next step, if there is an obvious one. */
  action?: React.ReactNode
}

const EMPTY_MARK_SIZE = 48

/**
 * DESIGN.md "Empty state": "the loop logo, a short title and one helpful
 * line". The loop motif is the brand signature; no illustration, no emoji.
 */
export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <Card
      tone="dashed"
      padding="lg"
      className={cn('flex flex-col items-center gap-2.5 text-center', className)}
      {...props}
    >
      <LogoMark size={EMPTY_MARK_SIZE} />
      <p className="m-0 font-body text-body font-semibold text-text">{title}</p>
      {description ? (
        <p className="m-0 max-w-[48ch] text-body text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  )
}

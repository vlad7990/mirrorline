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
 *
 * Everything 9:16 in here sits on the `viewer` surface: ViewerPanel is the
 * lightbox itself, VideoCard frames a single cut in one, and StoryboardFrames
 * puts its empty beats on the same near-black. DESIGN.md "Do's": "Put 9:16
 * video on the viewer surface, in both themes, so footage looks the same to
 * everyone who approves it." The thumbnail fills stay on their demo brand
 * colours, which are the one set of hues that are not theme tokens.
 */

import * as React from 'react'

import { cn } from '../cn'
import { THUMBNAIL_COLORS } from '../tokens'
import { LogoMark } from './logo'
import { Card } from './primitives'
import { AiLabel, StatusChip, type Status } from './status'

/* -------------------------------------------------------------------------- */
/* ViewerPanel                                                                 */
/* -------------------------------------------------------------------------- */

/** DESIGN.md "components.viewer-panel" fixes the grid at 1–4 columns of 9:16. */
const VIEWER_COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

// `title` is omitted from the HTML attributes: the native one is a tooltip
// string, ours is the line printed on the viewer.
export interface ViewerPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Names the panel for assistive technology, e.g. "Preview". Supplying it
   * renders a <section>, so the label lands on a real region rather than on a
   * generic <div> where it would be ignored.
   */
  label?: string
  /** A quiet line above the frames: "Cut 3 of 5", "Sample data". */
  title?: React.ReactNode
  /** Controls, badges or captions below the frames. */
  footer?: React.ReactNode
  /** How many 9:16 items sit side by side. One by default. */
  columns?: 1 | 2 | 3 | 4
  /** Force the tag. Defaults to <section> when `label` is set, else <div>. */
  as?: 'div' | 'section'
}

/**
 * The lightbox. DESIGN.md "Viewer panel": "a near-black lightbox holding the
 * 9:16 frame, in both themes, with the AI label and any length or cut badges
 * sitting on it. Controls and captions use on-viewer text."
 *
 * It is the same near-black whichever theme the viewer chose, which is the
 * whole point: two people approving the same cut must see the same cut. That
 * is also why this is `viewer` and not `ink` — DESIGN.md keeps the two dark
 * roles separate and forbids substituting one for the other.
 *
 * Built on Card's `viewer` tone so the surface is defined in exactly one
 * place, at the 10px radius and 16px padding DESIGN.md specifies.
 */
export function ViewerPanel({
  label,
  title,
  footer,
  columns = 1,
  as,
  className,
  children,
  ...props
}: ViewerPanelProps) {
  const component = as ?? (label ? 'section' : 'div')

  return (
    <Card
      as={component}
      tone="viewer"
      padding="sm"
      aria-label={label}
      className={cn('flex flex-col gap-3', className)}
      {...props}
    >
      {title ? <p className="m-0 text-meta text-on-viewer/70">{title}</p> : null}
      <div className={cn('grid gap-2', VIEWER_COLUMNS[columns])}>{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-2 text-meta text-on-viewer/70">{footer}</div>
      ) : null}
    </Card>
  )
}

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
      {/* A length is a timing, which DESIGN.md puts in the machine's voice
          alongside costs and counts: "timings (0:24, 52:14)". Mono. */}
      {length ? (
        <span className="machine absolute left-2.5 top-2.5 rounded-sm bg-on-primary px-1.5 py-0.5 text-caption text-ink">
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

      {/* Geist 700, white, and deliberately NOT mono. A burned-in caption is
          the client speaking to their audience, not the machine reporting, so
          it stays in the studio's voice. The frame behind it is always a dark
          demo colour, so on-primary (#FFFFFF) is right in both themes. */}
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
      // The frame around a 9:16 cut is a lightbox, not a page. DESIGN.md
      // "Do's": "Put 9:16 video on the viewer surface, in both themes, so
      // footage looks the same to everyone who approves it." The thumbnail
      // keeps its own demo brand colour; what changes is the surround.
      tone="viewer"
      padding="none"
      selected={selected}
      className={cn(
        'flex flex-col gap-2.5 p-2.5',
        // Selection is still a 2px border, never a shadow — but the ink border
        // Card uses by default is almost invisible against the viewer, so it
        // takes the primary that DESIGN.md "Elevation" offers as the
        // alternative. tailwind-merge keeps the later border colour.
        selected && 'border-primary',
        className,
      )}
      {...props}
    >
      <VideoThumb {...thumb} />
      {/* The hook, repeated as real text. On the viewer, so on-viewer. */}
      <h3 className="m-0 px-0.5 font-body text-label leading-snug text-on-viewer">
        {title ?? thumb.caption}
      </h3>
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        {/* Format is a word, the score is a figure, and they share one line.
            Sans wins the line: breaking a phrase across two families to catch
            two digits reads as a typo, and DESIGN.md's tie-break is sans. */}
        <span className="text-caption font-normal text-on-viewer/70">
          {format}
          {score !== undefined ? ` · score ${score}` : ''}
        </span>
        <StatusChip status={status} />
      </div>
      {/* Prose explaining what a human has to look at. Sans. */}
      {reason ? <p className="m-0 px-0.5 text-meta text-on-viewer/70">{reason}</p> : null}
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
      className={cn(
        // These are 9:16 frames, so they sit on the viewer like every other
        // 9:16 thing in the product — the same near-black in both themes. It
        // also does the honest thing visually: an empty frame on the viewer
        // reads as a slot waiting for footage, where an empty frame on the
        // page read as a broken image.
        'm-0 grid list-none grid-cols-4 gap-1.5 rounded-lg bg-viewer p-2 text-on-viewer',
        className,
      )}
      {...props}
    >
      {beats.map((beat, index) => (
        <li key={`${beat.label}-${index}`} className="flex flex-col gap-1">
          <span
            aria-hidden="true"
            className="flex aspect-[9/16] items-end rounded-sm border border-on-viewer/20 bg-on-viewer/5 p-1"
          >
            <span
              className={cn(
                'block h-1 w-full rounded-full',
                BEAT_BARS[index % BEAT_BARS.length] ?? BEAT_BARS[0],
              )}
            />
          </span>
          {/* The beat name is the studio describing a format. Sans. */}
          <span className="text-caption font-normal leading-tight text-on-viewer/70">
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

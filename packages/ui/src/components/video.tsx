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
import { Card, type CardProps } from './primitives'
import { AiLabel, StatusChip, type Status } from './status'

/* -------------------------------------------------------------------------- */
/* ViewerPanel                                                                 */
/* -------------------------------------------------------------------------- */

// `title` is omitted from the HTML attributes: the native one is a tooltip
// string, ours is the heading printed on the viewer. The Card variants are
// omitted too — the surface is the whole point of this component, so a caller
// does not get to pick another tone.
export interface ViewerPanelProps extends Omit<CardProps, 'title' | 'tone' | 'padding' | 'selected'> {
  /** Printed top left, in the studio's voice: "What the gate held back". */
  title?: React.ReactNode
  /** h2 inside a page, h3 inside a section. Defaults to h3. */
  level?: 2 | 3
  /** Set when a heading elsewhere on the page already labels the panel. */
  titleId?: string
  /**
   * Top right. Machine output belongs here: a duration, a count, a limit.
   * Pass it already wrapped in `.machine` where it is a figure.
   */
  readout?: React.ReactNode
  /** A quiet line under the content: a length and handle, a sample-data note. */
  footnote?: React.ReactNode
  /**
   * Drop the mat to 4px and let the frame nearly meet the edge. For a
   * thumbnail small enough that a full 16px mat reads as a border.
   */
  flush?: boolean
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
 * place, at the lg radius and 16px padding DESIGN.md's `viewer-panel` fixes.
 * Because the tone carries `text-on-viewer`, the header, the footnote and
 * anything the caller nests inherit it — no call site repeats the colour.
 *
 * Laying the content out is the caller's job, through `className`: a single
 * frame centres itself in the mat, a contact sheet of twelve fills it. The
 * panel only owns the surface, the header and the footnote.
 */
export function ViewerPanel({
  as,
  title,
  level = 3,
  titleId,
  readout,
  footnote,
  flush = false,
  className,
  children,
  ...props
}: ViewerPanelProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  const hasHeader = Boolean(title) || Boolean(readout)

  return (
    <Card
      as={as}
      tone="viewer"
      padding={flush ? 'none' : 'sm'}
      className={cn(
        // No dark: variant anywhere here. That is the point of the surface.
        'flex flex-col',
        // A header and a footnote make the panel a composed block, which needs
        // more air than a frame and its length line do.
        hasHeader ? 'gap-4' : 'gap-2.5',
        flush && 'p-1',
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title ? (
            <Heading id={titleId} className="m-0 font-heading text-subtitle">
              {title}
            </Heading>
          ) : null}
          {/* A lone readout still belongs on the right: it is the machine
              annotating the frame, not a title for it. */}
          {readout ? <div className={cn('text-meta', !title && 'ml-auto')}>{readout}</div> : null}
        </header>
      ) : null}
      {children}
      {footnote ? <p className="m-0 text-meta">{footnote}</p> : null}
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
  /**
   * Real footage, laid behind the badges and the caption. Pass `ReelMedia` for
   * a file that should play in view; anything absolutely positioned will do.
   *
   * Without it the frame is a flat demo colour, which is the honest default:
   * a frame only looks like a reel when there is really a reel behind it.
   * Supplying it also lays a scrim under the caption, because white 700 over
   * arbitrary footage is not legible the way it is over a fixed brand colour.
   */
  media?: React.ReactNode
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
    media,
    className,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        // DESIGN.md "Shapes": video thumbnails 20px — the one role that is
        // deliberately softer than the machined chrome scale. `overflow-hidden`
        // is what makes any `media` passed in take the same corner.
        'relative flex aspect-[9/16] flex-col justify-end overflow-hidden rounded-thumb p-3.5',
        className,
      )}
      // The demo colour stays even behind footage: it is what shows while the
      // poster loads, so a frame is never briefly a white hole in the viewer.
      style={{ backgroundColor: thumbColor(index) }}
      {...props}
    >
      {media}

      {/* The scrim exists only over footage. Over a fixed demo colour the
          caption's contrast is already known good (the contrast test pins it),
          but over an arbitrary generated frame it is not, and a bright sky
          behind white 700 is unreadable. Bottom-weighted so it darkens the
          caption without flattening the image above it. */}
      {media ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-viewer/85 via-viewer/25 to-transparent"
        />
      ) : null}

      {/* A length is a timing, which DESIGN.md puts in the machine's voice
          alongside costs and counts: "timings (0:24, 52:14)". Mono. */}
      {length ? (
        <span className="machine absolute left-3.5 top-3.5 rounded-sm bg-on-primary px-1.5 py-0.5 text-caption text-ink">
          {length}
        </span>
      ) : null}

      {/* Badges inset 14px to match the content padding, not the old 10px: at
          a 20px corner radius a 10px inset puts them inside the curve. */}
      {cutNumber !== undefined || aiScene ? (
        <span className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
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
          demo colour or a scrimmed frame, so on-primary (#FFFFFF) is right in
          both themes.

          `relative` is load-bearing, not decoration: a statically positioned
          element paints below a positioned sibling in the same stacking
          context, so without it the scrim above would cover the caption. */}
      <span className="relative font-heading text-overlay-caption text-on-primary">
        {renderCaption(caption, highlight)}
      </span>
      {footnote ? (
        <span className="relative mt-2 text-caption text-demo-sand">{footnote}</span>
      ) : null}
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

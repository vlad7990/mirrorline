/**
 * The viewer surface, for public pages.
 *
 * DESIGN.md "Colors": `--color-viewer` is the lightbox every 9:16 frame sits
 * on, and it is the same near-black in both themes, so a client's footage does
 * not change colour because somebody flipped the theme. DESIGN.md
 * "Elevation & Depth" keeps the three dark roles separate: ink is a panel that
 * belongs to the page, the viewer is meant to disappear and leave the video.
 *
 * `@mirrorline/ui` does not export a ViewerPanel yet. This is the local one;
 * when the shared component lands, every call site here can switch to it
 * without changing its props.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

export interface ViewerPanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Sits top left on the viewer, in the studio's voice. */
  title?: React.ReactNode
  /**
   * Sits top right. Machine output belongs here: a duration, a count, a cost.
   * Pass it already wrapped in `.machine` where it is a figure.
   */
  readout?: React.ReactNode
  /** A quiet line under the content, on the viewer. */
  footnote?: React.ReactNode
  /** h2 inside a page, h3 inside a section. Defaults to h3. */
  level?: 2 | 3
  /** Set when the panel is labelled by a heading elsewhere on the page. */
  titleId?: string
}

/**
 * A near-black panel that holds 9:16 content. It carries its own text colour,
 * so anything inside inherits on-viewer rather than the page's text colour.
 */
export function ViewerPanel({
  title,
  readout,
  footnote,
  level = 3,
  titleId,
  className,
  children,
  ...props
}: ViewerPanelProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  const hasHeader = Boolean(title) || Boolean(readout)

  return (
    <section
      className={cn('flex flex-col gap-4 rounded-xl bg-viewer p-4 text-on-viewer sm:p-5', className)}
      {...props}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title ? (
            <Heading id={titleId} className="m-0 font-heading text-subtitle">
              {title}
            </Heading>
          ) : null}
          {readout ? <div className="text-meta text-on-viewer">{readout}</div> : null}
        </header>
      ) : null}
      {children}
      {footnote ? <p className="m-0 text-meta text-on-viewer">{footnote}</p> : null}
    </section>
  )
}

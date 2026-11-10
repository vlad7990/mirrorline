/**
 * The lightbox every 9:16 frame sits on.
 *
 * DESIGN.md "Colors": "Viewer (#07090D) and on-viewer (#E9ECF2): the lightbox.
 * Every 9:16 frame — the preview, the approvals queue, the player — sits on the
 * viewer surface, and it is the same near-black in both themes. A client's
 * footage must not change colour because somebody flipped a theme."
 *
 * DESIGN.md "Elevation & Depth" names three dark roles in order of depth:
 * surface-subtle, ink, viewer. This is the deepest one, so it never doubles as
 * an emphasis panel — if it is not carrying video, it is the wrong surface.
 *
 * LOCAL COPY. `ViewerPanel` is being added to @mirrorline/ui and is not
 * exported yet, so the studio holds its own until it is; the props and the
 * token pair are the ones DESIGN.md's `viewer-panel` component fixes
 * (background viewer, text on-viewer, radius lg, padding 16px), so swapping the
 * import later is a one-line change in this file.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

export interface ViewerPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as <figure>, <section>, … when the lightbox is a landmark. */
  as?: 'div' | 'figure' | 'section' | 'aside'
  /**
   * A line under the frame in on-viewer text: the length, the handle, the cut
   * number. Controls and captions on the viewer use this colour, never the
   * page's text token.
   */
  footer?: React.ReactNode
  /**
   * Drop the 16px mat and let the frame meet the edge. For a thumbnail small
   * enough that a full mat would read as a border rather than a lightbox.
   */
  flush?: boolean
}

export function ViewerPanel({
  as,
  footer,
  flush = false,
  className,
  children,
  ...props
}: ViewerPanelProps) {
  // The tag varies at runtime, but TypeScript would otherwise intersect the
  // props of every allowed element and reject all of them. Every option is a
  // plain block container, so typing it as the default is accurate.
  const Component = (as ?? 'div') as 'div'

  return (
    <Component
      className={cn(
        // No dark: variant anywhere here. That is the point of the surface.
        // Alignment is left to the caller: a single frame centres itself in the
        // mat, a contact sheet of them stretches to fill it.
        'flex flex-col gap-2.5 rounded-lg bg-viewer text-on-viewer',
        flush ? 'p-1' : 'p-4',
        className,
      )}
      {...props}
    >
      {children}
      {footer ? <span className="text-meta text-on-viewer/75">{footer}</span> : null}
    </Component>
  )
}

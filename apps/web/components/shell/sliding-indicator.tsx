'use client'

/**
 * The marker that slides between the items of a nav (17 §2).
 *
 * One component for both strips. The studio sidebar runs vertically and the
 * Results tabs horizontally, and the only difference is which axis the marker
 * travels on — two implementations would be two places to get the measuring
 * wrong.
 *
 * **It measures rather than counts.** The obvious version multiplies an index
 * by a row height, which is right until a label wraps to two lines or a tab is
 * wider than its neighbours — and the Results tabs are all different widths.
 * Reading the active element's own box is the version that cannot drift.
 *
 * **What it is not.** `studio-nav.tsx` records a decision worth keeping: the
 * *arrival of a studio screen* stays instant, because moving between screens
 * is something a person does dozens of times a day and a transition on it
 * reads as lag. This does not touch that. The link takes its active styling
 * immediately, nothing waits on the marker, and the marker is `aria-hidden`
 * decoration — the indicator catching up with a change that has already
 * happened, never the change itself.
 *
 * **No library.** `motion`'s `layoutId` is the usual way to do this and is
 * cleared by D19, but it is not installed, and installing a layout-animation
 * engine to move one rectangle between two measured positions is a dependency
 * for an arithmetic problem. CSS does the transitioning; this only supplies
 * the numbers. (`.choice-pill` in theme.css is the same idea without even the
 * measuring, because its two options are equal width.)
 */

import * as React from 'react'

export interface SlidingIndicatorProps {
  /** Which way the items run. */
  readonly axis: 'x' | 'y'
  /**
   * Re-measure whenever this changes — the current route for the sidebar, the
   * current tab for Results. The active element is found in the DOM, so the
   * value itself is unused: it is the signal that the DOM has moved on.
   */
  readonly activeKey: string
  readonly className?: string
}

export function SlidingIndicator({ axis, activeKey, className }: SlidingIndicatorProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [box, setBox] = React.useState<{ offset: number; size: number } | null>(null)

  // `useLayoutEffect` rather than `useEffect`: measuring after paint would
  // show the marker at its old position for a frame on every navigation.
  React.useLayoutEffect(() => {
    const marker = ref.current
    const container = marker?.parentElement
    if (!marker || !container) return

    const measure = () => {
      const active = container.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) {
        // No active item on this route, so the marker hides rather than
        // parking somewhere arbitrary and claiming a selection that is not
        // there.
        setBox(null)
        return
      }

      setBox(
        axis === 'y'
          ? { offset: active.offsetTop, size: active.offsetHeight }
          : { offset: active.offsetLeft, size: active.offsetWidth },
      )
    }

    measure()

    // Widths change with the font, the viewport and the drawer opening, and a
    // marker measured once is wrong after any of them.
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [axis, activeKey])

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-axis={axis}
      className={className}
      style={
        box
          ? ({
              '--indicator-offset': `${box.offset}px`,
              '--indicator-size': `${box.size}px`,
            } as React.CSSProperties)
          : { opacity: 0 }
      }
    />
  )
}

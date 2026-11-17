/**
 * A row of sample reels, every one of them a real generated frame.
 *
 * 19 v2 bans flat colour tiles on the inner pages, and that ban is the whole
 * reason this exists rather than a second call to `VideoThumb`. `VideoThumb`
 * falls back to one of four fixed demo colours when it is given no `media`,
 * which is the honest default on the home page — a frame only looks like a
 * reel when there is really a reel behind it — and the wrong default here,
 * where every frame has a file. This component cannot render an empty tile:
 * it takes `SampleFrame`s, which are by construction things with a file.
 *
 * It is not the marquee. `showcase-marquee.tsx` is an infinite two-row rail
 * that moves whether or not anyone is watching, and it belongs to the home
 * page's "different trades, the same week" claim. A strip is bounded, sits
 * inside a section, and answers a pointer rather than a clock — which is the
 * `.reel-push` hover in globals.css, standing in for PR E's hover-loops
 * because the budget says these frames stay stills (19 v2 §asset budget).
 *
 * A server component. The push is CSS and the frames are `<img>`.
 */

import { cn } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import type { SampleFrame } from './page-media'

export interface ReelStripItem {
  /** The frame. Always has a file; that is what the type means. */
  readonly frame: SampleFrame
  /**
   * The burned-in hook, as it would read on the platform.
   *
   * Optional, because a strip illustrating *range* wants faces and not
   * eight more sentences to read. When it is left out the frame shows the
   * picture and the label and nothing else.
   */
  readonly hook?: string
  /** A phrase inside `hook` to set on the sand highlight. */
  readonly highlight?: string
  /** "0:24". The machine's voice, so mono. */
  readonly lengthLabel?: string
}

export interface ReelStripProps {
  readonly items: readonly ReelStripItem[]
  /**
   * What the strip is, for a screen reader, e.g. "Sample reels made for
   * different trades". The list is labelled rather than left anonymous
   * because without it a reader meets eight unexplained images.
   */
  readonly label: string
  readonly className?: string
}

/**
 * The frames scroll sideways on a phone and wrap into a grid above it.
 *
 * A horizontally scrolling rail is right at 390px — eight 9:16 frames stacked
 * vertically is eight screens of scrolling for one section — and wrong on a
 * desktop, where there is room to see the set at once and a hidden overflow
 * is a thing nobody finds. So it is a scroller below `sm` and a grid above,
 * rather than one behaviour forced on both.
 *
 * The wrapper is focusable, which is what lets a keyboard user reach the
 * frames that are off-screen while it is a scroller. That is a requirement
 * rather than a nicety: a scrollport with no keyboard access fails WCAG
 * 2.1.1 outright.
 */
export function ReelStrip({ items, label, className }: ReelStripProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'm-0 flex list-none gap-3 p-0',
        'overflow-x-auto pb-2 sm:overflow-visible sm:pb-0',
        'sm:grid sm:grid-cols-4 sm:gap-4 lg:grid-cols-8',
        className,
      )}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <li
          key={item.frame.src}
          /* Fixed width while it is a scroller, auto once it is a grid.
             Without the `shrink-0` the flex row squeezes eight frames into
             the viewport instead of overflowing, which is how a scroller
             silently becomes eight slivers. */
          className="reel-push reveal-item w-[8.5rem] shrink-0 sm:w-auto"
          style={{ '--index': index % 4 } as React.CSSProperties}
        >
          <figure className="m-0">
            <div className="relative aspect-[9/16] overflow-hidden rounded-thumb bg-viewer">
              {/* `next/image` with a real `sizes`, which is the convention in
                  this app and the reason it carries no `eslint-disable`
                  anywhere. A frame renders at ~136px on a phone and ~130px in
                  the eight-column grid, so `sizes` is what stops the browser
                  fetching the full-width file for a tile. Decorative: the
                  hook below is the real text. */}
              <Image
                src={item.frame.src}
                alt=""
                aria-hidden="true"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 140px, (min-width: 640px) 25vw, 136px"
                className="object-cover"
              />

              {/* Bottom-weighted, so it darkens the hook without flattening
                  the picture above it. Unconditional, because every frame
                  here has a picture under it and white 700 over an arbitrary
                  generated frame is not legible the way it is over a fixed
                  demo colour. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-viewer/85 via-viewer/20 to-transparent"
              />

              {item.lengthLabel ? (
                <span className="machine absolute left-2.5 top-2.5 rounded-sm bg-on-primary px-1.5 py-0.5 text-caption text-ink">
                  {item.lengthLabel}
                </span>
              ) : null}

              {item.hook ? (
                <span className="absolute inset-x-2.5 bottom-2.5 font-heading text-overlay-caption text-on-primary">
                  {renderHook(item.hook, item.highlight)}
                </span>
              ) : null}
            </div>

            {/* One label under every frame rather than a badge on each one.
                At 136px a badge reading "AI-generated sample" covers the
                picture it is labelling, and the section's own note is not
                enough on its own — non-negotiable 4 is about the surface the
                generated thing is on. Under it, it is legible and it scales. */}
            <figcaption className="mt-2 text-caption text-text-muted">
              AI-generated sample
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}

/** Splits the hook so the key phrase can sit on its sand highlight. */
function renderHook(hook: string, highlight?: string): React.ReactNode {
  if (highlight === undefined) return hook
  const at = hook.indexOf(highlight)
  if (at === -1) return hook

  return (
    <>
      {hook.slice(0, at)}
      <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">{highlight}</mark>
      {hook.slice(at + highlight.length)}
    </>
  )
}

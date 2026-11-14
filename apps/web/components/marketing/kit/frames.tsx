/**
 * Two frames to put product pictures in: a browser, and a phone.
 *
 * 19's page table asks for "a current studio screenshot inside a browser
 * frame" on /product and a hotspot-annotated dashboard on /metrics, and for
 * reels dropped onto phone frames. Until now a screenshot on a public page
 * was a bare `<figure>` — a bright rectangle floating on an ink band, which
 * reads as an image pasted into a document rather than as software running.
 *
 * **Neither frame invents a device or a domain.** The browser chrome carries
 * the in-app path (`/app/calendar`) and no host: "mirrorline" is a
 * placeholder name (CLAUDE.md), and a URL bar reading `mirrorline.com` would
 * be a domain claim on a page that makes none. The phone has no maker's
 * silhouette and no logo for the same reason non-negotiable 3's platform
 * names stay as words — someone else's mark would imply a relationship we do
 * not have.
 *
 * Server components. A frame is a box.
 */

import { cn } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

/* -------------------------------------------------------------------------- */
/* BrowserFrame                                                                */
/* -------------------------------------------------------------------------- */

export interface BrowserFrameProps {
  /**
   * Basename under `/shots`, without the theme suffix: the component asks for
   * `<shot>-light.png` and `<shot>-dark.png` itself, which is the convention
   * `page-hero.tsx` set and the reason both themes stay in step.
   */
  readonly shot: string
  /**
   * What the screen shows, for someone who cannot see it. Written as a
   * sentence about the product, not as "screenshot of the agents page".
   */
  readonly alt: string
  /** The path in the chrome, e.g. `/app/calendar`. No host, on purpose. */
  readonly path: string
  /** The line under the frame. Says it is sample data, every time. */
  readonly caption?: React.ReactNode
  /** Hotspots and the like, laid over the screen. */
  readonly children?: React.ReactNode
  readonly className?: string
  /**
   * Sizes for the image. Defaults to the full content column; a tabbed tour
   * showing one frame at a time wants something narrower.
   */
  readonly sizes?: string
}

export function BrowserFrame({
  shot,
  alt,
  path,
  caption,
  children,
  className,
  sizes = '(min-width: 1024px) 760px, 100vw',
}: BrowserFrameProps) {
  return (
    <figure className={cn('m-0 flex flex-col', className)}>
      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface shadow-lg">
        {/* The chrome. Decorative in full: the three dots are furniture and
            the path is repeated by the caption and the alt text, so a screen
            reader hearing "slash app slash calendar" between a heading and a
            description would be hearing a picture of a browser read aloud. */}
        <div
          aria-hidden="true"
          className="flex items-center gap-3 border-b border-border bg-surface-subtle px-3 py-2.5"
        >
          <span className="flex shrink-0 gap-1.5">
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
          </span>
          <span className="machine min-w-0 flex-1 truncate rounded-sm bg-background px-2.5 py-1 text-caption text-text-muted">
            {path}
          </span>
        </div>

        <div className="relative aspect-[16/10]">
          {/* Two files, one shown at a time, exactly as the hero does it. A
              single screenshot cannot serve both themes: the gold studio in
              light on an ink band is a hole, and in dark on a snow band it is
              a smudge. */}
          <Image
            src={`/shots/${shot}-light.png`}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`/shots/${shot}-dark.png`}
            alt={alt}
            fill
            sizes={sizes}
            className="hidden object-cover object-top dark:block"
          />
          {children}
        </div>
      </div>

      {caption ? (
        <figcaption className="mt-3 text-meta text-text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  )
}

/* -------------------------------------------------------------------------- */
/* PhoneFrame                                                                  */
/* -------------------------------------------------------------------------- */

export interface PhoneFrameProps {
  /**
   * What goes on the screen — a `ReelStill`, a `ReelMedia`, anything
   * absolutely positioned.
   *
   * Required rather than optional. An empty phone is a flat colour tile with
   * a bezel drawn round it, and 19 v2 bans those outright: a frame only looks
   * like a reel when there is really a reel behind it.
   */
  readonly children: React.ReactNode
  /** A badge row over the screen, e.g. the AI label and a length. */
  readonly overlay?: React.ReactNode
  /** The line under the phone. */
  readonly caption?: React.ReactNode
  readonly className?: string
}

/**
 * A 9:16 screen in a plain dark bezel.
 *
 * The bezel is a ring and a radius, not a rendering of a handset: a drawn
 * device ages badly, implies a make, and at the ~200px these run on a page
 * nobody is looking at the chamfer anyway. What it buys is the thing the
 * section actually needs — a reel that reads as *posted* rather than as an
 * image in a grid.
 */
export function PhoneFrame({ children, overlay, caption, className }: PhoneFrameProps) {
  return (
    <figure className={cn('m-0 flex flex-col items-center', className)}>
      <div className="w-full rounded-[1.75rem] bg-ink p-2 shadow-lg ring-1 ring-on-ink-faint/20">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.25rem] bg-viewer">
          {children}

          {/* The speaker slot. Decorative, and the one piece of device
              drawing that earns its place: without it the screen reads as a
              rounded picture rather than as a phone. */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink/70"
          />

          {overlay ? (
            <span className="absolute inset-x-2.5 bottom-2.5 flex flex-wrap items-end gap-1.5">
              {overlay}
            </span>
          ) : null}
        </div>
      </div>

      {caption ? (
        <figcaption className="mt-3 text-center text-meta text-text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  )
}

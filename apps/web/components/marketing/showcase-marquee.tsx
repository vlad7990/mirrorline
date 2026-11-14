/**
 * Two rails of sample cards, drifting in opposite directions.
 *
 * From docs/design/handoff-v4 §Home: 210px 9:16 cards, the top row moving
 * left over 60s and the bottom row right over 70s. The mismatched durations
 * are the point — equal speeds read as one block sliding, not as a wall of
 * work.
 *
 * A server component. The loop is pure CSS, so there is no reason to ship
 * JavaScript for it: the list is rendered twice and translated by exactly
 * -50%, which lands the copy where the original started and makes the seam
 * invisible. `aria-hidden` on the duplicate keeps a screen reader from
 * hearing all eight hooks a second time.
 *
 * Under `prefers-reduced-motion` the animation stops and the rail simply
 * overflows, scrollable by hand — see the keyframes in theme.css. An endless
 * horizontal drift is exactly the motion that preference exists for.
 *
 * These are **fictional businesses**, not customers and not customer work.
 * The section heading carries that sentence; non-negotiable 7 is not
 * satisfied by it being true only in this comment.
 *
 * Each card carries a generated 9:16 still of a different fictional account
 * (D45). The tiles were flat brand colours until then, which left the
 * heading — "Different trades, the same week of work" — illustrated by twelve
 * rectangles that have no trade. Every frame is AI-generated and says so on
 * its face, because non-negotiable 4 is a rule about every surface and not
 * only about the studio.
 */

import { AiLabel, ReelStill, THUMBNAIL_COLORS, cn } from '@mirrorline/ui'
import * as React from 'react'

import { SHOWCASE_CARDS, type ShowcaseCard } from './home-content'

interface RailProps {
  readonly cards: readonly ShowcaseCard[]
  readonly direction: 'left' | 'right'
  /** Seconds for one full pass. Different per rail, on purpose. */
  readonly durationSeconds: number
  /** Distinguishes the two rails for anyone navigating by region. */
  readonly label: string
}

function Rail({ cards, direction, durationSeconds, label }: RailProps) {
  // Rendered twice so the -50% translation lands seamlessly.
  const doubled = [...cards, ...cards]

  return (
    // `tabIndex={0}` and the group role are not decoration: a region that
    // scrolls has to be reachable by keyboard, or its overflow is lost to
    // anyone not using a pointer. axe flags this as a serious violation
    // (`scrollable-region-focusable`), and it is right — under reduced
    // motion the rail stops moving and scrolling is the only way to read it.
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      /* `rail-track` names the view timeline the rail inside reads. It has to
         live here rather than on the rail: this element is an `overflow-x`
         scroll container, so an anonymous `view()` on a descendant would be
         measured horizontally *inside* it — permanently covered, permanently
         parked. This wrapper's own scrollport is the document. */
      className="rail-track overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Both classes on purpose, and the order in theme.css decides which
          wins. The timer marquee is the floor; where the browser has view
          timelines, `.rail-scroll-*` is defined later and takes over, so the
          rail answers the scroll instead of running on a clock — stop
          scrolling and it stops, rather than drifting at the reader.

          Under reduced motion neither applies: the timer classes are listed
          in the `reduce` block and the scroll classes live inside
          `no-preference`. The rail is still scrollable by hand, which is why
          the wrapper is focusable. */}
      <ul
        className={cn(
          'm-0 flex w-max list-none gap-4 p-0',
          direction === 'left'
            ? 'animate-marquee-left rail-scroll-left'
            : 'animate-marquee-right rail-scroll-right',
        )}
        /* A variable, not `animationDuration`. An inline duration beats every
           class, and a scroll-driven animation needs `auto` to span its
           timeline — a fixed one finishes instantly and parks at the end,
           which is exactly what the rail did until this was measured. The
           timer fallback reads the variable; the scroll-driven path is left
           on `auto`. */
        style={{ '--marquee-duration': `${durationSeconds}s` } as React.CSSProperties}
      >
        {doubled.map((card, index) => {
          const isDuplicate = index >= cards.length
          return (
            <li
              key={`${card.context}-${index}`}
              aria-hidden={isDuplicate ? 'true' : undefined}
              className="w-[210px] shrink-0"
            >
              <article
                className="relative flex aspect-[9/16] flex-col justify-between overflow-hidden rounded-thumb p-3.5"
                /* The demo colour stays behind the frame: it is what shows
                   while the still is still loading, so a tile is never
                   briefly a white hole in a dark band. */
                style={{ backgroundColor: THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length] }}
              >
                <ReelStill src={card.frameSrc} />

                {/* The same scrim VideoThumb lays over footage, for the same
                    reason: white 700 is legible over a fixed brand colour by
                    measurement, and over an arbitrary photograph it is not.
                    Bottom-weighted, so it darkens the caption without
                    flattening the frame above it. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-viewer/85 via-viewer/25 to-transparent"
                />

                <header className="relative flex items-start justify-between gap-2">
                  <span className="rounded-full bg-on-primary/90 px-2 py-0.5 text-caption font-semibold text-ink">
                    {card.context}
                  </span>
                  <span className="machine rounded-sm bg-on-primary/90 px-1.5 py-0.5 text-caption text-ink">
                    {card.lengthLabel}
                  </span>
                </header>

                {/* `relative` on both of these is load-bearing rather than
                    decoration: a statically positioned element paints below a
                    positioned sibling in the same stacking context, so without
                    it the scrim would cover the badges and the caption. */}
                <div className="relative flex flex-col items-start gap-2">
                  {/* Its own row, not the badge corner. "AI-generated sample"
                      does not fit beside a goal tag at 210px, and a label that
                      is cropped is not a label. */}
                  <AiLabel>AI-generated sample</AiLabel>

                  {/* The burned-in caption, set exactly as VideoThumb sets it:
                      the client speaking to their audience, so sans and not
                      mono, with the key phrase on its sand highlight. */}
                  <p className="m-0 font-heading text-overlay-caption text-on-primary">
                    {card.lead}{' '}
                    <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">
                      {card.highlight}
                    </mark>
                  </p>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ShowcaseMarquee() {
  // The second rail starts half-way through the set so the two never show
  // the same card side by side.
  const offset = Math.floor(SHOWCASE_CARDS.length / 2)
  const secondRow = [...SHOWCASE_CARDS.slice(offset), ...SHOWCASE_CARDS.slice(0, offset)]

  return (
    <div className="flex flex-col gap-4">
      <Rail
        cards={SHOWCASE_CARDS}
        direction="left"
        durationSeconds={60}
        label="Sample hooks, first row"
      />
      <Rail
        cards={secondRow}
        direction="right"
        durationSeconds={70}
        label="Sample hooks, second row"
      />
    </div>
  )
}

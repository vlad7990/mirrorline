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
 */

import { THUMBNAIL_COLORS, cn } from '@mirrorline/ui'

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
      className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul
        className={cn(
          'm-0 flex w-max list-none gap-4 p-0',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right',
        )}
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {doubled.map((card, index) => {
          const isDuplicate = index >= cards.length
          return (
            <li
              key={`${card.niche}-${index}`}
              aria-hidden={isDuplicate ? 'true' : undefined}
              className="w-[210px] shrink-0"
            >
              <article
                className="flex aspect-[9/16] flex-col justify-between rounded-thumb p-3.5"
                style={{ backgroundColor: THUMBNAIL_COLORS[index % THUMBNAIL_COLORS.length] }}
              >
                <header className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-on-primary/90 px-2 py-0.5 text-caption font-semibold text-ink">
                    {card.niche}
                  </span>
                  <span className="machine rounded-sm bg-on-primary/90 px-1.5 py-0.5 text-caption text-ink">
                    {card.lengthLabel}
                  </span>
                </header>

                {/* The burned-in caption, set exactly as VideoThumb sets it:
                    the client speaking to their audience, so sans and not
                    mono, with the key phrase on its sand highlight. */}
                <p className="m-0 font-heading text-overlay-caption text-on-primary">
                  {card.lead}{' '}
                  <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">
                    {card.highlight}
                  </mark>
                </p>
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

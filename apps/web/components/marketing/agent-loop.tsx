'use client'

/**
 * The seven agents, pinned: the section holds still while the reader scrolls
 * through the hand-off one agent at a time.
 *
 * The last of the devices from `docs/design/MOTION_STUDY.md` — "section
 * scrolls" — and the one that needed ScrollTrigger rather than CSS. A view
 * timeline can drive an animation from scroll position; it cannot hold an
 * element in place and convert further scrolling into a sequence. (D35.)
 *
 * **Why this section and not another.** Seven agents handing to each other is
 * the clearest explanation of what the product is, and it was rendered as a
 * static list — the one thing a sequence cannot be read as. Pinning buys the
 * reader's attention for the thing most worth explaining.
 *
 * **The fallback is the whole list, not a fragment.** Every agent's name and
 * description sits in the `<ol>` at all times, so with no JavaScript, no
 * GSAP, a narrow screen, or `prefers-reduced-motion`, this is exactly the
 * ladder it replaced. The stage is an enlargement of a row that is already
 * there, never the only copy of it.
 *
 * **It does not pin below `lg`.** A pinned section on a short touch screen
 * eats the viewport and fights the scroll, which is the objection that kept
 * ScrollSmoother out in D32. Narrow screens get the plain ladder.
 *
 * ## M8's two additions (PR E2)
 *
 * 17 §1 M8: "Keep D35's pin. Add a progress spine down the left and the
 * metric each agent owns appearing as its card activates." The pin is
 * untouched; both additions are below, and they resolve differently on the
 * one question that matters.
 *
 * **The spine fills behind the reader.** The ladder already drew a track
 * joining the numbers; the gold filling it is new, and it fills for rows the
 * sequence has *passed*. At rest — below `lg`, under reduced motion, before
 * the pin starts — nothing is filled, which is the honest state rather than a
 * missing one: with no pin there is no sequence being walked, and a spine
 * showing progress through a list nobody is being led through would report a
 * position that does not exist.
 *
 * **The metric does not hide when the motion is off.** M8 says it appears as
 * a card activates, and the stage does exactly that — one agent at a time,
 * changing under the reader. Doing only that would put a fact behind a scroll
 * position, and 17 §Accessibility is flat: "No information is visible only
 * through motion." A reader on a phone, with reduced motion on, or with no
 * JavaScript would get one metric of seven and no way to know the rest
 * existed. So the ladder carries all seven at all times and the motion is
 * emphasis — muted to full, between two tokens that each pass contrast alone.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { PUBLIC_AGENTS } from './agents'

/**
 * Scroll distance per agent while pinned.
 *
 * Tuned rather than picked: much less and the sequence flickers past before a
 * name can be read; much more and the page feels as though it has stopped
 * working. Seven at 320px is roughly two and a half screens for the whole
 * hand-off.
 */
const SCROLL_PER_AGENT = 320

/** Pin only where there is room for it. Below this, the ladder stands alone. */
const PIN_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'

/**
 * The sticky header's height, plus air. The pin starts below it.
 *
 * Measured, not guessed: the announcement bar and nav together put the
 * header's bottom edge at 123px, and a first attempt at 104 clipped both the
 * stage's counter and the first row of the ladder behind it.
 */
const HEADER_CLEARANCE = 140

export interface AgentLoopProps {
  /** The agent nothing gets past, marked in the ladder. */
  readonly gateAgentId: string
}

export function AgentLoop({ gateAgentId }: AgentLoopProps) {
  const sectionRef = React.useRef<HTMLDivElement>(null)
  const pinRef = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    const run = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)

      const mm = gsap.matchMedia()
      mm.add(PIN_QUERY, () => {
        const trigger = ScrollTrigger.create({
          trigger: section,
          // Below the sticky header, not at the top of the viewport. Pinned
          // at `top top` the stage's number and name sit *behind* the header
          // and only its description is readable — measured doing exactly
          // that. The offset is the header's height plus a little air.
          start: `top ${HEADER_CLEARANCE}px`,
          end: () => `+=${PUBLIC_AGENTS.length * SCROLL_PER_AGENT}`,
          pin,
          // No `scrub`: scrub ties a tween to progress and there is no tween
          // here, only an index, so progress is read directly instead.
          onUpdate: (self) => {
            const index = Math.min(
              PUBLIC_AGENTS.length - 1,
              Math.floor(self.progress * PUBLIC_AGENTS.length),
            )
            // React bails out on an identical value, so this stays cheap to
            // call on every scroll frame.
            setActive(index)
          },
        })

        // Handing the teardown to matchMedia means crossing the breakpoint,
        // or switching reduced motion on, unpins and restores the ladder.
        return () => {
          trigger.kill()
          setActive(0)
        }
      })

      cleanup = () => mm.revert()
    }

    void run()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  // `noUncheckedIndexedAccess` is on, and it is right to be: the index comes
  // from a scroll position, so the compiler is asking what happens if the
  // list is ever empty. Nothing renders, which is the honest answer.
  const current = PUBLIC_AGENTS[active] ?? PUBLIC_AGENTS[0]
  if (current === undefined) return null

  const progress = (active + 1) / PUBLIC_AGENTS.length

  return (
    <div ref={sectionRef}>
      <div ref={pinRef} className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          {/* The stage. Hidden from assistive technology because it is a
              magnified duplicate of a row in the list beside it — a screen
              reader that heard both would hear every agent twice. */}
          <div aria-hidden="true" className="hidden lg:flex lg:flex-col lg:gap-3">
            <span className="machine text-mono text-gold">
              {current.step} / {PUBLIC_AGENTS.length}
            </span>
            <p className="m-0 font-heading text-site-h2 text-text">{current.name}</p>
            <p className="m-0 max-w-[36ch] text-body text-text-muted">{current.short}</p>

            {/* 17 §1 M8: "the metric each agent owns appearing as its card
                activates". This is the half that genuinely appears — the
                stage shows one agent at a time, so the line changes under the
                reader as the hand-off advances. The ladder beside it carries
                the same metric on every row, always; see there for why. */}
            <p className="m-0 max-w-[36ch] text-caption text-gold">Owns {current.metric}</p>

            {/* How far through the hand-off the reader is. A rail rather than
                a percentage: this is a position in a sequence, not a
                measurement of anything. */}
            <span className="mt-2 block h-px w-full max-w-[36ch] bg-border">
              <span
                className="block h-px bg-gold transition-[width] duration-[var(--duration-dropdown)] ease-[var(--ease-out)]"
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          </div>

          <ol className="m-0 flex list-none flex-col p-0">
            {PUBLIC_AGENTS.map((agent, index) => {
              const isGate = agent.id === gateAgentId
              const isLast = index === PUBLIC_AGENTS.length - 1
              const isActive = index === active

              return (
                <li key={agent.id} className="flex gap-4 sm:gap-5">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'machine grid size-8 shrink-0 place-items-center rounded-full border',
                        'text-caption font-semibold transition-colors duration-[var(--duration-dropdown)]',
                        isGate
                          ? 'border-success bg-success-soft text-on-success-soft'
                          : isActive
                            ? 'border-gold bg-gold-soft text-gold-text'
                            : 'border-border-strong bg-surface text-text-muted',
                      )}
                    >
                      {agent.step}
                    </span>
                    {/* 17 §1 M8's progress spine. The track was already here
                        joining the numbers; what is new is the gold filling
                        it in behind the reader as the hand-off advances.

                        It fills for rows the sequence has *passed*, so at
                        rest — below `lg`, under reduced motion, or before the
                        pin starts — nothing is filled. That is the honest
                        state rather than a missing one: with no pin there is
                        no sequence being walked, and a spine showing progress
                        through a list nobody is being led through would be
                        reporting a position that does not exist. */}
                    {isLast ? null : (
                      <span aria-hidden="true" className="relative w-px flex-1 bg-border">
                        <span
                          /* Named, because a test has to find exactly this
                             and `.bg-gold.absolute` finds three other gold
                             layers on the home page. */
                          data-agent-spine-fill={index < active ? 'filled' : 'empty'}
                          className={cn(
                            'absolute inset-x-0 top-0 bg-gold',
                            'transition-[height] duration-[var(--duration-dropdown)] ease-[var(--ease-out)]',
                            index < active ? 'h-full' : 'h-0',
                          )}
                        />
                      </span>
                    )}
                  </div>
                  <div className={cn('flex min-w-0 flex-col gap-1', isLast ? 'pb-0' : 'pb-6')}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {/* The lit row is the one the stage is showing. Colour
                          only, between two tokens that each pass on their own
                          — the lesson from mirrorline-scroll-lit. */}
                      <h3
                        className={cn(
                          'm-0 font-heading text-subtitle transition-colors duration-[var(--duration-dropdown)]',
                          isActive ? 'text-text' : 'text-text-muted',
                        )}
                      >
                        {agent.name}
                      </h3>
                      {isGate ? (
                        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-on-success-soft">
                          The gate
                        </span>
                      ) : null}
                    </div>
                    <p className="m-0 max-w-[68ch] text-meta text-text-muted">{agent.short}</p>

                    {/* The metric, on every row and at every width, rather
                        than only on the lit one.

                        M8 says it "appears as its card activates", and the
                        stage does exactly that. Doing it here too would put a
                        fact behind a scroll position — and 17
                        §Accessibility is flat about it: "No information is
                        visible only through motion." Somebody on a phone,
                        with reduced motion on, or with no JavaScript would
                        get six of seven metrics and no way to know.

                        So the motion here is emphasis, not disclosure: the
                        line brightens from muted to full with its heading,
                        between two tokens that each pass contrast on their
                        own — the same device the heading above already uses,
                        and the lesson from mirrorline-scroll-lit. */}
                    <p
                      className={cn(
                        'm-0 max-w-[68ch] text-caption transition-colors duration-[var(--duration-dropdown)]',
                        isActive ? 'text-text' : 'text-text-muted',
                      )}
                    >
                      Owns {agent.metric}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

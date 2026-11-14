'use client'

/**
 * A heading that arrives a word at a time.
 *
 * The one thing in `docs/design/MOTION_STUDY.md` that CSS genuinely cannot
 * do. A scroll-driven CSS animation can move an element, but it cannot split
 * a sentence into its words — that needs the text broken into elements first,
 * which is what GSAP's SplitText does. Everything else in that study was
 * rebuilt as CSS (D32); this is the part that was not possible, and it is why
 * rule 10 gained its one named exception (D33).
 *
 * Three things this does that the reference site does not:
 *
 * 1. **It respects reduced motion.** Arigo's bundle contains no
 *    `prefers-reduced-motion` handling at all. `gsap.matchMedia()` scopes the
 *    whole animation to `no-preference`, and reverting the context puts the
 *    heading back untouched.
 * 2. **The text is real before any of this runs.** The heading is
 *    server-rendered and SplitText operates on the DOM it finds, so the words
 *    are in the HTML for search engines and for anyone whose JavaScript never
 *    arrives. If this component does nothing at all, the heading is still a
 *    heading.
 * 3. **It stays readable to a screen reader.** Splitting a sentence into
 *    per-word spans is how these effects usually break assistive technology.
 *    `aria: 'auto'` puts the original text on the container as an
 *    `aria-label` and hides the pieces.
 *
 * GSAP is imported dynamically so it lands in its own chunk rather than in
 * the shared bundle every page pays for.
 */

import * as React from 'react'

/**
 * `words` for a heading that should read as a sentence being spoken; `lines`
 * for a display headline that should rise as whole lines (17 §1 M1).
 *
 * Not the same animation with a different unit. Lines are **masked and move
 * without fading**; words fade as they arrive. See the branch below for why
 * the hero cannot afford the fade.
 */
export type SplitRevealType = 'words' | 'lines'

export interface SplitRevealProps {
  children: React.ReactNode
  className?: string
  /** Defaults to `words`, which is what the showcase heading has always used. */
  type?: SplitRevealType
  /**
   * The wrapper element. `div` by default; `span` when this sits *inside* a
   * heading rather than around one — a `div` inside an `<h1>` is invalid, and
   * the hero splits only part of its headline.
   */
  as?: 'div' | 'span'
}

export function SplitReveal({
  children,
  className,
  type = 'words',
  as: Wrapper = 'div',
}: SplitRevealProps) {
  const hostRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    const run = async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
      ])
      // A second effect pass (React strict mode) can resolve after unmount.
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger, SplitText)

      // Split the heading itself, never this wrapper. SplitText puts the
      // original sentence back as an `aria-label` on the element it is given
      // and marks every word `aria-hidden`. Handed the wrapper, it labels the
      // wrapper and leaves the <h2> holding nothing but hidden nodes — so the
      // heading's accessible name goes empty, and any section pointing at it
      // with `aria-labelledby` loses its name too. Measured doing exactly
      // that before this line existed.
      const target = host.firstElementChild ?? host

      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const isLines = type === 'lines'

        // `mask: 'lines'` wraps each line in its own overflow-hidden parent,
        // so a line can rise from behind the one above it rather than sliding
        // over the page. Words do not get it: a mask per word is a row of
        // little windows, which is a different and much busier effect.
        const split = SplitText.create(target, {
          type,
          // **`auto` for words, `none` for lines, and axe settled it.**
          //
          // `aria: 'auto'` moves the original text onto the split element as
          // an `aria-label` and hides the pieces. That is right for words:
          // without it a screen reader reads a sentence one stuttered word at
          // a time, and the element it labels there is an `<h2>`, where
          // `aria-label` is permitted.
          //
          // It is wrong for lines. The hero splits a plain `<span>` inside its
          // heading, and `aria-label` on an element with no role is
          // `aria-prohibited-attr` — a *serious* axe violation, which is how
          // this was found. Lines do not need the label either: a line is
          // already a readable run of text, so leaving the ARIA alone gives
          // the same sentence in the same order with nothing hidden.
          aria: isLines ? 'none' : 'auto',
          ...(isLines ? { mask: 'lines' as const } : {}),
        })

        gsap.from(isLines ? split.lines : split.words, {
          // Lines come from fully behind their mask; words only lift.
          yPercent: isLines ? 100 : 40,
          // **No fade on lines, and that is not a style preference.** This is
          // used on the hero headline, which is the page's LCP element — text
          // held at `opacity: 0` is text that has not been painted, so fading
          // it in moves Largest Contentful Paint by the whole duration of the
          // animation. It is also the lesson `mirrorline-reveal` in theme.css
          // carries: movement reads as arrival on its own, and the fade only
          // ever cost legibility.
          ...(isLines ? {} : { opacity: 0 }),
          duration: isLines ? 0.9 : 0.55,
          ease: 'power3.out',
          stagger: isLines ? 0.08 : 0.045,
          scrollTrigger: {
            trigger: host,
            // Late enough that the heading is properly on screen, early
            // enough that it is never still moving while it is being read.
            // A hero is above the fold, so this fires on load.
            start: 'top 85%',
            once: true,
          },
        })

        // Handing the teardown to matchMedia means a change of preference
        // mid-session puts the heading back the way it was.
        return () => split.revert()
      })

      cleanup = () => mm.revert()
    }

    void run()

    return () => {
      cancelled = true
      cleanup?.()
    }
    // `type` is in the list because it decides which split is built. It is a
    // constant at every call site today, so this never re-runs in practice —
    // but an effect that silently ignores a prop it reads is a bug waiting
    // for the first caller who changes one.
  }, [type])

  return (
    <Wrapper ref={hostRef as React.Ref<HTMLDivElement & HTMLSpanElement>} className={className}>
      {children}
    </Wrapper>
  )
}

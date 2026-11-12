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

export interface SplitRevealProps {
  children: React.ReactNode
  className?: string
}

/**
 * Words, not characters: a per-character cascade across a whole sentence
 * reads as a novelty. Per word still reads as a sentence being spoken.
 */
const SPLIT_TYPE = 'words'

export function SplitReveal({ children, className }: SplitRevealProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)

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
        const split = SplitText.create(target, { type: SPLIT_TYPE, aria: 'auto' })

        gsap.from(split.words, {
          yPercent: 40,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.045,
          scrollTrigger: {
            trigger: host,
            // Late enough that the heading is properly on screen, early
            // enough that it is never still moving while it is being read.
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
  }, [])

  return (
    <div ref={hostRef} className={className}>
      {children}
    </div>
  )
}

'use client'

/**
 * "One episode, twelve cuts", shown as the thing happening rather than as its
 * result: the section pins, and the reader scrolls an episode apart into
 * twelve cuts, through the gate, onto a week (17 §3).
 *
 * **The grid is not a copy of the wall — it *is* the wall.** `CutWall` renders
 * the same twelve frames it always did, with the same hooks, lengths, formats,
 * AI labels and compliance chips, and this component animates those real
 * elements. That is D35's rule and the reason the agent loop survived review:
 * the fallback must be the whole thing, never a fragment. With no JavaScript,
 * a narrow screen, reduced motion, or a browser GSAP will not load in, the
 * reader gets today's wall exactly as it is.
 *
 * **Everything the sequence adds is decorative, and says so.** The episode
 * player, the timeline, the playhead, the gate's scan line and the week strip
 * are `aria-hidden` and `display: none` until the sequence is actually
 * running. That is not tidiness. It is how CLS stays at zero — nothing ever
 * enters the flow — and how the reduced-motion fallback is guaranteed to be
 * the *final* state rather than a frozen first frame. The facts those layers
 * illustrate are already in the DOM: the episode's length is in the panel
 * readout, and the nine passed and three held are the chips on the frames.
 *
 * **Why `gsap.context()` and not `useGSAP`.** `useGSAP` imports `gsap` at
 * module scope, which would put GSAP in the home page's first load — roughly
 * 70 KB gzipped against spec 17's 30 KB budget, on the page whose mobile
 * Lighthouse score is an acceptance criterion. Imported inside the effect it
 * costs nothing until the reader reaches the section. `gsap.context()` is what
 * `useGSAP` wraps, so the cleanup contract is the same one, written out.
 *
 * **It does not pin on narrow screens** — D42. Spec 17 asks for a shorter
 * mobile pin; D35 ruled out pinning on short touch screens, because it eats
 * the viewport and fights the scroll, which was the objection that kept
 * ScrollSmoother out in the first place. Mobile gets the horizontal snap row
 * the spec asks for, without the pin.
 */

import { cutSummary, cuts, sourceVideo } from '@mirrorline/mock'
import Image from 'next/image'
import * as React from 'react'

import { CutWall } from './cut-wall'

/**
 * The episode's waveform, as bar heights in percent.
 *
 * Fixed rather than generated: this renders on the server and again on the
 * client, and anything random would differ between the two and patch itself
 * on hydration. It is not a real audio analysis of anything and does not
 * pretend to be — it is the shape of speech, standing in for a track the
 * reader cannot hear.
 */
const WAVEFORM = [
  18, 34, 52, 41, 66, 78, 59, 44, 71, 88, 62, 39, 27, 46, 69, 84, 73, 51, 36, 58, 79, 92, 67, 43,
  31, 55, 74, 86, 64, 48, 37, 61, 82, 70, 49, 33, 57, 76, 90, 68, 45, 29, 53, 72, 85, 60, 42, 35,
  63, 81, 75, 50, 38, 56, 77, 89, 65, 47, 30, 40,
] as const

/**
 * How many bars are drawn. The pattern above repeats to fill it.
 *
 * Sixty was the first attempt and it read as a row of fat blocks rather than
 * as a waveform: across a 950px bar that is a 15px block each. What makes
 * this legible as audio is many thin bars, so the count is well past the
 * number of distinct heights and the repeat is invisible at this size.
 */
const WAVE_BAR_COUNT = 160

/** Mon–Sun, in the machine's voice. */
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** The cadence the gate section states in prose, made of real slots here. */
const POSTS_PER_DAY = 3

/**
 * Scroll distance for the whole sequence, as a multiple of the viewport.
 *
 * 17 §3 asks for "about 250vh". Expressed against `innerHeight` rather than as
 * a pixel constant so the pacing is the same on a 900px laptop and a 1400px
 * display — a fixed number of pixels is a different number of screens on each.
 */
const SEQUENCE_VIEWPORTS = 2.5

/**
 * Pin only where there is room. The same query as the agent loop (D35), for
 * the same two reasons: a pinned section on a short touch screen fights the
 * scroll, and a reader who asked for stillness must not be held in place.
 */
const PIN_QUERY = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'

/** Pointer tilt is desktop-only, and off under reduced motion. */
const TILT_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

/** The sticky header's height plus air. Measured in D35, not guessed. */
const HEADER_CLEARANCE = 140

/** 17 §3: "±4° on the deck". */
const TILT_DEGREES = 4

/** Parallax depths, from 17's token table. Back drifts least, front most. */
const DEPTH_BACK = 0.15
const DEPTH_FRONT = 0.6

/** How far the front layer travels across the whole pin, in percent. */
const DEPTH_TRAVEL = 80

/** Where each of the twelve moments sits along the episode's timeline. */
const markerPercent = (index: number): number => ((index + 0.5) / cuts.length) * 100

export function OutputSequence() {
  const sectionRef = React.useRef<HTMLDivElement>(null)
  const pinRef = React.useRef<HTMLDivElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    const stage = stageRef.current
    if (!section || !pin || !stage) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    const run = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (cancelled) return

      gsap.registerPlugin(ScrollTrigger)

      const context = gsap.context(() => {
        const mm = gsap.matchMedia()

        mm.add(PIN_QUERY, () => {
          // Only now do the decorative layers exist as far as CSS is
          // concerned. Set here rather than on mount, so a reader who never
          // meets the conditions never sees a half-built stage.
          stage.dataset.sequence = 'on'

          const frames = gsap.utils.toArray<HTMLElement>('[data-cut-frame]')
          const markers = gsap.utils.toArray<HTMLElement>('[data-timeline-marker]')
          const bar = stage.querySelector<HTMLElement>('[data-timeline-bar]')

          /**
           * Where a frame has to start to look as though it is lifting out of
           * its own marker on the timeline bar.
           *
           * Transform-only: the frame never leaves its grid cell, so nothing
           * in the layout moves and CLS stays at zero. Measured rather than
           * guessed, and measured again on refresh — see `invalidateOnRefresh`.
           */
          const liftFrom = (frame: HTMLElement, index: number) => {
            if (!bar) return { x: 0, y: 0 }
            const barBox = bar.getBoundingClientRect()
            const frameBox = frame.getBoundingClientRect()
            const markerX = barBox.left + (markerPercent(index) / 100) * barBox.width
            return {
              x: markerX - (frameBox.left + frameBox.width / 2),
              y: barBox.top + barBox.height / 2 - (frameBox.top + frameBox.height / 2),
            }
          }

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: `top ${HEADER_CLEARANCE}px`,
              end: () => `+=${window.innerHeight * SEQUENCE_VIEWPORTS}`,
              pin,
              scrub: true,
              // The frames start from a measured position, so it has to be
              // measured again after a resize rather than kept from the first
              // layout.
              invalidateOnRefresh: true,
            },
          })

          timeline
            // The frames have to be out of sight from the very first frame of
            // the sequence, not from where their own tween starts at 2. A
            // `fromTo` placed later only applies its `from` when it begins, so
            // without this the opening stage was the episode laid over a grid
            // that was already fully drawn — which gives the whole thing away.
            .set(frames, { opacity: 0, scale: 0.12 }, 0)

            // 1 · Episode. The playhead crosses the bar, and the twelve
            //     moments light as it passes them.
            .fromTo('[data-playhead]', { xPercent: 0 }, { xPercent: 100, ease: 'none', duration: 2 }, 0)
            .fromTo(
              markers,
              { opacity: 0.25, scaleY: 0.6 },
              { opacity: 1, scaleY: 1, stagger: { each: 2 / cuts.length }, duration: 0.2 },
              0,
            )

            // 2 · Lift. Each moment leaves the bar and becomes a 9:16 frame.
            .fromTo(
              frames,
              {
                x: (index: number, target: HTMLElement) => liftFrom(target, index).x,
                y: (index: number, target: HTMLElement) => liftFrom(target, index).y,
                scale: 0.12,
                opacity: 0,
                rotate: 0,
              },
              {
                opacity: 1,
                scale: 0.78,
                // A shallow centred arc, so the deck reads as a deck rather
                // than as a row that happens to be crooked.
                rotate: (index: number) => (index - (cuts.length - 1) / 2) * 1.6,
                x: (index: number) => (index - (cuts.length - 1) / 2) * 14,
                y: 0,
                ease: 'power2.out',
                stagger: 0.06,
                duration: 1.4,
              },
              2,
            )

            // 3 · Shape. The deck settles into the grid it will stay in.
            .to(
              frames,
              { x: 0, y: 0, rotate: 0, scale: 1, ease: 'power2.inOut', stagger: 0.03, duration: 1.2 },
              4,
            )

            // 4 · Gate. A line sweeps the grid. The verdicts are already on
            //     the frames, so they arrive — they are not invented here.
            .fromTo(
              '[data-gate-scan]',
              { yPercent: -100, opacity: 0 },
              { yPercent: 100, opacity: 1, ease: 'none', duration: 1 },
              5.4,
            )
            .fromTo(
              '[data-cut-frame] [data-status-chip]',
              { opacity: 0, y: 6 },
              { opacity: 1, y: 0, stagger: 0.04, duration: 0.4 },
              5.6,
            )
            .to('[data-gate-scan]', { opacity: 0, duration: 0.2 }, 6.4)

            // 5 · Schedule. The week the passed cuts go out on.
            .fromTo(
              '[data-week-strip]',
              { yPercent: 40, opacity: 0 },
              { yPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.8 },
              6.4,
            )

          // The episode clears as its cuts leave it, not at the end. It is
          // painted over the wall, so holding it to the last stage would mean
          // reading the gate's verdicts through a 16:9 player.
          timeline.to('[data-episode]', { opacity: 0, ease: 'power1.out', duration: 1 }, 2.4)

          // Depth. Three layers crossing the pin at different rates is what
          // makes it one scene rather than three animations that happen to be
          // playing at once.
          timeline.fromTo(
            '[data-layer-back]',
            { yPercent: 0 },
            { yPercent: -DEPTH_TRAVEL * DEPTH_BACK, ease: 'none', duration: 7.2 },
            0,
          )
          timeline.fromTo(
            '[data-layer-front]',
            { yPercent: 0 },
            { yPercent: -DEPTH_TRAVEL * DEPTH_FRONT, ease: 'none', duration: 7.2 },
            0,
          )

          return () => {
            delete stage.dataset.sequence
            // Transforms the timeline set on the real grid have to come off,
            // or the wall keeps a scroll position it no longer has a reason
            // for. `clearProps` is the only thing that undoes a set on
            // elements this component does not own.
            gsap.set('[data-cut-frame]', { clearProps: 'all' })
            gsap.set('[data-cut-frame] [data-status-chip]', { clearProps: 'all' })
          }
        })

        // The tilt is its own query: a desktop reader gets it whether or not
        // the viewport is wide enough for the pin.
        mm.add(TILT_QUERY, () => {
          const rotateX = gsap.quickTo(stage, 'rotationX', { duration: 0.4, ease: 'power3.out' })
          const rotateY = gsap.quickTo(stage, 'rotationY', { duration: 0.4, ease: 'power3.out' })

          const onPointerMove = (event: PointerEvent) => {
            const box = stage.getBoundingClientRect()
            const fromCentreX = (event.clientX - (box.left + box.width / 2)) / (box.width / 2)
            const fromCentreY = (event.clientY - (box.top + box.height / 2)) / (box.height / 2)
            rotateY(gsap.utils.clamp(-1, 1, fromCentreX) * TILT_DEGREES)
            rotateX(gsap.utils.clamp(-1, 1, fromCentreY) * -TILT_DEGREES)
          }

          const onPointerLeave = () => {
            rotateX(0)
            rotateY(0)
          }

          stage.addEventListener('pointermove', onPointerMove)
          stage.addEventListener('pointerleave', onPointerLeave)

          return () => {
            stage.removeEventListener('pointermove', onPointerMove)
            stage.removeEventListener('pointerleave', onPointerLeave)
            gsap.set(stage, { clearProps: 'rotationX,rotationY' })
          }
        })

        cleanup = () => mm.revert()
      }, stage)

      // `context.revert()` undoes everything created inside it, which is what
      // `useGSAP` does on unmount. The matchMedia teardowns run first, so the
      // grid is handed back before the context is dropped.
      const revertQueries = cleanup
      cleanup = () => {
        revertQueries?.()
        context.revert()
      }
    }

    void run()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  return (
    <div ref={sectionRef}>
      <div ref={pinRef}>
        <div ref={stageRef} className="output-stage">
          {/* Back layer (0.15): the episode, blurred and very dark, so the
              frames in front of it have something to be in front of. */}
          <div aria-hidden="true" data-layer-back className="output-layer-back" />

          {/* The episode and its timeline. Decorative: the panel readout below
              already states the episode's length in words. */}
          <div aria-hidden="true" data-episode className="output-episode">
            {/* A real 16:9 frame rather than the empty grey box this was. The
                image is the same AI-generated room the hero uses, which is
                the honest choice twice over: it is a room an episode would
                actually be recorded in, and it is already generated material
                this site labels as such. The section's paragraph below says
                every frame here is AI-generated; the chip says it again,
                where the frame is. */}
            <div className="output-episode-frame">
              <Image
                src="/hero/studio-1920.webp"
                alt=""
                width={1920}
                height={1080}
                sizes="(min-width: 64rem) 760px, 100vw"
                className="output-episode-image"
              />
              <span className="output-episode-chip machine text-mono">
                {sourceVideo.durationLabel}
              </span>
              {/* Non-negotiable 4, on the frame itself. */}
              <span className="output-episode-ai">AI-generated</span>
            </div>
            <div data-timeline-bar className="output-timeline">
              {/* The waveform the playhead crosses. Bars, not an image: a
                  picture of a waveform is one more asset to keep honest, and
                  this is decoration standing in for audio nobody can hear.
                  The heights are a fixed pattern rather than random — a
                  `Math.random` here is a hydration mismatch waiting to
                  happen, and it would also redraw on every navigation. */}
              <span aria-hidden="true" className="output-wave">
                {Array.from({ length: WAVE_BAR_COUNT }, (_, index) => (
                  <span
                    key={index}
                    className="output-wave-bar"
                    style={{ height: `${WAVEFORM[index % WAVEFORM.length]}%` }}
                  />
                ))}
              </span>
              {cuts.map((cut, index) => (
                <span
                  key={cut.id}
                  data-timeline-marker
                  className="output-marker"
                  style={{ left: `${markerPercent(index)}%` }}
                />
              ))}
              <span data-playhead className="output-playhead" />
            </div>
          </div>

          {/* The wall itself — the real one, and the only copy of it. */}
          <div className="output-wall">
            <CutWall sequenced />
            <span aria-hidden="true" data-gate-scan className="output-scan" />
          </div>

          {/* Front layer (0.6): the week the passed cuts go out on, in the
              same figures the gate section states in prose. */}
          <div aria-hidden="true" data-layer-front className="output-front">
            {/* A real week, not a pill. Seven columns, and the nine cuts that
                passed land three to a day across the first three — which is
                exactly what "three a day" and "nine passed" mean together,
                rather than a sentence asserting both and showing neither.

                Thursday to Sunday are empty on purpose and the caption says
                why. Filling them would mean drawing fourteen cuts this
                episode did not produce, which is the kind of flattering
                rounding non-negotiable 7 exists to stop. */}
            <div data-week-strip className="output-week">
              <div className="output-week-grid">
                {WEEK_DAYS.map((day, dayIndex) => (
                  <div key={day} className="output-week-day">
                    <span className="output-week-label machine text-mono">{day}</span>
                    <div className="output-week-slots">
                      {Array.from({ length: POSTS_PER_DAY }, (_, slot) => {
                        const filled = dayIndex * POSTS_PER_DAY + slot < cutSummary.passed
                        return (
                          <span
                            key={slot}
                            data-week-slot
                            className={filled ? 'output-week-cut' : 'output-week-empty'}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <span className="output-week-note text-meta">
                <span className="machine">{cutSummary.passed}</span> passed ·{' '}
                <span className="machine">{cutSummary.needsYourEye}</span> held · three a day. The
                rest of the week comes from the next episode.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

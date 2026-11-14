/**
 * The hero's depth: three layers travelling at three speeds, plus the inset
 * preview in the corner (17 §1 M1).
 *
 * Back is the generated room, which `HeroBackdrop` already paints and which
 * this moves slowest. Mid is the gold glow and the grain. Front is three
 * floating 9:16 cut cards, which move most and sit at a slight angle — so the
 * hero reads as a room with things in it rather than as a photograph with a
 * headline laid on top.
 *
 * **It is CSS, not GSAP.** 17 §1 names `scroll()` for the depth and is right
 * to: this is three elements translating against scroll position, which is
 * exactly what a scroll-driven animation does, off the main thread and with no
 * JavaScript at all. GSAP earned the Output sequence because that has ordered
 * stages; this has none. The hero is also the page's LCP, and the cheapest
 * thing to put above the fold is nothing.
 *
 * **Everything here is labelled, and that is not incidental.** The cards show
 * generated footage of a presenter who does not exist, so non-negotiable 4
 * applies to them exactly as it does to the room behind them. The floating
 * cards are `aria-hidden` decoration *and* covered by the hero's own
 * disclosure line; the inset preview is a real, visible frame, so it carries
 * its own "Sample" and "AI scene" labels where a reader will meet them. A
 * generated face in a hero with the label further down the page is the exact
 * gap that rule exists to close.
 */

import { cuts } from '@mirrorline/mock'
import { VideoThumb } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import { cutMedia } from './cut-media'
import { reelAsset } from './reel-assets'

/**
 * The three cuts that float in the hero, and the one in the corner.
 *
 * Taken from the front of the same twelve the Output section shows rather than
 * chosen: these are cuts of one episode, and picking favourites here would
 * quietly imply a best-of that the demo data does not contain.
 */
const FLOATING_COUNT = 3

/** The cut the inset preview plays. The first, for the same reason. */
const PREVIEW_CUT_INDEX = 0

/** Where each floating card sits, and how far it leans. Hand-placed. */
const FLOAT_POSITIONS = [
  { className: 'hero-float-a', rotate: -6 },
  { className: 'hero-float-b', rotate: 4 },
  { className: 'hero-float-c', rotate: -3 },
] as const

export function HeroDepth() {
  const floating = cuts.slice(0, FLOATING_COUNT)
  const previewCut = cuts[PREVIEW_CUT_INDEX]

  return (
    <>
      {/* Mid (0.35): the gold glow and the grain. The only layer with no
          content of its own. */}
      <div aria-hidden="true" className="hero-glow" />

      {/* Front (0.6): the floating cuts.
          `aria-hidden` because they are three of the twelve frames the Output
          section lists in full — a screen reader meeting them here would hear
          the same hooks twice, the first time with none of their context. */}
      <ul aria-hidden="true" className="hero-floats">
        {floating.map((cut, index) => {
          const position = FLOAT_POSITIONS[index]
          const asset = reelAsset(cut.id)
          if (!position || !asset) return null

          return (
            <li
              key={cut.id}
              className={`hero-float ${position.className}`}
              style={{ '--float-rotate': `${position.rotate}deg` } as React.CSSProperties}
            >
              {/* A still, never the looping file. Three videos decoding above
                  the fold is the cheapest way to lose the mobile Lighthouse
                  score this plan is held to, and a card this small at this
                  angle reads as a frame either way. */}
              <Image
                src={asset.posterSrc}
                alt=""
                width={180}
                height={320}
                sizes="180px"
                className="hero-float-image"
              />
              <span className="hero-float-caption">{cut.hook}</span>
            </li>
          )
        })}
      </ul>

      {/* The inset preview (Aura). A real frame rather than decoration: it
          plays, it is labelled, and it is the one place in the hero a reader
          can see what the product actually makes. */}
      {previewCut ? (
        <div className="hero-inset">
          <VideoThumb
            aiScene
            caption={previewCut.hook}
            highlight={previewCut.highlightPhrase}
            cutNumber={previewCut.index}
            index={PREVIEW_CUT_INDEX}
            length={previewCut.lengthLabel}
            media={cutMedia(previewCut.id)}
            footnote={<span className="machine">Sample · {previewCut.lengthLabel}</span>}
          />
        </div>
      ) : null}
    </>
  )
}

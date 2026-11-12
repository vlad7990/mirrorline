/**
 * The footage for a cut, ready to drop into `VideoThumb`'s `media` slot.
 *
 * One lookup shared by every surface that shows a 9:16 frame, because the cut
 * wall is not the only one: the agents page shows the three cuts the gate held
 * back at nearly full width, and those were the largest coloured blocks left
 * on the site. A per-page copy of this branch is how one of them gets fixed
 * and the others quietly do not.
 */

import { ReelMedia, ReelStill } from '@mirrorline/ui'
import * as React from 'react'

import { reelAsset } from './reel-assets'

/**
 * How far apart consecutive cuts start, in seconds.
 *
 * The clips are five seconds long, so 1.3 walks the whole loop without ever
 * landing two neighbours on the same frame: twelve tiles spread across the
 * clip rather than clustering at the start.
 */
const STAGGER_STEP_SECONDS = 1.3

/**
 * A stable start offset for a cut, derived from its id.
 *
 * Derived rather than random on purpose. These frames render on the server
 * first, and `Math.random()` would produce a different offset there than in
 * the browser, which is a hydration mismatch. The trailing digits of the cut
 * id are already a stable sequence, so they are the seed.
 */
function startOffsetFor(cutId: string): number {
  const digits = cutId.match(/\d+$/)
  if (digits === null) return 0
  return Number(digits[0]) * STAGGER_STEP_SECONDS
}

/**
 * What goes behind the badges: a player, a still, or nothing.
 *
 * Three cases, written as three cases. A cut with a file that moves gets the
 * client-side player; a cut with only a generated still gets a plain
 * server-rendered `<img>` and costs no JavaScript; a cut with neither returns
 * `undefined`, which leaves `VideoThumb` on its flat demo colour rather than
 * letting an empty frame imply footage that does not exist.
 */
export function cutMedia(cutId: string): React.ReactNode {
  const reel = reelAsset(cutId)
  if (reel === null) return undefined
  if (reel.videoSrc === undefined) return <ReelStill src={reel.posterSrc} />
  return (
    <ReelMedia
      posterSrc={reel.posterSrc}
      startOffsetSeconds={startOffsetFor(cutId)}
      videoSrc={reel.videoSrc}
    />
  )
}

/**
 * Whether a frame for this cut must carry the "AI scene" badge.
 *
 * Every file in the manifest was generated (D28), and `VideoThumb` states the
 * rule in its own prop contract: the badge is "required whenever AI footage is
 * used". CLAUDE.md non-negotiable 4 says the same thing. Callers that also
 * know the fiction's own AI flag should OR this with it.
 */
export function hasGeneratedMedia(cutId: string): boolean {
  return reelAsset(cutId) !== null
}

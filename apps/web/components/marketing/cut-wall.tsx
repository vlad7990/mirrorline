/**
 * The output, shown rather than described.
 *
 * One 52:14 episode became twelve distinct cuts. Each frame carries its own
 * hook, its own length, its own format, the verdict the Compliance agent gave
 * it, and an AI label where a scene was generated. DESIGN.md "Do's": "Keep the
 * client's videos as the visual hero" and "Put 9:16 video on the viewer
 * surface, in both themes".
 *
 * Every figure comes from `@mirrorline/mock`, the fictional demo client in
 * docs/specs/08_MOCK_DATA.md. Nothing here is a customer result, and the
 * section that renders this carries the "Sample data" label that CLAUDE.md
 * non-negotiable 7 requires.
 */

import { cuts, sourceVideo, todaySchedule, weekPosts, type Cut } from '@mirrorline/mock'
import { ReelMedia, StatusChip, VideoThumb, ViewerPanel } from '@mirrorline/ui'
import * as React from 'react'

import { reelAsset } from './reel-assets'

/**
 * CLAUDE.md non-negotiable 4: "AI scenes are always labelled, in the UI and on
 * the platform." Which cuts those are is a property of the schedule, not of
 * the cut, so it is read back from the posts rather than restated here.
 */
const AI_LABELLED_CUT_IDS: ReadonlySet<string> = new Set(
  [...todaySchedule, ...weekPosts].flatMap((post) =>
    post.hasAiScenes && post.cutId !== null ? [post.cutId] : [],
  ),
)

/** Compliance verdicts map onto the shared status vocabulary. */
const COMPLIANCE_STATUS = {
  passed: 'passed',
  'needs-review': 'needs-review',
  blocked: 'blocked',
} as const

/** Six per row at 1440px, so the stagger stays inside DESIGN.md's ceiling. */
const STAGGER_CEILING = 6

interface CutFrameProps {
  readonly cut: Cut
  /** Position in the wall. Drives the demo thumbnail colour and the stagger. */
  readonly position: number
}

function CutFrame({ cut, position }: CutFrameProps) {
  // Null for every cut until Higgsfield is funded and files land in
  // `public/reels/`. A frame without one stays its flat demo colour rather
  // than pretending to be footage — see ./reel-assets.
  const reel = reelAsset(cut.id)

  return (
    <li
      className="log-in stagger flex min-w-0 flex-col gap-2"
      style={{ '--index': position % STAGGER_CEILING } as React.CSSProperties}
    >
      <VideoThumb
        aiScene={AI_LABELLED_CUT_IDS.has(cut.id)}
        caption={cut.hook}
        cutNumber={cut.index}
        highlight={cut.highlightPhrase}
        index={position}
        length={cut.lengthLabel}
        media={
          reel ? <ReelMedia posterSrc={reel.posterSrc} videoSrc={reel.videoSrc} /> : undefined
        }
      />
      <p className="m-0 text-meta text-on-viewer">
        {cut.format} <span className="machine">{cut.lengthLabel}</span>
      </p>
      <StatusChip status={COMPLIANCE_STATUS[cut.compliance]} className="self-start" />
    </li>
  )
}

/**
 * All twelve cuts, on the viewer surface, in both themes.
 *
 * The panel is deliberately left without an accessible name: the section that
 * wraps it is already a landmark labelled by the page's own heading, and a
 * second landmark with the same name is one landmark too many.
 */
export function CutWall() {
  return (
    <ViewerPanel
      readout={
        <>
          one episode <span className="machine">{sourceVideo.durationLabel}</span>, cuts{' '}
          <span className="machine">{cuts.length}</span>
        </>
      }
    >
      <ol className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {cuts.map((cut, position) => (
          <CutFrame key={cut.id} cut={cut} position={position} />
        ))}
      </ol>
    </ViewerPanel>
  )
}

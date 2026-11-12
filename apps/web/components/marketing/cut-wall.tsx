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
import { StatusChip, VideoThumb, ViewerPanel } from '@mirrorline/ui'
import * as React from 'react'

import { cutMedia, hasGeneratedMedia } from './cut-media'

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

/**
 * Whether this frame must carry the "AI scene" badge.
 *
 * Two independent reasons, and either is sufficient:
 *
 * 1. The fiction says so — the demo client's schedule marks the post as having
 *    AI scenes. That is the product behaviour this section demonstrates.
 * 2. **The frame is really showing generated imagery.** Every file in the reel
 *    manifest was generated (D28), and `VideoThumb` states the rule in its own
 *    prop contract: the badge is "required whenever AI footage is used". A
 *    label that applied only to the fiction while real generated pixels went
 *    unmarked would be exactly the gap non-negotiable 4 exists to close.
 *
 * Today reason 2 covers all twelve, so the set is doing no visible work. It
 * stays because it is the one that survives the assets being swapped for real
 * client footage, which is what this wall is a stand-in for.
 */
function isAiLabelled(cutId: string): boolean {
  return AI_LABELLED_CUT_IDS.has(cutId) || hasGeneratedMedia(cutId)
}

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
  return (
    <li
      /* `reveal-item`, not `log-in stagger`. `.log-in` runs on mount, and
         this wall sits far below the fold: every tile finished animating
         before the reader had scrolled anywhere near it, so the wall had no
         arrival at all. A view timeline ties it to the scroll instead, and
         the index wraps at the column count so each row arrives in sequence
         rather than as a block. */
      className="reveal-item flex min-w-0 flex-col gap-2"
      style={{ '--index': position % STAGGER_CEILING } as React.CSSProperties}
    >
      <VideoThumb
        aiScene={isAiLabelled(cut.id)}
        caption={cut.hook}
        cutNumber={cut.index}
        highlight={cut.highlightPhrase}
        index={position}
        length={cut.lengthLabel}
        media={cutMedia(cut.id)}
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

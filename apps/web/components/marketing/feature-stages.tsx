/**
 * The four panels behind the loop tabs, one per job.
 *
 * Split out of `feature-tabs.tsx` so that file stays what it is — the tab
 * mechanics, roving tabindex and auto-advance — rather than that plus four
 * layouts. Nothing here is a client component: every panel is markup over a
 * const, so the section ships no JavaScript of its own.
 *
 * **Every frame is AI-generated and every frame says so.** Non-negotiable 4
 * is a rule about surfaces, not about the studio, and a sample reel on the
 * landing page is exactly the surface a reader would otherwise take for
 * client work. The label reads `AI-generated sample`, the same words the
 * showcase marquee uses, so the page says one thing in one voice.
 *
 * **The reels are decoration and the hooks are text.** Each still is
 * `aria-hidden` with an empty `alt` because the hook burned onto it is real
 * text in the DOM underneath. A screen reader that announced both would read
 * every hook twice.
 */

import { AiLabel, ReelStill, cn } from '@mirrorline/ui'
import Image from 'next/image'
import type * as React from 'react'

import type { FeatureStage, LoopReel } from './home-content'

/** The wide frame as generated, so `next/image` has the real ratio. */
const SOURCE_FRAME = { width: 1120, height: 630 } as const

/** The sand-highlighted hook, set the way VideoThumb sets it. */
function Hook({ reel }: { reel: LoopReel }) {
  return (
    <p className="m-0 font-heading text-overlay-caption text-on-primary">
      {reel.lead}{' '}
      <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">{reel.highlight}</mark>
    </p>
  )
}

/** Top-left chip on a reel: a timecode, a slot, whatever the panel needs. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="machine rounded-sm bg-ink-900/70 px-1.5 py-0.5 text-caption text-on-primary">
      {children}
    </span>
  )
}

/**
 * One 9:16 still with its hook over a scrim.
 *
 * The scrim is not decoration: these frames are photographs with blown-out
 * windows in them, and white text on an unscrimmed photograph is the
 * contrast failure that is easiest to ship and hardest to catch in review.
 */
function Reel({
  reel,
  corner,
  className,
}: {
  reel: LoopReel
  corner?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative isolate aspect-[9/16] w-full overflow-hidden rounded-xl bg-demo-teal',
        className,
      )}
    >
      <ReelStill src={reel.src} />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,17,22,0.55)_0%,rgba(14,17,22,0)_38%,rgba(14,17,22,0.78)_100%)]"
      />
      <div className="absolute inset-0 flex flex-col justify-between p-2.5">
        <div className="flex items-start justify-between gap-2">
          {corner ?? <span />}
          <Chip>{reel.lengthLabel}</Chip>
        </div>
        <Hook reel={reel} />
      </div>
    </div>
  )
}

/** The panel's own caption line, under the frames. */
function StageNote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-meta text-on-ink-faint">{children}</p>
}

/**
 * The row of three reels, and the reason it is not a plain `grid-cols-3`.
 *
 * Three 9:16 frames across a 390px phone are 92px wide, which is narrower
 * than the hook burned onto them: measured, the Publish hooks overflowed
 * their frames by 31px there. Shrinking the type to fit would make the one
 * thing the frames exist to show unreadable.
 *
 * So below `sm` the row becomes a snap scroller at roughly two-and-a-bit
 * frames to the screen. That keeps the frames legible *and* keeps the
 * side-by-side reading the panels depend on — Remake's whole argument is
 * three trades next to each other, which a stacked column would lose. The
 * scroller is `overflow-x-auto` on its own box, so the page itself still
 * does not move sideways.
 */
function ReelRow({ children, as = 'ul' }: { children: React.ReactNode; as?: 'ul' | 'ol' }) {
  const Tag = as
  return (
    <Tag className="m-0 flex list-none snap-x snap-mandatory gap-2.5 overflow-x-auto p-0 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
      {children}
    </Tag>
  )
}

/** One cell of `ReelRow`: wide enough to read on a phone, flexible above. */
const REEL_CELL = 'min-w-[46%] shrink-0 snap-start sm:min-w-0 sm:shrink'

/* -------------------------------------------------------------------------- */

/**
 * Multiply · the recording above, three of its cuts below.
 *
 * The wide frame is the argument: the input is a phone at the back of a
 * hall, not a studio. Each cut carries the timecode it came from, which is
 * the cheapest way to show these are moments out of one recording rather
 * than three unrelated clips.
 */
function MultiplyStage({ stage }: { stage: Extract<FeatureStage, { kind: 'multiply' }> }) {
  return (
    <div className="flex flex-col gap-4">
      <figure className="relative m-0 overflow-hidden rounded-xl bg-demo-teal">
        {/* Decorative in the same way the reels are: what the recording was
            is written in the figcaption underneath, so an alt would be the
            same sentence twice. */}
        <Image
          src={stage.sourceSrc}
          alt=""
          aria-hidden="true"
          width={SOURCE_FRAME.width}
          height={SOURCE_FRAME.height}
          sizes="(min-width: 1024px) 45vw, 90vw"
          className="aspect-[16/9] w-full object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,17,22,0.1)_0%,rgba(14,17,22,0.8)_100%)]"
        />
        <span className="absolute left-3 top-3">
          <AiLabel>AI-generated sample</AiLabel>
        </span>
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-3">
          <span className="text-meta text-on-primary">{stage.sourceLabel}</span>
          <Chip>{stage.sourceLength}</Chip>
        </figcaption>
      </figure>

      <ReelRow>
        {stage.cuts.map((cut) => (
          <li key={cut.src} className={REEL_CELL}>
            <Reel reel={cut} corner={<Chip>{cut.fromTimecode}</Chip>} />
          </li>
        ))}
      </ReelRow>

      <StageNote>
        {stage.cuts.length} of {stage.cutTotal} cuts from that one recording. The timecode on each
        is where it came from.
      </StageNote>
    </div>
  )
}

/**
 * Remake · one format, three unrelated trades, side by side.
 *
 * The three share nothing but their structure, which is the whole of
 * non-negotiable 2: the format is copied, the footage never is. Naming the
 * kind of work under each is what makes that legible — without it, three
 * photographs are just three photographs.
 */
function RemakeStage({ stage }: { stage: Extract<FeatureStage, { kind: 'remake' }> }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-line px-3 py-2">
        <span className="text-meta text-on-ink-900">
          Format <span className="machine text-gold-bright">{stage.formatName}</span>
        </span>
        <AiLabel>AI-generated sample</AiLabel>
      </div>

      <ReelRow>
        {stage.takes.map((take) => (
          <li key={take.src} className={cn(REEL_CELL, 'flex flex-col gap-1.5')}>
            <Reel reel={take} />
            <span className="text-caption text-on-ink-faint">{take.madeFor}</span>
          </li>
        ))}
      </ReelRow>

      <StageNote>{stage.formatNote}</StageNote>
    </div>
  )
}

/**
 * Publish · the same week landing on the three platforms.
 *
 * Phone frames rather than bare thumbnails, because "to accounts you own" is
 * the point of the tab: a reel in a phone reads as posted, a reel on a grid
 * reads as produced. The platforms are named and never drawn — a logo here
 * would be someone else's mark implying a partnership we do not have.
 */
function PublishStage({ stage }: { stage: Extract<FeatureStage, { kind: 'publish' }> }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta text-on-ink-muted">Tuesday, to three connected accounts</span>
        <AiLabel>AI-generated sample</AiLabel>
      </div>

      <ReelRow>
        {stage.posts.map((post) => (
          <li key={post.src} className={REEL_CELL}>
            {/* The phone: a rounded shell and one grey speaker slot. That is
                the whole illusion, and it costs no asset and no layout shift. */}
            <div className="rounded-[1.25rem] border border-ink-line bg-ink-900 p-1.5">
              <div className="mb-1.5 flex justify-center">
                <span aria-hidden="true" className="h-1 w-8 rounded-full bg-ink-line" />
              </div>
              <Reel
                reel={post}
                corner={<Chip>{post.slot}</Chip>}
                className="rounded-[0.85rem]"
              />
            </div>
            <span className="mt-1.5 block text-caption text-on-ink-faint">{post.platform}</span>
          </li>
        ))}
      </ReelRow>

      <StageNote>
        Posted through each platform’s official API, to accounts you connect and can disconnect
        without asking us.
      </StageNote>
    </div>
  )
}

/**
 * Learn · last week's posts, ranked by sends per 1,000 reach.
 *
 * A ranked list rather than a chart, because the only thing a reader has to
 * take from it is that the order exists and that it decides what gets made
 * next. The bar is sized against the top row, so the first is always full
 * and the rest are honestly proportional to it — never against an invented
 * ceiling of 100.
 */
function LearnStage({ stage }: { stage: Extract<FeatureStage, { kind: 'learn' }> }) {
  const top = stage.rows[0]?.sendsPerThousand ?? 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-meta text-on-ink-muted">{stage.metricLabel}, last 7 days</span>
        <AiLabel>AI-generated sample</AiLabel>
      </div>

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {stage.rows.map((row, index) => (
          <li key={row.src} className="flex items-center gap-3">
            <span className="machine w-4 shrink-0 text-caption text-on-ink-faint">{index + 1}</span>
            <span className="relative h-14 w-8 shrink-0 overflow-hidden rounded-md bg-demo-teal">
              <ReelStill src={row.src} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-meta text-on-ink-900">
                {row.lead} {row.highlight}
              </span>
              <span aria-hidden="true" className="mt-1.5 block h-1 rounded-full bg-ink-line">
                <span
                  className="block h-full rounded-full bg-gold-gradient"
                  style={{ width: `${Math.round((row.sendsPerThousand / top) * 100)}%` }}
                />
              </span>
            </span>
            <span className="machine shrink-0 text-meta text-gold-bright">
              {row.sendsPerThousand.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>

      <StageNote>
        The order is the instruction: next week makes more of what the top row did, on the platform
        it did it on.
      </StageNote>
    </div>
  )
}

/** Picks the panel for the tab on show. */
export function FeatureStagePanel({ stage }: { stage: FeatureStage }) {
  switch (stage.kind) {
    case 'multiply':
      return <MultiplyStage stage={stage} />
    case 'remake':
      return <RemakeStage stage={stage} />
    case 'publish':
      return <PublishStage stage={stage} />
    case 'learn':
      return <LearnStage stage={stage} />
  }
}

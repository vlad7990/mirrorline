/**
 * The quiet half of S2 · Home: the "Today" timeline, the agent activity feed
 * and the one ink panel on the screen.
 *
 * None of these take input, so they stay server components and ship no
 * JavaScript of their own.
 *
 * The four metric tiles that used to open this file were removed in v4 under
 * 16 §5. They reported views, clicks and calls booked — activity, in the shape
 * every clipping tool reports it — and Home now opens with the goal bar and
 * three KPI cards measured against targets. Two sets of headline figures on
 * one screen is two answers to "which number matters".
 *
 * DESIGN.md "Elevation & Depth": "Dark ink panels: the strongest emphasis on
 * a light page. Use at most one or two per screen." The learning loop is this
 * screen's one.
 */

import { Card, LogoMark, StatusChip, ViewerPanel } from '@mirrorline/ui'
import Link from 'next/link'

import { AGENT_FEED_LINES, LEARNING_LOOP, TODAY_POSTS, postPlatformLine } from './home-data'

/** The low-emphasis card link: deep coral on light, the lighter coral on dark. */
const CARD_LINK_CLASSES =
  'text-label text-primary underline-offset-4 hover:underline dark:text-accent'

/* -------------------------------------------------------------------------- */
/* Today                                                                       */
/* -------------------------------------------------------------------------- */

/** DESIGN.md "Shapes": "tiny thumbnails and log rows 4px". */
const THUMB_CLASSES = 'h-12 w-[27px] rounded-sm'

export function TodayCard() {
  return (
    <Card as="section" aria-labelledby="today-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-heading" className="m-0 font-heading text-title text-text">
          Today
        </h2>
        <Link href="/app/calendar" className={CARD_LINK_CLASSES}>
          Open calendar
        </Link>
      </div>

      <ol className="m-0 flex list-none flex-col p-0">
        {TODAY_POSTS.map((post) => (
          <li
            key={post.id}
            className="flex flex-wrap items-center gap-3 border-t border-border py-2"
          >
            {/* The slot the Publisher will post in, so it is measured. */}
            <span className="machine w-[70px] shrink-0 text-label text-text">{post.timeLabel}</span>
            {/* The frame stands in for the video still; the title beside it
                carries the meaning, so it is hidden from assistive tech.
                DESIGN.md "Colors — Viewer": a 9:16 frame sits on the lightbox
                in both themes, so even at this size it gets its mat rather
                than borrowing the card's surface. */}
            <ViewerPanel aria-hidden="true" flush className="shrink-0">
              <span className={THUMB_CLASSES} style={{ backgroundColor: post.thumbnailColor }} />
            </ViewerPanel>
            <span className="flex min-w-[160px] flex-1 flex-col gap-0.5">
              <span className="text-label font-medium text-text">{post.title}</span>
              <span className="text-caption font-normal text-text-muted">
                {postPlatformLine(post)}
              </span>
            </span>
            <StatusChip status={post.status} className="shrink-0" />
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Agent activity                                                              */
/* -------------------------------------------------------------------------- */

export function AgentActivityCard() {
  return (
    <Card as="section" aria-labelledby="agent-activity-heading" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="agent-activity-heading" className="m-0 font-heading text-title text-text">
          Agent activity
        </h2>
        <Link href="/app/agents" className={CARD_LINK_CLASSES}>
          All agents
        </Link>
      </div>

      <ol className="m-0 flex list-none flex-col p-0">
        {AGENT_FEED_LINES.map((line) => (
          <li key={line.id} className="flex gap-2.5 border-t border-border py-2">
            {/* Decoration only: the time and the agent name are right there. */}
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
            <span className="flex min-w-0 flex-col gap-0.5">
              {/* The glass box in miniature: when it ran and what it cost are
                  the machine's, the agent's name is the studio's. DESIGN.md
                  "Typography — two voices". */}
              <span className="text-caption font-normal text-text-muted">
                <span className="machine">{line.timeLabel}</span> · {line.agentName}
                {line.costLabel ? (
                  <>
                    {' · '}
                    <span className="machine">{line.costLabel}</span>
                  </>
                ) : null}
              </span>
              <span className="text-label font-normal text-text">{line.message}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Learning loop                                                               */
/* -------------------------------------------------------------------------- */

const LOOP_MARK_SIZE = 24

export function LearningLoopCard() {
  return (
    <Card
      as="section"
      tone="ink"
      aria-labelledby="learning-loop-heading"
      className="flex flex-col gap-2.5"
    >
      <div className="flex items-center gap-2.5">
        <LogoMark size={LOOP_MARK_SIZE} />
        {/* Deliberately not <Eyebrow>. The `.eyebrow` utility sets its own
            muted-grey colour from a later @layer utilities block, which has the
            same specificity as a Tailwind text colour and therefore wins: the
            override lost and the words rendered at 3.11:1 on ink. These four
            utilities reproduce `.eyebrow` exactly and keep the accent, which
            clears 4.5:1 and is already the learning loop's colour. */}
        <span className="text-caption font-semibold uppercase tracking-[0.06em] text-accent">
          {LEARNING_LOOP.eyebrow}
        </span>
      </div>
      <h2 id="learning-loop-heading" className="m-0 font-heading text-title text-on-ink">
        {LEARNING_LOOP.headline}
      </h2>
      <p className="m-0 text-label font-normal text-on-ink/80">{LEARNING_LOOP.followUp}</p>
      <Link
        href={LEARNING_LOOP.href}
        className="text-label text-accent underline-offset-4 hover:underline"
      >
        {LEARNING_LOOP.linkLabel}
      </Link>
    </Card>
  )
}

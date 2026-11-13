/**
 * View models for S2 · Home, derived from @mirrorline/mock.
 *
 * Nothing here invents a number. Every figure, hook, time and status comes
 * from the fixtures, so Home, Upload and Calendar always tell the same story.
 * Only the sentence shapes live here, and those come from
 * docs/specs/02_BRAND_AND_VOICE.md: plain verbs, real numbers, sentence case.
 */

import type { AgentLogEntry, Cut, ScheduledPost } from '@mirrorline/mock'
import { agentFeed, cuts, metrics, todaySchedule, workspace } from '@mirrorline/mock'
import type { Status } from '@mirrorline/ui'

/*
 * The four `HOME_METRICS` tiles lived here until v4. 16 §5 replaced them with
 * the goal bar and the three KPI cards from `components/kpi/`, which measure
 * against a target this account agreed to rather than reporting activity. The
 * fixtures they drew on are untouched in `@mirrorline/mock` and still feed the
 * Results tabs; only the Home tiles are gone.
 */

/* -------------------------------------------------------------------------- */
/* "Needs you"                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A row either sends you somewhere to decide (a link) or is a one-tap
 * approval you can make from here (a button). The two behave differently, so
 * the kind is explicit rather than guessed from the label.
 */
export type NeedsKind = 'link' | 'approve'

export interface NeedsItem {
  readonly id: string
  /** Chip status: the word a screen reader and a colour-blind reader both get. */
  readonly status: Extract<Status, 'needs-review' | 'blocked'>
  readonly text: string
  readonly actionLabel: string
  readonly kind: NeedsKind
  /** Where the action goes. Only set when `kind` is 'link'. */
  readonly href?: string
}

const CUT_REVIEW_HREF = '/app/upload'
const APPROVE_ACTION = 'Approve'
const REVIEW_ACTION = 'Review'
/** The one blocked cut is blocked on its audio, so the verb says so. */
const FIX_AUDIO_ACTION = 'Fix audio'

function cutSentence(cut: Cut): string {
  const opening = `Cut ${cut.index}, “${cut.hook}”.`
  return cut.complianceReason ? `${opening} ${cut.complianceReason}.` : opening
}

function postSentence(post: ScheduledPost): string {
  return `${post.timeLabel} ${post.platformLabel} post is waiting for approval.`
}

function cutsWith(compliance: Cut['compliance']): readonly Cut[] {
  return cuts.filter((cut) => cut.compliance === compliance)
}

/**
 * Cuts to read first, then the post that only needs a yes, then the blocked
 * cut, which is the one thing nobody can schedule around.
 */
export const NEEDS_YOU_ITEMS: readonly NeedsItem[] = [
  ...cutsWith('needs-review').map(
    (cut): NeedsItem => ({
      id: cut.id,
      status: 'needs-review',
      text: cutSentence(cut),
      actionLabel: REVIEW_ACTION,
      kind: 'link',
      href: CUT_REVIEW_HREF,
    }),
  ),
  ...todaySchedule
    .filter((post) => post.status === 'needs-review')
    .map(
      (post): NeedsItem => ({
        id: post.id,
        status: 'needs-review',
        text: postSentence(post),
        actionLabel: APPROVE_ACTION,
        kind: 'approve',
      }),
    ),
  ...cutsWith('blocked').map(
    (cut): NeedsItem => ({
      id: cut.id,
      status: 'blocked',
      text: cutSentence(cut),
      actionLabel: FIX_AUDIO_ACTION,
      kind: 'link',
      href: CUT_REVIEW_HREF,
    }),
  ),
]

/* -------------------------------------------------------------------------- */
/* Today                                                                       */
/* -------------------------------------------------------------------------- */

export const TODAY_POSTS: readonly ScheduledPost[] = todaySchedule

/** "Instagram · AI scenes labelled" — non-negotiable 4, said in the list. */
export function postPlatformLine(post: ScheduledPost): string {
  return post.hasAiScenes ? `${post.platformLabel} · AI scenes labelled` : post.platformLabel
}

/* -------------------------------------------------------------------------- */
/* Agent activity                                                              */
/* -------------------------------------------------------------------------- */

/**
 * One line of the feed, kept in four fields rather than one string.
 *
 * DESIGN.md "Typography — two voices" splits a log line down the middle: the
 * timestamp and the cost are the machine reporting and go in Geist Mono, the
 * agent's name and what it did are the studio talking and stay in Geist. One
 * concatenated `meta` string could only ever have been one of the two.
 */
export interface AgentFeedLine {
  readonly id: string
  /** "1:00 pm". Mono. */
  readonly timeLabel: string
  /** "Performance Analyst". A name, so Geist. */
  readonly agentName: string
  /** "$1.84", or null when the step cost nothing. Mono. */
  readonly costLabel: string | null
  readonly message: string
}

function feedCostLabel(entry: AgentLogEntry): string | null {
  return entry.costUsd === null ? null : `$${entry.costUsd.toFixed(2)}`
}

/** Newest first. `slice()` keeps the fixture's own order untouched. */
export const AGENT_FEED_LINES: readonly AgentFeedLine[] = agentFeed
  .slice()
  .reverse()
  .map((entry) => ({
    id: entry.id,
    timeLabel: entry.timeLabel,
    agentName: entry.agentName,
    costLabel: feedCostLabel(entry),
    message: entry.message,
  }))

/* -------------------------------------------------------------------------- */
/* Learning loop                                                               */
/* -------------------------------------------------------------------------- */

export const LEARNING_LOOP = {
  eyebrow: 'Learning loop',
  headline: `This week’s winner: ${metrics.topHookType.toLowerCase()}, ${metrics.topHookMultiplierLabel}.`,
  followUp: 'Next week we’re making more of them, and trying them on TikTok first.',
  linkLabel: 'See results',
  href: '/app/results',
} as const

/* -------------------------------------------------------------------------- */
/* Page header                                                                 */
/* -------------------------------------------------------------------------- */

function countTodayPosts(...statuses: readonly ScheduledPost['status'][]): number {
  return todaySchedule.filter((post) => statuses.includes(post.status)).length
}

const publishedToday = countTodayPosts('published', 'published-private')
const stillToGoToday = todaySchedule.length - publishedToday
const cutsNeedingYou = cuts.filter((cut) => cut.compliance !== 'passed').length
const firstName = workspace.ownerName.split(' ')[0] ?? workspace.ownerName

export const HOME_HEADER = {
  /** The demo's fixed today, written the way a person says it. */
  eyebrow: 'Monday, 9 November',
  title: `Good morning, ${firstName}`,
  subline: `${publishedToday} posts are out, ${stillToGoToday} more go today. ${cutsNeedingYou} cuts need your eye.`,
} as const

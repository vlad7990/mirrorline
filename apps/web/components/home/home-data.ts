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
import type { DeltaDirection, Status } from '@mirrorline/ui'

/** Monday to Sunday, the span every "this week" figure covers. */
const DAYS_IN_WEEK = 7
const THOUSAND = 1000
/** Below this a count reads better in full: "214", not "0.2K". */
const COMPACT_FROM = THOUSAND

/* -------------------------------------------------------------------------- */
/* Metric tiles                                                                */
/* -------------------------------------------------------------------------- */

export interface HomeMetric {
  readonly id: string
  readonly label: string
  /** Pre-formatted for display: "48.3K". */
  readonly value: string
  /** Seven points, Monday first, for the tile's coral sparkline. */
  readonly series: readonly number[]
  /** A whole phrase, never a bare arrow. */
  readonly delta: string
  readonly deltaDirection: DeltaDirection
}

/** "48.3K" for big counts, the plain grouped number for small ones. */
export function formatCount(value: number): string {
  if (value < COMPACT_FROM) return value.toLocaleString('en-US')
  return `${(value / THOUSAND).toFixed(1)}K`
}

/**
 * Spreads a weekly total across the seven days in the same shape as
 * `metrics.viewsByDay`. The mock carries one real series; the other tiles
 * share its curve rather than inventing four unrelated ones.
 */
function weeklySeries(total: number): readonly number[] {
  const base = metrics.viewsByDay
  const sum = base.reduce((running, value) => running + value, 0)
  if (sum <= 0) return base
  return base.map((value) => (value / sum) * total)
}

export const HOME_METRICS: readonly HomeMetric[] = [
  {
    id: 'posts',
    label: 'Posts this week',
    value: formatCount(metrics.posts),
    series: weeklySeries(metrics.posts),
    delta: `On plan: ${Math.round(metrics.posts / DAYS_IN_WEEK)} a day`,
    deltaDirection: 'up',
  },
  {
    id: 'views',
    label: 'Views',
    value: formatCount(metrics.views),
    series: metrics.viewsByDay,
    delta: `${metrics.deltas.views.label} vs last week`,
    deltaDirection: metrics.deltas.views.direction,
  },
  {
    id: 'link-clicks',
    label: 'Link clicks',
    value: formatCount(metrics.linkClicks),
    series: weeklySeries(metrics.linkClicks),
    delta: `${metrics.deltas.linkClicks.label} vs last week`,
    deltaDirection: metrics.deltas.linkClicks.direction,
  },
  {
    id: 'calls',
    label: 'Calls booked',
    value: formatCount(metrics.callsBooked),
    series: weeklySeries(metrics.callsBooked),
    delta: `${metrics.deltas.callsBooked.label} vs last week`,
    deltaDirection: metrics.deltas.callsBooked.direction,
  },
]

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

export interface AgentFeedLine {
  readonly id: string
  /** "1:00 pm · Performance Analyst". */
  readonly meta: string
  readonly message: string
}

function feedMessage(entry: AgentLogEntry): string {
  if (entry.costUsd === null) return entry.message
  return `${entry.message} (cost $${entry.costUsd.toFixed(2)})`
}

/** Newest first. `slice()` keeps the fixture's own order untouched. */
export const AGENT_FEED_LINES: readonly AgentFeedLine[] = agentFeed
  .slice()
  .reverse()
  .map((entry) => ({
    id: entry.id,
    meta: `${entry.timeLabel} · ${entry.agentName}`,
    message: feedMessage(entry),
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

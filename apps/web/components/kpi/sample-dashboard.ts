/**
 * One sample dashboard, shared by the home preview, `/metrics` and the studio.
 *
 * **Every figure here is invented.** It belongs to the fictional demo account
 * in `08_MOCK_DATA.md`, and non-negotiable 7 requires the label to be on the
 * screen rather than only in this comment — every surface rendering it draws
 * a `SampleDataLabel`.
 *
 * **The timestamps are frozen on purpose.** `SAMPLE_NOW` is a fixed instant
 * and every `capturedAt` is a fixed offset from it, so "updated 2h ago" says
 * the same thing in a server render, a client render, a unit test and a
 * screenshot. A real clock here would differ between server and client and
 * patch silently on hydration, and it would make every screenshot diff.
 *
 * The set deliberately includes **one not-connected KPI and one projection**,
 * because those two states are the honesty rules in 15 §8, and a preview that
 * only ever shows healthy green numbers is a prettier lie than the dashboard
 * it previews.
 */

import { type Kpi, type KpiDefinition } from './kpi-types'

/** The instant the sample was "captured". Fixed; see the module comment. */
export const SAMPLE_NOW = new Date('2026-11-13T09:00:00Z')

const HOURS_AGO = (hours: number): string =>
  new Date(SAMPLE_NOW.getTime() - hours * 3_600_000).toISOString()

/* -------------------------------------------------------------------------- */
/* Definitions — the seed for `kpi_definitions` (15 §3, §7)                    */
/* -------------------------------------------------------------------------- */

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  {
    key: 'posts_published',
    name: 'Posts published',
    unit: 'count',
    formula: 'Posts that went live across every connected account, this week',
    source: 'Our system',
    tier: 'production',
  },
  {
    key: 'posts_on_schedule',
    name: 'Posts on schedule',
    unit: 'percent',
    formula: 'Posts published within 15 minutes of their planned time, as a share of all posts',
    source: 'Our system',
    tier: 'production',
  },
  {
    key: 'three_second_hold',
    name: '3-second hold',
    unit: 'percent',
    formula: 'Viewers still watching at 3 seconds, as a share of plays',
    source: 'Platform insights APIs',
    tier: 'content-health',
  },
  {
    key: 'sends_per_1k',
    name: 'Sends per 1,000 reach',
    unit: 'count',
    formula: 'Times a post was sent to someone, per 1,000 accounts reached',
    source: 'Platform insights APIs',
    tier: 'content-health',
  },
  {
    key: 'net_followers',
    name: 'Net new followers',
    unit: 'count',
    formula: 'Follows minus unfollows, across every connected account, this week',
    source: 'Platform insights APIs',
    tier: 'growth',
  },
  {
    key: 'non_follower_reach',
    name: 'Non-follower reach',
    unit: 'percent',
    formula: 'Share of reach from accounts that do not follow you',
    source: 'Platform insights APIs',
    tier: 'growth',
  },
  {
    key: 'leads',
    name: 'Leads',
    unit: 'count',
    formula: 'Enquiries attributed to a tracked link or a DM keyword, this week',
    source: 'Tracked links and DM keywords',
    tier: 'outcome',
  },
  {
    key: 'bookings',
    name: 'Bookings',
    unit: 'count',
    formula: 'Appointments booked through a connected booking tool, this week',
    source: 'Booking connector',
    tier: 'outcome',
  },
  {
    key: 'cost_per_lead',
    name: 'Cost per lead',
    unit: 'currency',
    formula: 'Plan cost for the period divided by leads in the period',
    source: 'Calculated',
    tier: 'return',
  },
  {
    key: 'originality_pass_rate',
    name: 'Originality Gate pass rate',
    unit: 'percent',
    formula: 'Videos passing the gate first time, as a share of videos checked',
    source: 'Compliance agent',
    tier: 'quality',
  },
  {
    key: 'ai_labelled_share',
    name: 'AI-labelled share',
    unit: 'percent',
    formula: 'Published posts carrying an AI label, as a share of all posts',
    source: 'Compliance agent',
    tier: 'quality',
  },
  {
    key: 'upload_to_first_post',
    name: 'Upload to first post',
    unit: 'days',
    formula: 'Median time from a file arriving to its first cut going live',
    source: 'Job queue',
    tier: 'agent-ops',
  },
]

function definition(key: string): KpiDefinition {
  const found = KPI_DEFINITIONS.find((item) => item.key === key)
  // A missing key is a programming error, not a runtime condition. Throwing
  // turns it into a failing test rather than a card rendering "NaN".
  if (!found) throw new Error(`Unknown KPI definition: ${key}`)
  return found
}

/* -------------------------------------------------------------------------- */
/* The sample account                                                          */
/* -------------------------------------------------------------------------- */

export const SAMPLE_GOAL = {
  /** The outcome in the user's own words (15 §1). */
  outcome: 'Get more customers from short video',
  current: 52,
  target: 120,
  unitLabel: 'leads',
  periodLabel: 'this quarter',
  /** Six weeks into a thirteen-week quarter. */
  periodElapsed: 6 / 13,
} as const

/** The three 15 §5 calls "the three most important", for this goal. */
export const SAMPLE_HEADLINE_KPIS: readonly Kpi[] = [
  {
    definition: definition('leads'),
    value: {
      state: 'measured',
      value: 9,
      series: [4, 5, 7, 6, 8, 7, 9],
      change: 0.18,
      capturedAt: HOURS_AGO(2),
    },
    target: { value: 10, basis: '14-day baseline' },
  },
  {
    definition: definition('sends_per_1k'),
    value: {
      state: 'measured',
      value: 24,
      series: [12, 14, 17, 16, 20, 22, 24],
      change: 0.31,
      capturedAt: HOURS_AGO(2),
    },
    target: { value: 25, basis: 'niche benchmark' },
  },
  {
    definition: definition('net_followers'),
    value: {
      state: 'measured',
      value: 318,
      series: [120, 160, 190, 240, 260, 295, 318],
      change: 0.08,
      capturedAt: HOURS_AGO(2),
    },
    target: { value: 350, basis: '14-day baseline' },
  },
]

/**
 * The fuller set, including the two states a healthy-looking preview would
 * otherwise hide.
 */
export const SAMPLE_KPIS: readonly Kpi[] = [
  ...SAMPLE_HEADLINE_KPIS,
  {
    definition: definition('posts_published'),
    value: {
      state: 'measured',
      value: 21,
      series: [18, 20, 21, 19, 21, 21, 21],
      change: 0,
      capturedAt: HOURS_AGO(1),
    },
    target: { value: 21, basis: 'Growth plan' },
  },
  {
    definition: definition('three_second_hold'),
    value: {
      state: 'measured',
      value: 48.2,
      series: [41, 43, 44, 46, 47, 47, 48.2],
      change: 0.04,
      capturedAt: HOURS_AGO(2),
    },
  },
  {
    definition: definition('originality_pass_rate'),
    value: {
      state: 'measured',
      value: 94,
      series: [88, 90, 91, 92, 93, 93, 94],
      change: 0.02,
      capturedAt: HOURS_AGO(3),
    },
  },
  {
    // 15 §8: never a zero for something nobody connected.
    definition: definition('bookings'),
    value: { state: 'not-connected', missingSource: 'your booking tool' },
  },
  {
    // 15 §8: dashed and labelled, never shown as an actual.
    definition: definition('cost_per_lead'),
    value: {
      state: 'projected',
      value: 41,
      series: [68, 61, 55, 50, 46, 43, 41],
      basis: 'if this week’s rate holds',
    },
  },
]

/** `cost_per_lead` and `upload_to_first_post` are better when they fall. */
export const LOWER_IS_BETTER = new Set(['cost_per_lead', 'upload_to_first_post'])

/* -------------------------------------------------------------------------- */
/* Funnel and ledger (15 §5 tabs 2 and 6)                                      */
/* -------------------------------------------------------------------------- */

export const SAMPLE_FUNNEL = [
  { label: 'Views', count: 48_300 },
  { label: 'Profile visits', count: 1_930 },
  { label: 'Link clicks', count: 214 },
  { label: 'Leads', count: 31 },
  { label: 'Bookings', count: 6 },
] as const

export interface LedgerWeek {
  readonly week: string
  readonly posts: number
  readonly views: number
  readonly sends: number
  readonly saves: number
  readonly follows: number
  readonly leads: number
  readonly bookings: number
}

/** 15 §7 `ledger_weekly`, minus the sales column this account does not use. */
export const SAMPLE_LEDGER: readonly LedgerWeek[] = [
  {
    week: '20 Oct',
    posts: 18,
    views: 31_400,
    sends: 410,
    saves: 290,
    follows: 190,
    leads: 5,
    bookings: 1,
  },
  {
    week: '27 Oct',
    posts: 21,
    views: 38_900,
    sends: 520,
    saves: 340,
    follows: 240,
    leads: 6,
    bookings: 2,
  },
  {
    week: '3 Nov',
    posts: 21,
    views: 44_100,
    sends: 680,
    saves: 395,
    follows: 295,
    leads: 8,
    bookings: 1,
  },
  {
    week: '10 Nov',
    posts: 21,
    views: 48_300,
    sends: 790,
    saves: 430,
    follows: 318,
    leads: 9,
    bookings: 2,
  },
]

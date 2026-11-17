/**
 * The demo fixtures. Single source of truth for every screen.
 *
 * Transcribed from docs/specs/08_MOCK_DATA.md — every number here must match
 * that file exactly; src/__tests__/data.test.ts fails if they drift.
 *
 * Everything is fictional: "Maya Torres Coaching" is a placeholder brand and
 * Maya Torres is not a real person. Nothing in this package calls Date.now(),
 * new Date() or Math.random(), so screenshots and end-to-end tests stay stable.
 *
 * Episode 47 and its cuts live in ./cuts; the timeline and calendar live in
 * ./schedule. Both are re-exported here, so '@mirrorline/mock' is the only
 * import path a screen ever needs.
 */

import { cutById } from './cuts'
import { PLATFORM_LABELS, TODAY, idSuffix } from './internal'
import type {
  Agent,
  AgentLogEntry,
  BestTime,
  BrandKit,
  ConsentRecord,
  FunnelStage,
  HookTypeRank,
  Invoice,
  Metrics,
  Platform,
  SocialAccount,
  TeamMember,
  TopPost,
  Trend,
  TrendBeat,
  Workspace,
} from './types'

export * from './cuts'
export * from './schedule'
export { TODAY, thumbnailColorAt } from './internal'

// ---------------------------------------------------------------------------
// Workspace and connected accounts
// ---------------------------------------------------------------------------

export const workspace: Workspace = {
  id: 'ws-maya-torres-coaching',
  name: 'Maya Torres Coaching',
  ownerName: 'Maya Torres',
  ownerRole: 'Leadership coach for first-time managers',
  showName: 'Lead Without Burnout',
  showCadence: 'Weekly, 45–60 minutes',
  planName: 'Growth',
  planPriceUsdPerMonth: 1500,
  planPriceLabel: '$1,500/month',
  postsIncluded: 90,
  postsUsed: 63,
  niche: 'Coaching',
  nearbyNiches: ['Leadership', 'Productivity', 'Wellness'],
  goal: 'Book discovery calls',
  goalLink: 'mayatorres.example/call',
  postsPerDayPerPlatform: 2,
}

export const accounts: readonly SocialAccount[] = [
  {
    id: 'account-instagram',
    platform: 'instagram',
    platformLabel: PLATFORM_LABELS.instagram,
    displayName: 'Maya Torres Coaching',
    handle: '@mayatorres.coach',
    // Connected, but the token expired: this drives the S10 "Reconnect
    // Instagram" alert bar and the error state in 03_SCREENS_SPEC.md.
    status: 'reconnect-needed',
    statusLabel: 'Reconnect needed',
    note: 'Instagram disconnected us. Reconnect to keep posting.',
    isPrivatePosting: false,
    connectedOn: '2026-10-12',
  },
  {
    id: 'account-tiktok',
    platform: 'tiktok',
    platformLabel: PLATFORM_LABELS.tiktok,
    displayName: 'Maya Leads',
    handle: '@mayaleads',
    status: 'connected',
    statusLabel: 'Connected',
    note: 'Posts stay private until our app is approved by TikTok.',
    isPrivatePosting: true,
    connectedOn: '2026-10-12',
  },
  {
    id: 'account-youtube',
    platform: 'youtube',
    platformLabel: PLATFORM_LABELS.youtube,
    displayName: 'Maya Torres',
    handle: null,
    status: 'connected',
    statusLabel: 'Connected',
    note: null,
    isPrivatePosting: false,
    connectedOn: '2026-10-13',
  },
  {
    id: 'account-linkedin',
    platform: 'linkedin',
    platformLabel: PLATFORM_LABELS.linkedin,
    displayName: 'LinkedIn',
    handle: null,
    status: 'not-connected',
    statusLabel: 'Not connected',
    note: null,
    isPrivatePosting: false,
    connectedOn: null,
  },
]

// ---------------------------------------------------------------------------
// Trend cards (S4)
// ---------------------------------------------------------------------------

interface TrendRow {
  readonly format: string
  readonly fromNiche: string
  readonly growthPercent: number
  readonly fit: number
  /** Views per follower in the scanned niche. See `Trend.viewsPerFollower`. */
  readonly viewsPerFollower: number
  readonly beats: readonly string[]
  readonly whyItWorks: string
  readonly platform: Platform
}

/*
 * `viewsPerFollower` deliberately does not track `growthPercent`.
 *
 * The fastest-growing format here is not always the one reaching furthest past
 * its own audience, and the Niche Scan would be worth nothing if it were — a
 * board where every column agrees is a board with one column on it. "Day in
 * the life" is the case the screen exists to show: growing, and barely leaving
 * the followers it already has.
 */
const TREND_ROWS: readonly TrendRow[] = [
  {
    format: 'The 3-word reframe',
    fromNiche: 'Leadership',
    growthPercent: 340,
    fit: 94,
    viewsPerFollower: 3.2,
    beats: ['Hook question', 'common belief', '3-word reframe', 'one example', 'call to action'],
    whyItWorks: 'A question opens a loop and three words close it.',
    platform: 'tiktok',
  },
  {
    format: '"Things I stopped doing" list',
    fromNiche: 'Productivity',
    growthPercent: 210,
    fit: 88,
    viewsPerFollower: 2.4,
    beats: ['Bold claim', '3 quick cuts', 'payoff', 'call to action'],
    whyItWorks: 'Subtraction feels braver than one more tip list.',
    platform: 'instagram',
  },
  {
    format: 'Green-screen myth buster',
    fromNiche: 'Wellness',
    growthPercent: 180,
    fit: 81,
    viewsPerFollower: 2.9,
    beats: ['Myth on screen', '"here\'s what\'s true"', 'proof', 'call to action'],
    whyItWorks: 'Naming the myth first earns the correction.',
    platform: 'tiktok',
  },
  {
    format: 'POV: your first day as a manager',
    fromNiche: 'Leadership',
    growthPercent: 160,
    fit: 86,
    viewsPerFollower: 1.8,
    beats: ['POV text', '3 scenes', 'twist', 'lesson'],
    whyItWorks: 'A specific first day lets people see themselves in it.',
    platform: 'instagram',
  },
  {
    format: 'Day in the life, sped up',
    fromNiche: 'Productivity',
    growthPercent: 120,
    fit: 64,
    // Growing, and barely reaching anyone who does not already follow.
    viewsPerFollower: 0.6,
    beats: ['Time-lapse', '3 captions', 'reflection'],
    whyItWorks: 'Speed shows the work without a single claim.',
    platform: 'youtube',
  },
  {
    format: 'One question that changes a 1:1',
    fromNiche: 'Coaching',
    growthPercent: 95,
    fit: 91,
    viewsPerFollower: 2.1,
    beats: ['Question', 'why it works', 'how to ask it', 'call to action'],
    whyItWorks: 'One question is small enough to try tomorrow.',
    platform: 'instagram',
  },
  {
    format: 'Stitch-style reply to a common question',
    fromNiche: 'Coaching',
    growthPercent: 90,
    fit: 83,
    viewsPerFollower: 1.4,
    beats: ['Question on screen', 'answer', 'example', 'call to action'],
    whyItWorks: 'Answering a real question borrows its curiosity.',
    platform: 'tiktok',
  },
  {
    format: 'Before and after a reframe',
    fromNiche: 'Wellness',
    growthPercent: 70,
    fit: 72,
    viewsPerFollower: 1.1,
    beats: ['Before line', 'reframe', 'after line', 'invite'],
    whyItWorks: 'Two lines side by side make the shift obvious.',
    platform: 'youtube',
  },
]

function toBeats(labels: readonly string[]): readonly TrendBeat[] {
  return labels.map((label, position) => ({ order: position + 1, label }))
}

export const trends: readonly Trend[] = TREND_ROWS.map((row, position) => ({
  id: `trend-${idSuffix(position + 1)}`,
  format: row.format,
  fromNiche: row.fromNiche,
  growthPercent: row.growthPercent,
  growthLabel: `+${row.growthPercent}%`,
  fit: row.fit,
  viewsPerFollower: row.viewsPerFollower,
  beats: toBeats(row.beats),
  whyItWorks: row.whyItWorks,
  platform: row.platform,
  isFromMyNiche: row.fromNiche === workspace.niche,
}))

// ---------------------------------------------------------------------------
// Metrics (last 7 days)
// ---------------------------------------------------------------------------

export const bestTimes: readonly BestTime[] = [
  { timeLabel: '7:30 am', time24: '07:30' },
  { timeLabel: '12:15 pm', time24: '12:15' },
  { timeLabel: '7:45 pm', time24: '19:45' },
]

export const metrics: Metrics = {
  posts: 21,
  views: 48300,
  profileVisits: 1930,
  linkClicks: 214,
  leads: 31,
  callsBooked: 6,
  viewsByDay: [4100, 5600, 6200, 7900, 8400, 7300, 8800],
  deltas: {
    views: { label: '+18%', direction: 'up' },
    linkClicks: { label: '+22%', direction: 'up' },
    callsBooked: { label: '+2', direction: 'up' },
  },
  topHookType: 'Question hooks',
  topHookMultiplierLabel: '2.1× average views',
  bestTimes,
}

// ---------------------------------------------------------------------------
// Agents (S8)
// ---------------------------------------------------------------------------

export const agents: readonly Agent[] = [
  {
    id: 'trend-scout',
    name: 'Trend Scout',
    role: 'Finds and scores rising formats in the niche and nearby niches',
    status: 'working',
    statusLabel: 'Working',
    lastAction: 'Found "The 3-word reframe" rising in Leadership (+340%)',
    doneThisWeek: '14 trends scored',
    spendUsd: 6,
    capUsd: 25,
    isEnabled: true,
  },
  {
    id: 'remake-producer',
    name: 'Remake Producer',
    role: 'Rebuilds a rising format with a new script, new footage and a new voice',
    status: 'waiting',
    statusLabel: 'Waiting for approval',
    lastAction: 'Draft ready: "The 3-word reframe" for Maya (similarity 12%)',
    doneThisWeek: '3 remakes',
    spendUsd: 18,
    capUsd: 60,
    isEnabled: true,
  },
  {
    id: 'multiplier',
    name: 'Multiplier',
    role: 'Turns one long video into many vertical cuts',
    status: 'idle',
    statusLabel: 'Idle',
    lastAction: 'Cut 12 clips from Episode 47',
    doneThisWeek: '36 cuts',
    spendUsd: 9,
    capUsd: 40,
    isEnabled: true,
  },
  {
    id: 'compliance',
    name: 'Compliance',
    role: 'Checks every cut before it can be scheduled',
    status: 'working',
    statusLabel: 'Working',
    lastAction: '9 passed, 2 need review, 1 blocked (venue music)',
    doneThisWeek: '41 checks, 2 blocked',
    spendUsd: 3,
    capUsd: 15,
    isEnabled: true,
  },
  {
    id: 'client-concierge',
    name: 'Client Concierge',
    role: 'Keeps the client briefed and collects approvals',
    status: 'idle',
    statusLabel: 'Idle',
    lastAction: "Sent this week's report to Maya",
    doneThisWeek: '1 report, 5 approvals',
    spendUsd: 2,
    capUsd: 10,
    isEnabled: true,
  },
  {
    id: 'publisher',
    name: 'Publisher',
    role: 'Posts to connected accounts through official platform APIs',
    status: 'working',
    statusLabel: 'Working',
    lastAction: 'Posted to TikTok (private until app approval)',
    doneThisWeek: '21 posts',
    spendUsd: 1,
    capUsd: 10,
    isEnabled: true,
  },
  {
    id: 'performance-analyst',
    name: 'Performance Analyst',
    role: 'Reads the results and tells the other agents what to make next',
    status: 'working',
    statusLabel: 'Working',
    lastAction: 'Question hooks beat the average by 2.1×; raising their share next week',
    doneThisWeek: '21 posts analysed',
    spendUsd: 4,
    capUsd: 20,
    isEnabled: true,
  },
]

interface AgentLogRow {
  readonly timeLabel: string
  readonly time24: string
  readonly agentId: string
  readonly message: string
  readonly costUsd: number | null
}

const AGENT_LOG_ROWS: readonly AgentLogRow[] = [
  {
    timeLabel: '9:41 am',
    time24: '09:41',
    agentId: 'multiplier',
    message: 'Cut 12 clips from Episode 47',
    costUsd: 1.84,
  },
  {
    timeLabel: '9:44 am',
    time24: '09:44',
    agentId: 'compliance',
    message: '9 passed, 2 need review, 1 blocked (venue music)',
    costUsd: null,
  },
  {
    timeLabel: '10:05 am',
    time24: '10:05',
    agentId: 'trend-scout',
    message: 'Found "The 3-word reframe" rising in Leadership (+340%)',
    costUsd: null,
  },
  {
    timeLabel: '10:20 am',
    time24: '10:20',
    agentId: 'remake-producer',
    message: 'Draft ready: "The 3-word reframe" for Maya (similarity 12%)',
    costUsd: null,
  },
  {
    timeLabel: '12:15 pm',
    time24: '12:15',
    agentId: 'publisher',
    message: 'Posted to TikTok (private until app approval)',
    costUsd: null,
  },
  {
    timeLabel: '1:00 pm',
    time24: '13:00',
    agentId: 'performance-analyst',
    message: 'Question hooks beat the average by 2.1×; raising their share next week',
    costUsd: null,
  },
]

function agentNameById(id: string): string {
  const agent = agents.find((candidate) => candidate.id === id)
  if (!agent) {
    throw new Error(`Unknown agent id: ${id}`)
  }
  return agent.name
}

export const agentFeed: readonly AgentLogEntry[] = AGENT_LOG_ROWS.map((row, position) => ({
  id: `log-${idSuffix(position + 1)}`,
  date: TODAY,
  timeLabel: row.timeLabel,
  time24: row.time24,
  agentId: row.agentId,
  agentName: agentNameById(row.agentId),
  message: row.message,
  costUsd: row.costUsd,
}))

// ---------------------------------------------------------------------------
// Results (S7)
// ---------------------------------------------------------------------------

export const funnel: readonly FunnelStage[] = [
  { id: 'views', label: 'Views', value: metrics.views, valueLabel: '48,300' },
  {
    id: 'profile-visits',
    label: 'Profile visits',
    value: metrics.profileVisits,
    valueLabel: '1,930',
  },
  { id: 'link-clicks', label: 'Link clicks', value: metrics.linkClicks, valueLabel: '214' },
  { id: 'leads', label: 'Leads', value: metrics.leads, valueLabel: '31' },
  { id: 'calls-booked', label: 'Calls booked', value: metrics.callsBooked, valueLabel: '6' },
]

interface TopPostRow {
  readonly cutId: string
  readonly platform: Platform
  readonly views: number
  readonly clicks: number
  readonly calls: number
}

const TOP_POST_ROWS: readonly TopPostRow[] = [
  { cutId: 'cut-01', platform: 'instagram', views: 9840, clicks: 52, calls: 2 },
  { cutId: 'cut-03', platform: 'youtube', views: 7210, clicks: 38, calls: 1 },
  { cutId: 'cut-02', platform: 'instagram', views: 6560, clicks: 29, calls: 1 },
  { cutId: 'cut-08', platform: 'tiktok', views: 5120, clicks: 31, calls: 1 },
  { cutId: 'cut-07', platform: 'instagram', views: 3980, clicks: 17, calls: 1 },
]

export const topPosts: readonly TopPost[] = TOP_POST_ROWS.map((row, position) => {
  const cut = cutById(row.cutId)
  return {
    id: `top-post-${idSuffix(position + 1)}`,
    cutId: cut.id,
    hook: cut.hook,
    platform: row.platform,
    platformLabel: PLATFORM_LABELS[row.platform],
    views: row.views,
    clicks: row.clicks,
    calls: row.calls,
    thumbnailColor: cut.thumbnailColor,
  }
})

export const hookTypeRanking: readonly HookTypeRank[] = [
  { id: 'question', label: 'Question', averageViews: 4410 },
  { id: 'bold-claim', label: 'Bold claim', averageViews: 2530 },
  { id: 'story-opener', label: 'Story opener', averageViews: 2180 },
  { id: 'list', label: 'List', averageViews: 1650 },
]

// ---------------------------------------------------------------------------
// Brand kit (S9)
// ---------------------------------------------------------------------------

export const brandKit: BrandKit = {
  id: 'brand-kit-maya-torres',
  logoLabel: 'Maya Torres Coaching',
  colors: [
    { id: 'deep-teal', name: 'Deep teal', hex: '#12545A' },
    { id: 'warm-sand', name: 'Warm sand', hex: '#F3E9DC' },
    { id: 'coral', name: 'Coral', hex: '#FF5A36' },
    { id: 'ink', name: 'Ink', hex: '#14171C' },
  ],
  headingFont: 'Inter Tight',
  bodyFont: 'Inter',
  captionStyles: [
    {
      id: 'bold-highlight',
      name: 'Bold highlight',
      description: 'Bold white words with a teal highlight behind the key phrase.',
      isSelected: true,
    },
    {
      id: 'editorial-serif',
      name: 'Editorial serif',
      description: 'Serif lines on warm sand, one sentence at a time.',
      isSelected: false,
    },
    {
      id: 'clean-minimal',
      name: 'Clean minimal',
      description: 'Small white captions, no background, bottom third.',
      isSelected: false,
    },
  ],
  introTemplate: 'Loop mark, 0.6s, warm sand on deep teal',
  outroTemplate: '"Book a discovery call" card with the link, 1.5s',
  voice: {
    mode: 'my-own-voice',
    label: 'My own voice',
    consent: {
      id: 'consent-voice-release',
      type: 'voice-release',
      title: 'Voice release — Maya Torres',
      signedBy: 'Maya Torres',
      signedOn: '2026-11-09',
      signedOnLabel: '9 Nov 2026',
      status: 'signed',
    },
  },
  wordsAlways: ['first-time managers', 'burnout', 'reframe', '1:1'],
  wordsNever: ['hustle', 'crush it', 'guaranteed'],
}

export const consentRecords: readonly ConsentRecord[] = [
  brandKit.voice.consent,
  {
    id: 'consent-rights-episode-47',
    type: 'rights-confirmation',
    title: 'Rights confirmation — Episode 47 upload',
    signedBy: 'Maya Torres',
    signedOn: TODAY,
    signedOnLabel: '9 Nov 2026',
    status: 'signed',
  },
]

// ---------------------------------------------------------------------------
// Settings and billing (S10)
// ---------------------------------------------------------------------------

export const invoices: readonly Invoice[] = [
  {
    id: 'invoice-2026-11',
    number: 'MR-2026-011',
    date: '2026-11-01',
    dateLabel: '1 Nov 2026',
    planName: 'Growth',
    amountUsd: 1500,
    amountLabel: '$1,500.00',
    status: 'paid',
  },
  {
    id: 'invoice-2026-10',
    number: 'MR-2026-010',
    date: '2026-10-15',
    dateLabel: '15 Oct 2026',
    planName: 'Pilot',
    amountUsd: 750,
    amountLabel: '$750.00',
    status: 'paid',
  },
]

export const teamMembers: readonly TeamMember[] = [
  {
    id: 'team-maya-torres',
    name: 'Maya Torres',
    role: 'Owner',
    permission: 'Approves posts',
    initials: 'MT',
  },
  {
    id: 'team-sam-lee',
    name: 'Sam Lee',
    role: 'Assistant',
    permission: 'Can edit captions',
    initials: 'SL',
  },
]

/**
 * Types for the Mirrorline demo fixtures.
 *
 * Every value that fills these shapes is fictional and lives in ./data.ts,
 * transcribed from docs/specs/08_MOCK_DATA.md. Dates are ISO strings
 * ('2026-11-09'); clock times carry a display label ('7:30 am') plus a
 * sortable 24h field ('07:30') wherever ordering matters.
 */

/** Compliance gate verdict for a cut or a remake. */
export type ComplianceStatus = 'passed' | 'needs-review' | 'blocked'

/** Lifecycle of a post on the calendar or the today timeline. */
export type PostStatus =
  | 'published'
  | 'published-private'
  | 'scheduled'
  | 'needs-review'
  | 'approved'

/** Agent status pill. */
export type AgentStatus = 'working' | 'idle' | 'waiting' | 'blocked' | 'off'

/** Platforms we publish to through official APIs. */
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin'

/** Format tag printed on a cut card. */
export type FormatTag = 'Hook clip' | 'Story' | 'Tip' | 'Quote card' | 'Carousel' | 'Reply'

/** Connection state of a client social account. */
export type AccountStatus = 'connected' | 'reconnect-needed' | 'not-connected'

/** Direction of a 7-day metric delta. */
export type TrendDirection = 'up' | 'down' | 'flat'

export interface Workspace {
  readonly id: string
  readonly name: string
  /** Fictional owner of the demo workspace. */
  readonly ownerName: string
  readonly ownerRole: string
  readonly showName: string
  readonly showCadence: string
  readonly planName: string
  readonly planPriceUsdPerMonth: number
  readonly planPriceLabel: string
  readonly postsIncluded: number
  readonly postsUsed: number
  readonly niche: string
  readonly nearbyNiches: readonly string[]
  readonly goal: string
  readonly goalLink: string
  readonly postsPerDayPerPlatform: number
}

export interface SocialAccount {
  readonly id: string
  readonly platform: Platform
  readonly platformLabel: string
  /** Account name as the platform shows it. */
  readonly displayName: string
  /** '@handle', or null for platforms we have not connected. */
  readonly handle: string | null
  readonly status: AccountStatus
  readonly statusLabel: string
  /** Honest limit shown under the card, e.g. the TikTok approval note. */
  readonly note: string | null
  /** True while the platform only accepts private posts from our app. */
  readonly isPrivatePosting: boolean
  /** ISO date, or null when never connected. */
  readonly connectedOn: string | null
}

export interface SourceVideo {
  readonly id: string
  readonly title: string
  readonly durationLabel: string
  readonly durationSeconds: number
  /** ISO date of the upload. */
  readonly uploadedOn: string
  readonly uploadedAtLabel: string
  readonly uploadedAt24: string
}

export interface Cut {
  readonly id: string
  /** 1-based position in the results grid. */
  readonly index: number
  readonly hook: string
  readonly lengthLabel: string
  readonly lengthSeconds: number
  readonly format: FormatTag
  /** Predicted strength, 0-100. */
  readonly score: number
  readonly compliance: ComplianceStatus
  readonly complianceLabel: string
  /** Why the gate flagged it; null when it passed. */
  readonly complianceReason: string | null
  readonly thumbnailColor: string
}

export interface TrendBeat {
  /** 1-based position in the anonymised storyboard. */
  readonly order: number
  readonly label: string
}

export interface Trend {
  readonly id: string
  /** Format name, e.g. 'The 3-word reframe'. */
  readonly format: string
  readonly fromNiche: string
  /** 7-day growth as a number, e.g. 340. */
  readonly growthPercent: number
  /** Display form of the same figure, e.g. '+340%'. */
  readonly growthLabel: string
  /** Fit for this brand, 0-100. */
  readonly fit: number
  readonly beats: readonly TrendBeat[]
  readonly whyItWorks: string
  readonly platform: Platform
  /** True when the format comes from the client's own niche. */
  readonly isFromMyNiche: boolean
}

export interface ScheduledPost {
  readonly id: string
  /** Cut this post was built from, or null for a remake. */
  readonly cutId: string | null
  /** ISO date. */
  readonly date: string
  readonly timeLabel: string
  readonly time24: string
  readonly platform: Platform
  /** 'YouTube Shorts' rather than 'youtube'. */
  readonly platformLabel: string
  readonly title: string
  readonly status: PostStatus
  readonly statusLabel: string
  /** AI scenes are always labelled, in the UI and on the platform. */
  readonly hasAiScenes: boolean
  readonly thumbnailColor: string
}

export interface CalendarDay {
  /** ISO date. */
  readonly date: string
  /** 'Mon' … 'Sun'. */
  readonly dayLabel: string
  readonly dayOfMonth: number
  readonly monthLabel: string
  readonly isToday: boolean
}

export interface CalendarCell {
  /** ISO date, matching the column. */
  readonly date: string
  readonly posts: readonly ScheduledPost[]
}

export interface CalendarRow {
  readonly platform: Platform
  readonly platformLabel: string
  readonly cells: readonly CalendarCell[]
}

export interface WeekSchedule {
  readonly days: readonly CalendarDay[]
  readonly rows: readonly CalendarRow[]
}

export interface Agent {
  readonly id: string
  readonly name: string
  readonly role: string
  readonly status: AgentStatus
  readonly statusLabel: string
  readonly lastAction: string
  /** What it finished this week, e.g. '14 trends scored'. */
  readonly doneThisWeek: string
  readonly spendUsd: number
  readonly capUsd: number
  readonly isEnabled: boolean
}

export interface AgentLogEntry {
  readonly id: string
  /** ISO date. */
  readonly date: string
  readonly timeLabel: string
  readonly time24: string
  readonly agentId: string
  readonly agentName: string
  readonly message: string
  /** Cost of the action in USD, or null when the line carries no cost. */
  readonly costUsd: number | null
}

export interface FunnelStage {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly valueLabel: string
}

export interface TopPost {
  readonly id: string
  readonly cutId: string | null
  readonly hook: string
  readonly platform: Platform
  readonly platformLabel: string
  readonly views: number
  readonly clicks: number
  readonly calls: number
  readonly thumbnailColor: string
}

export interface HookTypeRank {
  readonly id: string
  readonly label: string
  readonly averageViews: number
}

export interface BestTime {
  readonly timeLabel: string
  readonly time24: string
}

export interface MetricDelta {
  readonly label: string
  readonly direction: TrendDirection
}

export interface Metrics {
  readonly posts: number
  readonly views: number
  readonly profileVisits: number
  readonly linkClicks: number
  readonly leads: number
  readonly callsBooked: number
  /** Monday to Sunday. */
  readonly viewsByDay: readonly number[]
  readonly deltas: {
    readonly views: MetricDelta
    readonly linkClicks: MetricDelta
    readonly callsBooked: MetricDelta
  }
  readonly topHookType: string
  readonly topHookMultiplierLabel: string
  readonly bestTimes: readonly BestTime[]
}

export interface BrandColor {
  readonly id: string
  readonly name: string
  readonly hex: string
}

export interface CaptionStyle {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly isSelected: boolean
}

export interface ConsentRecord {
  readonly id: string
  readonly type: 'voice-release' | 'rights-confirmation'
  readonly title: string
  readonly signedBy: string
  /** ISO date. */
  readonly signedOn: string
  readonly signedOnLabel: string
  readonly status: 'signed' | 'pending'
}

export interface VoiceSettings {
  readonly mode: 'my-own-voice' | 'stock-voice'
  readonly label: string
  readonly consent: ConsentRecord
}

export interface BrandKit {
  readonly id: string
  readonly logoLabel: string
  readonly colors: readonly BrandColor[]
  readonly headingFont: string
  readonly bodyFont: string
  readonly captionStyles: readonly CaptionStyle[]
  readonly introTemplate: string
  readonly outroTemplate: string
  readonly voice: VoiceSettings
  readonly wordsAlways: readonly string[]
  readonly wordsNever: readonly string[]
}

export interface Invoice {
  readonly id: string
  readonly number: string
  /** ISO date. */
  readonly date: string
  readonly dateLabel: string
  readonly planName: string
  readonly amountUsd: number
  readonly amountLabel: string
  readonly status: 'paid' | 'open'
}

export interface TeamMember {
  readonly id: string
  readonly name: string
  readonly role: string
  readonly permission: string
  readonly initials: string
}

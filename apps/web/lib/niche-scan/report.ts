/**
 * What a niche report is, and what we refuse to accept as one (V1, §2.5).
 *
 * The five findings `§2.5` names — top formats, hooks, topics, lengths,
 * posting patterns — plus the examples they were read from.
 *
 * ## Parsed, never trusted
 *
 * The model returns structured output, which means it returns JSON of the
 * right *shape* far more often than not. "Far more often than not" is not a
 * guarantee, and this is the boundary between a model and our database, so
 * every field is checked.
 *
 * Two checks are not shape checks and matter more than the rest:
 *
 * 1. **An example without an `https://` url is dropped.** `12 §1` records
 *    links so a source audit is answerable from the data; an example whose
 *    source cannot be opened is the unverifiable compliance record D115 was
 *    about. The database enforces this too — belt and braces, because the
 *    database refusal arrives as a failed insert and this arrives as a
 *    dropped row with a reason.
 * 2. **Anything that looks like a media file is dropped**, url or not.
 *    Non-negotiable 1 is "never download, store or reuse other creators'
 *    videos or audio", and a model asked for a link to a post will
 *    occasionally hand back a link to an `.mp4`. Storing it would be a breach
 *    whether or not we ever fetched it.
 */

/** A format the scan found working, with how we would make it the client's. */
export interface FormatFinding {
  readonly name: string
  readonly whyItWorks: string
  readonly beats: readonly string[]
  /** 0–100, this client's fit. `12 §1`'s `fit_score`. */
  readonly fit: number
}

export interface LengthFinding {
  readonly seconds: number
  readonly note: string
}

export const ACCOUNT_SIZE_BUCKETS = [
  'under_1k',
  '1k_10k',
  '10k_100k',
  '100k_1m',
  'over_1m',
] as const

export type AccountSizeBucket = (typeof ACCOUNT_SIZE_BUCKETS)[number]

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const

export type TrendPlatform = (typeof PLATFORMS)[number]

/**
 * One public post the scan read a recipe from. **A pointer and a description,
 * never the work** (D115).
 */
export interface TrendExample {
  readonly url: string
  readonly platform: TrendPlatform
  readonly formatName: string
  readonly hookType: string
  readonly lengthSeconds: number | null
  readonly views: number | null
  readonly viewsPerFollower: number | null
  readonly accountSizeBucket: AccountSizeBucket | null
  readonly postedAt: string | null
  readonly whyItWorks: string
  /** Where the scan looked, per row. `12 §1` makes this the audit record. */
  readonly sourceNote: string
}

export interface NicheReportFindings {
  readonly topFormats: readonly FormatFinding[]
  readonly topHooks: readonly string[]
  readonly topics: readonly string[]
  readonly lengths: readonly LengthFinding[]
  readonly postingPatterns: readonly string[]
  readonly examples: readonly TrendExample[]
  readonly sourcesUsed: readonly string[]
}

/**
 * File extensions that mean somebody handed us the media instead of the post.
 *
 * Checked on the url rather than on a content type, because we never fetch
 * the url — which is the point. A link we do not open cannot tell us what it
 * is, so the only signal available is how it is spelled.
 */
const MEDIA_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv|mp3|m4a|wav|aac|jpe?g|png|gif|webp)(\?|#|$)/i

export function isStorableSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (!/^https?:\/\//i.test(value)) return false
  if (MEDIA_EXTENSIONS.test(value)) return false
  return true
}

function str(value: unknown, max = 400): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, max)
}

function strList(value: unknown, max: number): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => str(entry))
    .filter((entry): entry is string => entry !== null)
    .slice(0, max)
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

function parseFormat(value: unknown): FormatFinding | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const name = str(row.name, 120)
  const whyItWorks = str(row.whyItWorks ?? row.why_it_works)
  if (!name || !whyItWorks) return null

  const fit = num(row.fit)

  return {
    name,
    whyItWorks,
    beats: strList(row.beats, 8),
    // A missing fit score becomes 0 rather than a guess. `12 §1` ranks by
    // views per follower anyway; the fit is the scan's opinion, and an absent
    // opinion should not read as a confident middling one.
    fit: fit === null ? 0 : Math.round(clamp(fit, 0, 100)),
  }
}

function parseLength(value: unknown): LengthFinding | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const seconds = num(row.seconds)
  const note = str(row.note, 200)
  if (seconds === null || seconds <= 0 || !note) return null

  return { seconds: Math.round(seconds), note }
}

export interface ParsedExample {
  readonly example: TrendExample | null
  /** Why it was dropped, for the log. Null when it was kept. */
  readonly dropped: string | null
}

export function parseExample(value: unknown): ParsedExample {
  if (typeof value !== 'object' || value === null) {
    return { example: null, dropped: 'not an object' }
  }
  const row = value as Record<string, unknown>

  if (!isStorableSourceUrl(row.url)) {
    // One message for both failures on purpose: from the log's point of view
    // "we were given something we will not store as a source" is the fact.
    return {
      example: null,
      dropped: 'url is not an https link to a post, or points at a media file',
    }
  }

  const formatName = str(row.formatName ?? row.format_name, 120)
  const whyItWorks = str(row.whyItWorks ?? row.why_it_works)
  const sourceNote = str(row.sourceNote ?? row.source_note, 200)
  if (!formatName || !whyItWorks || !sourceNote) {
    return { example: null, dropped: 'missing a format name, a reason or a source note' }
  }

  const platformRaw = str(row.platform, 20)?.toLowerCase()
  const platform = PLATFORMS.find((entry) => entry === platformRaw)
  if (!platform) return { example: null, dropped: 'platform is not one we support' }

  const bucketRaw = str(row.accountSizeBucket ?? row.account_size_bucket, 20)
  const accountSizeBucket = ACCOUNT_SIZE_BUCKETS.find((entry) => entry === bucketRaw) ?? null

  const postedAtRaw = str(row.postedAt ?? row.posted_at, 10)
  // ISO `YYYY-MM-DD` or nothing. A half-parsed date is worse than an absent
  // one: `posted_at` feeds "is this format growing *now*".
  const postedAt = postedAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(postedAtRaw) ? postedAtRaw : null

  return {
    dropped: null,
    example: {
      url: row.url,
      platform,
      formatName,
      hookType: str(row.hookType ?? row.hook_type, 80) ?? 'unstated',
      lengthSeconds: num(row.lengthSeconds ?? row.length_seconds),
      views: num(row.views),
      viewsPerFollower: num(row.viewsPerFollower ?? row.views_per_follower),
      accountSizeBucket,
      postedAt,
      whyItWorks,
      sourceNote,
    },
  }
}

export interface ParsedReport {
  readonly findings: NicheReportFindings
  /** Every example that was thrown away, and why. Logged, never silent. */
  readonly droppedExamples: readonly string[]
}

/**
 * Turn whatever the model returned into a report, or `null` if it is not one.
 *
 * `null` means "there is no report here" — no formats and no examples. A
 * report with some fields missing is still a report and renders as what it
 * has; a report with nothing in it would render as a screen claiming research
 * happened.
 */
export function parseReport(value: unknown): ParsedReport | null {
  if (typeof value !== 'object' || value === null) return null
  const root = value as Record<string, unknown>

  const rawFormats = root.topFormats ?? root.top_formats
  const topFormats = Array.isArray(rawFormats)
    ? (rawFormats as readonly unknown[])
        .map(parseFormat)
        .filter((entry): entry is FormatFinding => entry !== null)
        .slice(0, 10)
    : []

  const lengths = Array.isArray(root.lengths)
    ? (root.lengths as readonly unknown[])
        .map(parseLength)
        .filter((entry): entry is LengthFinding => entry !== null)
        .slice(0, 6)
    : []

  const rawExamples = Array.isArray(root.examples) ? (root.examples as readonly unknown[]) : []
  const parsedExamples = rawExamples.slice(0, 30).map(parseExample)

  const examples = parsedExamples
    .map((entry) => entry.example)
    .filter((entry): entry is TrendExample => entry !== null)

  const droppedExamples = parsedExamples
    .map((entry) => entry.dropped)
    .filter((entry): entry is string => entry !== null)

  if (topFormats.length === 0 && examples.length === 0) return null

  return {
    droppedExamples,
    findings: {
      topFormats,
      topHooks: strList(root.topHooks ?? root.top_hooks, 10),
      topics: strList(root.topics, 12),
      lengths,
      postingPatterns: strList(root.postingPatterns ?? root.posting_patterns, 8),
      examples,
      sourcesUsed: strList(root.sourcesUsed ?? root.sources_used, 12),
    },
  }
}

/**
 * Rank by views per follower, never by raw views (`12 §1`).
 *
 * "A 4,000-follower account getting 40,000 views a video is a better model
 * than a two-million-follower account coasting, and ranking by raw views
 * would recommend the coaster." Examples with no ratio sort last rather than
 * as zero — an unmeasured value is not a bad one.
 */
export function rankExamples(examples: readonly TrendExample[]): readonly TrendExample[] {
  return [...examples].sort((a, b) => {
    const left = a.viewsPerFollower
    const right = b.viewsPerFollower
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1
    return right - left
  })
}

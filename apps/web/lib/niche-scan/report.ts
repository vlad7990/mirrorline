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

import { parseVideoIdeas, type VideoIdea } from '../scripts/video-idea'

/** A format the scan found working, with how we would make it the client's. */
export interface FormatFinding {
  readonly name: string
  readonly whyItWorks: string
  readonly beats: readonly string[]
  /** 0–10, this client's fit. `12 §1`'s `fit_score`. See `FIT_MAX`. */
  readonly fit: number
  /**
   * One line saying *why* this fit, naming something from the client's own
   * profile (V1 P1.7).
   *
   * A bare "Fit 9" is a number with no argument behind it, and a client
   * reading their own report cannot tell a considered 9 from a generous one.
   * "Fit 9: matches her reactive-dog service and her positive-only method" is
   * checkable — including when it is wrong, which is the part that matters.
   */
  readonly fitReason: string | null
}

/**
 * Where a finding came from, and it is a claim about evidence (V1 P1.9).
 *
 * - `posts` — read off public posts the scan actually found.
 * - `guidance` — from a published guide or an agency write-up about the niche.
 *   Industry guidance. Not evidence that anything is working for anyone.
 * - `unstated` — the scan did not say. Shown as guidance, never as evidence:
 *   between two readings of silence, the product takes the weaker one.
 *
 * `15 §honesty rules` is the whole reason this is a field rather than a tone
 * of voice. The first live report mixed both kinds in one bulleted list, where
 * "post three to five times a week" (somebody's blog) sat beside a hook read
 * off thirty real videos, in the same type, with nothing to tell them apart.
 */
export const CLAIM_BASES = ['posts', 'guidance', 'unstated'] as const

export type ClaimBasis = (typeof CLAIM_BASES)[number]

/** A hook, a topic or a posting pattern, with where it came from. */
export interface Claim {
  readonly text: string
  readonly basis: ClaimBasis
  /**
   * Set when the topic splits the niche (V1 P1.8).
   *
   * Every niche has arguments in it — board-and-train, raw feeding, whether
   * sun cream causes anything. A format built on one takes a side in public,
   * on the client's own account, and that is a business decision rather than a
   * content one. The scan may raise them; it may not slip them in unlabelled.
   */
  readonly brandRisk: string | null
}

/**
 * The fit scale, named once because a score only means something beside it.
 *
 * **It was 0–100 and the model answered on 0–10 anyway.** The first live scan
 * came back with fits of 9, 8 and 7 — the scale a person reaches for when
 * asked how well something fits — and the screen drew each of them as a bar
 * that was 9% full beside the words "Fit 9". Both halves were defensible and
 * together they said the opposite of the finding: the three formats we were
 * recommending looked like the three worst matches available.
 *
 * So the scale is 0–10 everywhere now, stated in the schema, in the prompt and
 * beside every number on screen. `normaliseFit` carries the old rows across.
 */
export const FIT_MAX = 10

/**
 * A fit score on the 0–10 scale, whichever scale it arrived on.
 *
 * A value above 10 can only be a 0–100 answer — the schema forbids one now, but
 * rows written before it did are in the database and the sample report was
 * written on that scale too. Divided rather than clamped: clamping would turn
 * every stored 86 into a flat 10 and lose the ranking between formats.
 */
export function normaliseFit(value: unknown): number {
  const parsed = num(value)
  if (parsed === null || parsed <= 0) return 0
  const onScale = parsed > FIT_MAX ? parsed / 10 : parsed
  return Math.round(clamp(onScale, 0, FIT_MAX))
}

/** How full the fit bar is drawn. 9 out of 10 is 90% of a bar, not 9%. */
export function fitPercent(fit: number): number {
  return (clamp(fit, 0, FIT_MAX) / FIT_MAX) * 100
}

/**
 * Where a finding came from, as the report prints it (V1 P0.5).
 *
 * `sources_used` was a list of bare urls and the screen printed them joined by
 * semicolons: four wrapped lines of `https://…` with nothing saying what any
 * of them was. A reader cannot audit that, which is the entire job `12 §1`
 * gives this field.
 *
 * `kind` is the distinction that matters most and it is **not cosmetic**: a
 * public post is evidence that a format is working, and an agency's blog post
 * about short video is somebody's opinion. `15 §honesty rules` forbids
 * dressing the second up as the first, so the two are labelled apart wherever
 * they appear.
 */
export const SOURCE_KINDS = ['post', 'guide'] as const

export type SourceKind = (typeof SOURCE_KINDS)[number]

export interface ReportSource {
  readonly title: string
  readonly url: string
  /** `instagram.com`, `blog.hootsuite.com`. Derived, never asked for. */
  readonly domain: string
  readonly kind: SourceKind
}

/**
 * A length that works, as a range (V1 P1.9).
 *
 * It was a single integer, and the first live report printed "8s", "21s",
 * "34s", "58s" — four precise numbers nobody measured to the second. The
 * finding is real and the precision was not: what a scan can see is that
 * myth-busting videos in this niche run about twenty to thirty-five seconds.
 * A range says the same thing without the invented decimal place.
 */
export interface LengthFinding {
  readonly secondsMin: number
  readonly secondsMax: number
  readonly note: string
  readonly basis: ClaimBasis
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
  readonly topHooks: readonly Claim[]
  readonly topics: readonly Claim[]
  readonly lengths: readonly LengthFinding[]
  readonly postingPatterns: readonly Claim[]
  readonly examples: readonly TrendExample[]
  readonly sourcesUsed: readonly ReportSource[]
  /**
   * One honest line when the open web held no public posts we could link to.
   *
   * `null` on a normal report. Computed by `evidenceCaveatFor` on both the
   * write and the read path, because a report is persisted into separate
   * columns rather than one blob — see that function for why deriving is the
   * honest option here rather than a shortcut around a migration.
   */
  readonly evidenceCaveat: string | null
  /**
   * Three video ideas written from the formats above (V2).
   *
   * On the report because they are the end of it: the research is only useful
   * if it ends in something to shoot on Monday. Empty when the script agent
   * refused every draft, which is a real outcome — see `first-videos.ts`.
   */
  readonly firstVideos: readonly VideoIdea[]
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

  return {
    name,
    whyItWorks,
    beats: strList(row.beats, 8),
    // A missing fit score becomes 0 rather than a guess. `12 §1` ranks by
    // views per follower anyway; the fit is the scan's opinion, and an absent
    // opinion should not read as a confident middling one.
    fit: normaliseFit(row.fit),
    fitReason: str(row.fitReason ?? row.fit_reason, 240),
  }
}

/**
 * One claim, from whichever shape it arrives in.
 *
 * A bare string is accepted because that is what every hook, topic and posting
 * pattern written before P1 is stored as. It becomes `unstated` rather than
 * `posts`: an old row whose provenance nobody recorded is not evidence, and
 * promoting it to evidence on read would be the parser inventing the thing
 * this field exists to stop.
 */
export function parseClaim(value: unknown): Claim | null {
  if (typeof value === 'string') {
    const text = str(value)
    return text ? { text, basis: 'unstated', brandRisk: null } : null
  }

  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const text = str(row.text ?? row.name)
  if (!text) return null

  const basisRaw = str(row.basis, 20)?.toLowerCase()
  const basis = CLAIM_BASES.find((entry) => entry === basisRaw) ?? 'unstated'

  return { text, basis, brandRisk: str(row.brandRisk ?? row.brand_risk, 200) }
}

export function parseClaims(value: unknown, max: number): readonly Claim[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseClaim)
    .filter((claim): claim is Claim => claim !== null)
    .slice(0, max)
}

/** `blog.hootsuite.com/short-video` → `blog.hootsuite.com`. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

/**
 * One source row, or `null`.
 *
 * The url is held to the same bar as an example's: https, and not a media
 * file. A "source" we would refuse to store as an example is not a source we
 * should print either — same rule, same reason (non-negotiable 1).
 *
 * A plain string is still accepted, because that is what every row written
 * before this shape existed contains. It becomes a source titled by its own
 * domain and tagged `guide`: the honest reading of "a link we kept but cannot
 * describe" is the weaker of the two claims, never the stronger one.
 */
export function parseSource(value: unknown): ReportSource | null {
  if (typeof value === 'string') {
    const url = value.trim()
    if (!isStorableSourceUrl(url)) return null
    const domain = domainOf(url)
    return { title: domain || url, url, domain, kind: 'guide' }
  }

  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const url = str(row.url, 600)
  if (!url || !isStorableSourceUrl(url)) return null

  const domain = domainOf(url)
  const kindRaw = str(row.kind, 20)?.toLowerCase()
  const kind = SOURCE_KINDS.find((entry) => entry === kindRaw) ?? 'guide'

  return {
    // A missing title is the domain rather than "Untitled": the domain is a
    // fact about the link, and a placeholder is a blank where a fact belongs.
    title: str(row.title, 200) ?? domain ?? url,
    url,
    domain,
    kind,
  }
}

/**
 * A length range, from a range or from the single number we used to store.
 *
 * An old row holding `seconds: 21` becomes 21–21 rather than being dropped:
 * the finding was real, only its precision was invented, and the screen prints
 * a single number when the two ends agree. A range given backwards is put the
 * right way round rather than refused — that is a typo, not a disagreement.
 */
function parseLength(value: unknown): LengthFinding | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const note = str(row.note, 200)
  if (!note) return null

  const single = num(row.seconds)
  const low = num(row.secondsMin ?? row.seconds_min) ?? single
  const high = num(row.secondsMax ?? row.seconds_max) ?? single
  if (low === null || high === null || low <= 0 || high <= 0) return null

  const basisRaw = str(row.basis, 20)?.toLowerCase()
  const basis = CLAIM_BASES.find((entry) => entry === basisRaw) ?? 'unstated'

  return {
    secondsMin: Math.round(Math.min(low, high)),
    secondsMax: Math.round(Math.max(low, high)),
    note,
    basis,
  }
}

/** Every length that can be drawn, capped at 6. Shared with the read path. */
export function parseLengths(value: unknown): readonly LengthFinding[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseLength)
    .filter((entry): entry is LengthFinding => entry !== null)
    .slice(0, 6)
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
const PLACEHOLDER_PATTERNS: readonly { readonly name: string; readonly test: RegExp }[] = [
  { name: 'placeholder', test: /^placeholders?$/ },
  { name: 'lorem', test: /^lorem(\s+ipsum.*)?$/ },
  { name: 'tbd', test: /^(tbd|to be determined|to be confirmed)$/ },
  { name: 'todo', test: /^(todo|to do|fixme)$/ },
  { name: 'na', test: /^(n\s*\/?\s*a|none|null|undefined|unknown)$/ },
  { name: 'type-name', test: /^(string|text|number|example|sample|value|item)$/ },
  { name: 'ellipsis', test: /^[.…\-–—\s]*$/ },
]

/**
 * Does this one field read as a placeholder? Returns the pattern's name.
 *
 * Matched against a **whole normalised field**, never a substring, so a real
 * finding that happens to contain one of these words survives: "why the price
 * is TBD until you have seen the job" is research, and `tbd` alone in a
 * format's name is not. The patterns are ours, so naming the one that matched
 * in a log leaks nothing about the client or the model's output.
 */
function placeholderIn(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase()
  if (normalised === '') return null
  return PLACEHOLDER_PATTERNS.find((pattern) => pattern.test.test(normalised))?.name ?? null
}

/** What the review saw, in numbers. Safe to log: no model text, no secrets. */
export interface ReportCounts {
  readonly formats: number
  readonly hooks: number
  readonly topics: number
  readonly lengths: number
  readonly postingPatterns: number
  /** How many example rows the model offered, before any were dropped. */
  readonly examplesOffered: number
  /** How many survived `parseExample` — a link we can store and show. */
  readonly examplesKept: number
  readonly examplesDropped: number
  readonly sources: number
  /** How many individual fields read as placeholder text. */
  readonly placeholderFields: number
}

export type ReportRejection =
  | { readonly rule: 'not-an-object' }
  | { readonly rule: 'placeholder-text'; readonly patterns: readonly string[] }
  | { readonly rule: 'nothing-substantive' }

export type ReportReview =
  | {
      readonly status: 'ok'
      readonly report: ParsedReport
      /** One honest line when the evidence is thin, otherwise `null`. */
      readonly caveat: string | null
      readonly counts: ReportCounts
    }
  | {
      readonly status: 'rejected'
      readonly rejection: ReportRejection
      readonly counts: ReportCounts
    }

const EMPTY_COUNTS: ReportCounts = {
  formats: 0,
  hooks: 0,
  topics: 0,
  lengths: 0,
  postingPatterns: 0,
  examplesOffered: 0,
  examplesKept: 0,
  examplesDropped: 0,
  sources: 0,
  placeholderFields: 0,
}

/**
 * The line a client reads when the open web held few public posts.
 *
 * Said once, at the top, rather than as a badge on every row — D121's lesson
 * that a caveat repeated twenty times trains the reader to skip it.
 */
export const THIN_EVIDENCE_CAVEAT =
  'We found no public post examples we could link to for this niche, so everything below comes from published guidance rather than from posts we measured. It is a starting point, not evidence.'

/**
 * The caveat for a report holding this many linkable examples.
 *
 * **Derived rather than stored, deliberately.** A report is persisted into
 * separate columns (`top_formats`, `top_hooks`, … and a `trends` row per
 * example) rather than one `findings` blob, so a caveat field would need a
 * migration to survive a round trip — and it would then be a second copy of a
 * fact the row already states by having no examples under it.
 *
 * One function, called by the writer and by the reader, so the sentence on a
 * fresh report and the sentence on a re-read one cannot drift apart. The
 * reader's count comes from `trends` rows that still parse today, which means
 * a report whose examples have all become unreadable says the honest thing:
 * we have no linkable evidence to show you.
 */
export function evidenceCaveatFor(exampleCount: number): string | null {
  return exampleCount === 0 ? THIN_EVIDENCE_CAVEAT : null
}

/** Every claim re-tagged as guidance. */
function asGuidance(claims: readonly Claim[]): readonly Claim[] {
  return claims.map((claim) =>
    claim.basis === 'guidance' ? claim : { ...claim, basis: 'guidance' as const },
  )
}

/**
 * Review whatever the model returned: a report, or a named reason it is not.
 *
 * Replaces a function that returned `ParsedReport | null`. That boolean was
 * the first bug in the first live production failure — 829 seconds and 41
 * searches produced "The scan did not come back with a usable report", which
 * cannot distinguish a thin niche from a placeholder reply from a bad schema
 * field. Every path out of here now carries a rule name and a set of counts,
 * and both are safe to print: counts are integers and the pattern names are
 * ours.
 *
 * ## Three rules, in order
 *
 * 1. **Not an object.** Nothing to read.
 * 2. **Placeholder text.** The failure the D123 addendum was written for: a
 *    format named `placeholder`, every field a well-formed string, no research
 *    anywhere. Rejected whatever else is present.
 * 3. **Nothing substantive.** No formats, no usable examples, and almost
 *    nothing else. An empty answer rather than a wrong one.
 *
 * ## What is deliberately no longer a rule
 *
 * **"No examples" was an automatic rejection and is not any more.** The D123
 * addendum made it one after a placeholder report slipped through, and it
 * caught the wrong thing as well as the right one: a real niche whose
 * practitioners post little that is publicly indexable would fail outright,
 * with nothing shown and nothing explained. Thin web visibility is a finding
 * about the niche, not a failure of the scan.
 *
 * So a thin report ships, with `THIN_EVIDENCE_CAVEAT` and with **every claim
 * re-tagged `guidance`** — a `posts` tag on a report containing no posts is a
 * claim about measurement we did not do (D121). Placeholder detection now
 * carries the weight the examples rule was carrying, which is the right place
 * for it: it tests whether the model answered, not whether the web is rich.
 */
export function reviewReport(value: unknown): ReportReview {
  if (typeof value !== 'object' || value === null) {
    return { status: 'rejected', rejection: { rule: 'not-an-object' }, counts: EMPTY_COUNTS }
  }
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

  const topHooks = parseClaims(root.topHooks ?? root.top_hooks, 10)
  const topics = parseClaims(root.topics, 12)
  const postingPatterns = parseClaims(root.postingPatterns ?? root.posting_patterns, 8)
  const sourcesUsed = parseSources(root.sourcesUsed ?? root.sources_used)

  // Every field a human would read, flattened once, so the placeholder check
  // and the substance check look at the same thing.
  const writtenFields: readonly unknown[] = [
    ...topFormats.flatMap((format) => [
      format.name,
      format.whyItWorks,
      format.fitReason,
      ...format.beats,
    ]),
    ...[...topHooks, ...topics, ...postingPatterns].map((claim) => claim.text),
    ...lengths.map((length) => length.note),
    ...examples.map((example) => example.whyItWorks),
  ]

  const matched = writtenFields.map(placeholderIn).filter((name): name is string => name !== null)

  const counts: ReportCounts = {
    formats: topFormats.length,
    hooks: topHooks.length,
    topics: topics.length,
    lengths: lengths.length,
    postingPatterns: postingPatterns.length,
    examplesOffered: rawExamples.length,
    examplesKept: examples.length,
    examplesDropped: droppedExamples.length,
    sources: sourcesUsed.length,
    placeholderFields: matched.length,
  }

  if (matched.length > 0) {
    return {
      status: 'rejected',
      rejection: { rule: 'placeholder-text', patterns: [...new Set(matched)] },
      counts,
    }
  }

  // Substance is "did the research produce anything at all", not "is it
  // complete". A report missing its posting patterns is still a report.
  const substance =
    counts.formats +
    counts.hooks +
    counts.topics +
    counts.lengths +
    counts.sources +
    counts.examplesKept

  if (counts.formats === 0 && counts.examplesKept === 0 && substance < 4) {
    return { status: 'rejected', rejection: { rule: 'nothing-substantive' }, counts }
  }

  const thin = examples.length === 0
  const caveat = evidenceCaveatFor(examples.length)

  return {
    status: 'ok',
    caveat,
    counts,
    report: {
      droppedExamples,
      findings: {
        topFormats,
        topHooks: thin ? asGuidance(topHooks) : topHooks,
        topics: thin ? asGuidance(topics) : topics,
        lengths: thin
          ? lengths.map((length) => ({ ...length, basis: 'guidance' as const }))
          : lengths,
        postingPatterns: thin ? asGuidance(postingPatterns) : postingPatterns,
        examples,
        sourcesUsed,
        evidenceCaveat: caveat,
        // The scan never writes these: the script agent does, after the report
        // exists and from what is in it. Parsed here so a stored report round-
        // trips through the same function that validated it.
        firstVideos: parseVideoIdeas(root.firstVideos ?? root.first_videos),
      },
    },
  }
}

/** Every source that can be shown, deduplicated by url, capped at 12. */
export function parseSources(value: unknown): readonly ReportSource[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const sources: ReportSource[] = []

  for (const entry of value) {
    const source = parseSource(entry)
    if (!source || seen.has(source.url)) continue
    seen.add(source.url)
    sources.push(source)
    if (sources.length === 12) break
  }

  return sources
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

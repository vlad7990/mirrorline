/**
 * The Niche Scan's read — as the signed-in user, so RLS decides the rows (V1).
 *
 * Same shape and same reasoning as `read-results.ts` (B2.4):
 *
 * - **No workspace id.** `niche_reports_select_members` scopes the rows, so
 *   there is nothing to pass and nothing to get wrong.
 * - **Null is "could not read", empty is "no scan yet".** They render
 *   differently and the difference matters: an error returning "no report"
 *   would tell the client we researched their niche and found nothing, which
 *   is a statement about their niche rather than about our request.
 * - **No fixture fallback.** D110's trap. The screen is handed either a real
 *   report, or the labelled sample, or an honest nothing — and which of the
 *   three it got is explicit rather than inferred from an empty array.
 */

import type { Trend } from '@mirrorline/mock'

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import {
  parseExample,
  type FormatFinding,
  type LengthFinding,
  type NicheReportFindings,
  type TrendExample,
} from '../niche-scan/report'
import { toTrendCards, type TrendRow } from './trend-rows'

/**
 * How many `trends` rows one read pulls.
 *
 * The same rows feed both halves of the screen — the report's examples and
 * the format cards below it — so they are fetched once and shaped twice. Two
 * queries over the same rows is how the two halves start disagreeing about
 * what the scan found.
 *
 * 30 matches `parseReport`'s own cap on examples, so a scan cannot produce
 * rows this read would silently hide.
 */
const TREND_LIMIT = 30

export interface StoredNicheReport {
  readonly id: string
  readonly niche: string
  readonly status: 'running' | 'complete' | 'failed'
  readonly createdAt: string
  readonly completedAt: string | null
  readonly error: string | null
  readonly findings: NicheReportFindings
}

/** jsonb comes back as `unknown`; each column is parsed, never cast. */
function asFormatList(value: unknown): readonly FormatFinding[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is FormatFinding =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as FormatFinding).name === 'string',
  )
}

function asStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function asLengthList(value: unknown): readonly LengthFinding[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is LengthFinding =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as LengthFinding).seconds === 'number',
  )
}

interface ReportRow {
  readonly id: string
  readonly niche: string
  readonly status: string
  readonly created_at: string
  readonly completed_at: string | null
  readonly error: string | null
  readonly top_formats: unknown
  readonly top_hooks: unknown
  readonly topics: unknown
  readonly lengths: unknown
  readonly posting_patterns: unknown
  readonly sources_used: unknown
}

const STATUSES = ['running', 'complete', 'failed'] as const

/**
 * The outcome of a read.
 *
 * `null` from the function means the read failed. A resolved result holding
 * `report: null` means "no scan yet" — so the caller distinguishes the two
 * without a sentinel value.
 */
export interface NicheReportResult {
  readonly report: StoredNicheReport | null
  /**
   * The format cards below the report, from the same rows.
   *
   * Empty when there has been no scan — **never a fixture**. `/app/trends`
   * drew `@mirrorline/mock`'s eight trends to every workspace until V1, and
   * putting a labelled sample report above unlabelled invented cards made the
   * cards read as real. D110, one screen along.
   */
  readonly cards: readonly Trend[]
}

export async function readLatestNicheReport(): Promise<NicheReportResult | null> {
  const supabase = await createSupabaseServerClient()

  const reportResult = await supabase
    .from('niche_reports')
    .select(
      'id, niche, status, created_at, completed_at, error, top_formats, top_hooks, topics, lengths, posting_patterns, sources_used',
    )
    .order('created_at', { ascending: false })
    .limit(1)

  if (reportResult.error) {
    console.error('[niche-scan] could not read the report', reportResult.error.message)
    return null
  }

  const row = (reportResult.data ?? [])[0] as ReportRow | undefined
  if (!row) return { report: null, cards: [] }

  const trendsResult = await supabase
    .from('trends')
    .select(
      'id, url, platform, format, from_niche, growth_percent, fit, beats, hook_type, length_seconds, views, views_per_follower, account_size_bucket, posted_at, why_it_works, source_note',
    )
    .eq('report_id', row.id)
    .limit(TREND_LIMIT)

  if (trendsResult.error) {
    console.error('[niche-scan] could not read the examples', trendsResult.error.message)
    return null
  }

  const trendRows = (trendsResult.data ?? []) as readonly Record<string, unknown>[]

  // Reused rather than reimplemented: the same parser the agent writes
  // through, so a row that would not have been accepted is not displayed
  // either. `format` is the column name; the parser calls it `formatName`.
  const examples = trendRows
    .map((stored) => parseExample({ ...stored, formatName: stored.format }).example)
    .filter((entry): entry is TrendExample => entry !== null)

  // The cards, from the same rows. `row.niche` is what was scanned, which is
  // the workspace's own niche — the comparison the "My niche" filter needs.
  const cards = toTrendCards(trendRows as unknown as readonly TrendRow[], row.niche)

  const status = STATUSES.find((entry) => entry === row.status) ?? 'failed'

  return {
    cards,
    report: {
      id: row.id,
      niche: row.niche,
      status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      error: row.error,
      findings: {
        topFormats: asFormatList(row.top_formats),
        topHooks: asStringList(row.top_hooks),
        topics: asStringList(row.topics),
        lengths: asLengthList(row.lengths),
        postingPatterns: asStringList(row.posting_patterns),
        sourcesUsed: asStringList(row.sources_used),
        examples,
      },
    },
  }
}

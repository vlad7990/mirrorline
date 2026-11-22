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

import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import {
  parseExample,
  type FormatFinding,
  type LengthFinding,
  type NicheReportFindings,
  type TrendExample,
} from '../niche-scan/report'

/** How many examples the panel shows. The rest stay in the row table. */
const EXAMPLE_LIMIT = 12

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
  if (!row) return { report: null }

  const examplesResult = await supabase
    .from('trends')
    .select(
      'url, platform, format, hook_type, length_seconds, views, views_per_follower, account_size_bucket, posted_at, why_it_works, source_note',
    )
    .eq('report_id', row.id)
    .limit(EXAMPLE_LIMIT)

  if (examplesResult.error) {
    console.error('[niche-scan] could not read the examples', examplesResult.error.message)
    return null
  }

  // Reused rather than reimplemented: the same parser the agent writes
  // through, so a row that would not have been accepted is not displayed
  // either. `format` is the column name; the parser calls it `formatName`.
  const examples = (examplesResult.data ?? [])
    .map((entry) => {
      const stored = entry as Record<string, unknown>
      return parseExample({ ...stored, formatName: stored.format }).example
    })
    .filter((entry): entry is TrendExample => entry !== null)

  const status = STATUSES.find((entry) => entry === row.status) ?? 'failed'

  return {
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

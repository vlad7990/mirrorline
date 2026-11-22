/**
 * `ledger_weekly` and `alerts` rows → what the Results screens render (B2.4).
 *
 * ============================================================================
 * The ledger is counts, and a count is allowed to be zero
 * ============================================================================
 *
 * This is the one place in B2 where **zero is an honest answer**, and it is
 * worth stating because B2.1 and B2.3 spent their whole effort on the opposite
 * rule.
 *
 * A KPI is a *measurement*: nothing has measured one until B6 ingests, so a
 * `0` would claim we looked. A ledger row is a *tally of what we did* — posts
 * we published, leads that arrived — and the pipeline writes one when a week
 * happens. A week with no posts genuinely had none.
 *
 * So the absence lives one level up: **a workspace with no ledger rows has no
 * weeks**, and the board says so rather than drawing a table of zeroes.
 * `sales_usd` keeps its own nullability for the reason the column has it — an
 * account selling nothing through a tracked link has no figure, which is not
 * the same as having sold nothing.
 *
 * ============================================================================
 * The alert's title is ours; its message is the pipeline's
 * ============================================================================
 *
 * `KpiAlert` wants a `title` and a `message`. The table has only `message`,
 * written by whatever raised the alert.
 *
 * The title is therefore **derived** from the two things we do hold — the kind
 * and the KPI definition — exactly as `social-accounts.ts` derives
 * `platformLabel` and `statusLabel`: wording for a value we have, never a
 * claim we do not. The alternative was a `title` column, which would be a
 * second thing for a metrics job to fill and a second thing to get wrong, for
 * copy that is the same every time.
 *
 * ============================================================================
 * Dates are formatted here, and never parsed again
 * ============================================================================
 *
 * Both display dates are built from the stored `YYYY-MM-DD` **by splitting the
 * string, with the month names written out** — not through `Date` and not
 * through `toLocaleDateString`. A locale-aware formatter makes the rendered
 * string depend on the machine, and `new Date('2026-10-20')` read back in a
 * negative timezone is the 19th, which is how a ledger week silently shifts by
 * a day between a laptop and a runner.
 */

import { KPI_DEFINITIONS, type LedgerWeek } from '@/components/kpi/sample-dashboard'
import { type KpiAlert } from '@/lib/studio/insights'

/** One row of `public.ledger_weekly`, as PostgREST returns it. */
export interface LedgerWeeklyRow {
  /** The Monday the week starts on, `YYYY-MM-DD`. */
  readonly week: string
  readonly posts: number
  readonly views: number
  readonly sends: number
  readonly saves: number
  readonly follows: number
  readonly leads: number
  readonly bookings: number
  /** Null when nothing is sold through a tracked link. Not a zero. */
  readonly sales_usd: number | null
}

/** One row of `public.alerts`, as PostgREST returns it. */
export interface AlertRow {
  readonly id: string
  readonly kpi_key: string
  readonly status: string
  readonly message: string
  readonly kind: string
  /** `trend` only — the CHECK constraint guarantees the pairing. */
  readonly weeks_off_track: number | null
  /** `connection` only, `YYYY-MM-DD`. */
  readonly broken_since: string | null
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * `2026-10-20` → `20 Oct` or `20 October`, and null if it is not a date.
 *
 * Split on the string rather than constructed through `Date`, so no timezone
 * is involved at all. Null rather than a throw: one malformed row should cost
 * its own cell, not the screen.
 */
function formatStoredDate(stored: string, months: readonly string[]): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stored)
  if (match === null) return null

  const month = months[Number(match[2]) - 1]
  if (month === undefined) return null

  // `Number` drops the leading zero, which is what the designs show: "6 Nov",
  // not "06 Nov".
  return `${Number(match[3])} ${month}`
}

export function toLedgerWeeks(rows: readonly LedgerWeeklyRow[]): readonly LedgerWeek[] {
  return rows.map((row) => ({
    // A week whose date does not parse still shows its counts, and shows the
    // stored value as-is: "20261020" on screen is a bug report, and a blank
    // cell is a mystery.
    week: formatStoredDate(row.week, MONTHS_SHORT) ?? row.week,
    posts: row.posts,
    views: row.views,
    sends: row.sends,
    saves: row.saves,
    follows: row.follows,
    leads: row.leads,
    bookings: row.bookings,
  }))
}

/**
 * The KPI's own name, or the raw key when this build does not know it.
 *
 * Falling back to the key rather than to something friendly-sounding: a title
 * reading "leads behind pace" is ugly and obviously ours, where a title
 * reading "This metric is behind pace" hides which metric it meant.
 */
function kpiName(kpiKey: string): string {
  return KPI_DEFINITIONS.find((definition) => definition.key === kpiKey)?.name ?? kpiKey
}

/**
 * A title, from the two things the row actually holds.
 *
 * Deliberately says nothing a reader could mistake for a measurement. The
 * trend title names the KPI and the week count the row carries; the connection
 * title names neither a platform nor a date, because the row has no platform
 * and the date already has a home in `since`.
 */
function titleFor(kind: 'trend' | 'connection', kpiKey: string, weeks: number): string {
  if (kind === 'connection') return 'Posting has stopped'

  return `${kpiName(kpiKey)} behind pace for ${weeks} weeks`
}

/**
 * Rows → the discriminated union the screens render.
 *
 * **A row that does not satisfy its kind is dropped, not repaired.** The
 * `alerts_timing_matches_kind` constraint makes that unreachable from the
 * database, so a row arriving here without its `weeks_off_track` or its
 * `broken_since` means something wrote past the constraint — and the union
 * exists precisely so a connection alert cannot carry a week count for
 * somebody to gate on. Inventing the missing half would defeat both.
 */
export function toKpiAlerts(rows: readonly AlertRow[]): readonly KpiAlert[] {
  return rows.flatMap((row): KpiAlert[] => {
    if (row.kind === 'trend') {
      const weeks = row.weeks_off_track
      if (weeks === null) return []

      return [
        {
          kind: 'trend',
          id: row.id,
          kpiKey: row.kpi_key,
          title: titleFor('trend', row.kpi_key, weeks),
          message: row.message,
          weeksOffTrack: weeks,
        },
      ]
    }

    if (row.kind === 'connection') {
      const since = row.broken_since
      if (since === null) return []

      return [
        {
          kind: 'connection',
          id: row.id,
          kpiKey: row.kpi_key,
          title: titleFor('connection', row.kpi_key, 0),
          message: row.message,
          since: formatStoredDate(since, MONTHS_LONG) ?? since,
        },
      ]
    }

    // A kind this build does not know: dropped rather than guessed at. The
    // column has a CHECK constraint, so this is the case where a newer
    // migration ran against older code.
    return []
  })
}

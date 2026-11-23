/**
 * `trends` rows → the cards the Niche Scan screen draws (V1).
 *
 * The same job `results-rows.ts` does for the Ledger (B2.4), and the last
 * screen in the studio still drawing fixtures. Until now `/app/trends`
 * rendered `@mirrorline/mock`'s eight trends to every workspace — including
 * one that had never been scanned.
 *
 * ## Why this was worse than the other fixture screens
 *
 * B2.3 and B2.4 removed demo rows from Accounts, the Ledger and the alert
 * bar. The trend cards were missed, and V1's report panel landing above them
 * made the gap *actively misleading* rather than merely stale: a report
 * carrying a visible "Sample data" label, sitting directly on top of eight
 * cards carrying none, says plainly that the cards are real. An honest label
 * beside an unlabelled claim is worse than no label at all.
 *
 * So there is no fallback here and none upstream. A workspace with no scan
 * gets the empty state, which is D110's rule — the Accounts board learned the
 * same thing a day earlier.
 *
 * ## `isFromMyNiche` needs the workspace, and that is the whole filter
 *
 * The "My niche / Nearby niches / All" control is built on it. A row's
 * `from_niche` is compared with the workspace's own niche, case-insensitively
 * and trimmed, because one is typed by a person at onboarding and the other
 * is written by an agent — "Independent coffee roasters" and "independent
 * coffee roasters" are the same niche and must not split the filter.
 */

import type { Platform, Trend, TrendBeat } from '@mirrorline/mock'

/** The columns the card needs. A subset of `trends`, named as Postgres has them. */
export interface TrendRow {
  readonly id: string
  readonly format: string | null
  readonly from_niche: string | null
  readonly platform: string | null
  readonly growth_percent: number | string | null
  readonly fit: number | string | null
  readonly views_per_follower: number | string | null
  readonly beats: unknown
  readonly why_it_works: string | null
}

const PLATFORMS: readonly Platform[] = ['instagram', 'tiktok', 'youtube', 'linkedin']

/** `numeric` arrives as a string from PostgREST, so nothing is trusted to be a number. */
function toNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * The growth figure as the card prints it.
 *
 * A sign is always shown, because "340%" and "+340%" read as different
 * claims — the first could be an absolute share. A row with no growth figure
 * says so rather than printing `+0%`, which would be a measurement we never
 * took. Same rule as the Ledger's "Not measured yet" (B2.4, 15 §8).
 */
export function growthLabel(percent: number | null): string {
  if (percent === null) return 'Not measured yet'
  const rounded = Math.round(percent)
  return `${rounded >= 0 ? '+' : ''}${rounded}%`
}

/**
 * The anonymised storyboard.
 *
 * Stored as jsonb and written by an agent, so both shapes a model plausibly
 * produces are accepted: a list of strings, or a list of `{order, label}`.
 * Anything else is dropped rather than rendered as `[object Object]`.
 */
export function toBeats(value: unknown): readonly TrendBeat[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry, index): TrendBeat | null => {
      if (typeof entry === 'string') {
        const label = entry.trim()
        return label ? { order: index + 1, label } : null
      }
      if (typeof entry === 'object' && entry !== null) {
        const row = entry as { label?: unknown; order?: unknown }
        const label = typeof row.label === 'string' ? row.label.trim() : ''
        if (!label) return null
        const order = typeof row.order === 'number' ? row.order : index + 1
        return { order, label }
      }
      return null
    })
    .filter((beat): beat is TrendBeat => beat !== null)
}

function sameNiche(left: string | null, right: string | null): boolean {
  if (!left || !right) return false
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

/**
 * One row to one card, or `null` when the row cannot be drawn.
 *
 * A row with no format name or no platform is not a card — it is a row we
 * would render as a blank tile, which looks like a bug to the client and like
 * data to us.
 */
export function toTrendCard(row: TrendRow, workspaceNiche: string | null): Trend | null {
  const format = row.format?.trim()
  const platform = PLATFORMS.find((entry) => entry === row.platform?.trim().toLowerCase())
  if (!format || !platform) return null

  const growthPercent = toNumber(row.growth_percent)

  return {
    id: row.id,
    format,
    fromNiche: row.from_niche?.trim() ?? '',
    // The card's numeric field is not nullable, so the display string carries
    // the "we did not measure this" case and the number stays 0 behind it.
    growthPercent: growthPercent ?? 0,
    growthLabel: growthLabel(growthPercent),
    fit: Math.round(toNumber(row.fit) ?? 0),
    // No `?? 0`. The column is nullable because the scan is told to omit a
    // figure it cannot verify, and zero is not a way of writing "unknown" — it
    // is the claim that this format earns no views per follower, which is both
    // false and the most damning thing a card could say about a format we are
    // recommending. The card renders the absence instead.
    viewsPerFollower: toNumber(row.views_per_follower),
    beats: toBeats(row.beats),
    whyItWorks: row.why_it_works?.trim() ?? '',
    platform,
    isFromMyNiche: sameNiche(row.from_niche, workspaceNiche),
  }
}

/** Every row that can be drawn, in the order given. Immutable. */
export function toTrendCards(
  rows: readonly TrendRow[],
  workspaceNiche: string | null,
): readonly Trend[] {
  return rows
    .map((row) => toTrendCard(row, workspaceNiche))
    .filter((card): card is Trend => card !== null)
}

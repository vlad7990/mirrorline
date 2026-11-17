/**
 * The KPI model from 15 §3, §7 and §8.
 *
 * No React here: this is read by the marketing pages, by the studio, by the
 * tests, and eventually by the Supabase seed in `kpi_definitions`. The shape
 * deliberately matches 15 §7's column list, so the seed is a transcription
 * rather than a translation.
 *
 * **The honesty rules are in the types, not only in the prose.** A KPI value
 * is a union: measured, not connected, or a labelled projection. There is no
 * fourth case and in particular there is no "zero" — 15 §8 is explicit that a
 * missing source shows "Not connected" with a connect button and never a
 * zero, because a zero is a claim about a number nobody measured. Making that
 * a type rather than a convention means a card cannot render the wrong thing
 * by forgetting a check.
 */

/** 15 §3. The same seven tiers for every account, whatever its goal. */
export type KpiTier =
  | 'production'
  | 'content-health'
  | 'growth'
  | 'outcome'
  | 'return'
  | 'quality'
  | 'agent-ops'

export interface KpiTierMeta {
  readonly key: KpiTier
  readonly number: number
  readonly name: string
  /** Where the numbers come from. Shown on the card, per 15 §3. */
  readonly source: string
}

export const KPI_TIERS: readonly KpiTierMeta[] = [
  { key: 'production', number: 1, name: 'Production', source: 'Our system' },
  {
    key: 'content-health',
    number: 2,
    name: 'Content health',
    source: 'Platform insights APIs',
  },
  { key: 'growth', number: 3, name: 'Growth', source: 'Platform insights APIs' },
  {
    key: 'outcome',
    number: 4,
    name: 'Outcome',
    source: 'Tracked links, DM keywords, booking and commerce connectors',
  },
  { key: 'return', number: 5, name: 'Return', source: 'Calculated' },
  { key: 'quality', number: 6, name: 'Quality and safety', source: 'Compliance agent' },
  { key: 'agent-ops', number: 7, name: 'Agent operations', source: 'Job queue' },
]

/** How a figure is written. Decides formatting, never meaning. */
export type KpiUnit = 'count' | 'percent' | 'currency' | 'ratio' | 'days' | 'seconds'

/** 15 §7 `kpi_definitions`. */
export interface KpiDefinition {
  readonly key: string
  readonly name: string
  readonly unit: KpiUnit
  /** Plain words, not algebra. It appears in a tooltip a user reads. */
  readonly formula: string
  readonly source: string
  readonly tier: KpiTier
  /** True for a KPI the user added themselves (15 §4). */
  readonly isCustom?: boolean
}

/**
 * What a KPI is showing right now.
 *
 * `not-connected` carries the name of what has to be connected, so the card
 * can offer a specific button rather than a generic one.
 */
export type KpiValue =
  | {
      readonly state: 'measured'
      readonly value: number
      /** Oldest first. Two or more points, or the sparkline is omitted. */
      readonly series?: readonly number[]
      /** Change against the previous period, as a fraction. 0.18 = +18%. */
      readonly change?: number
      /** ISO-8601 UTC. Rendered as "updated 2h ago" (15 §8). */
      readonly capturedAt: string
    }
  | {
      readonly state: 'not-connected'
      /** "Instagram", "your booking tool". Named so the button can be specific. */
      readonly missingSource: string
    }
  | {
      /** 15 §8: projections are dashed and labelled, never shown as actuals. */
      readonly state: 'projected'
      readonly value: number
      readonly series?: readonly number[]
      /** What the projection is based on, in one phrase. */
      readonly basis: string
    }

/** A target is a proposal. 15 §1: the UI says "target", never "guaranteed". */
export interface KpiTarget {
  readonly value: number
  /** Where the number came from, e.g. "14-day baseline + niche benchmarks". */
  readonly basis: string
}

export interface Kpi {
  readonly definition: KpiDefinition
  readonly value: KpiValue
  readonly target?: KpiTarget
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

function roundTo(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/** Tabular figures come from `.machine`; this is only the text. */
export function formatKpiValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case 'percent':
      return `${roundTo(value, 1)}%`
    case 'currency':
      return `$${Math.round(value).toLocaleString('en-US')}`
    case 'ratio':
      return `${roundTo(value, 1)}×`
    case 'days':
      return `${roundTo(value, 1)} ${value === 1 ? 'day' : 'days'}`
    case 'seconds':
      return `${roundTo(value, 1)}s`
    case 'count':
    default:
      return Math.round(value).toLocaleString('en-US')
  }
}

/** "+18%" / "−4%". A fragment of a sentence, never a bare arrow (DESIGN.md). */
export function formatChange(change: number): string {
  const percent = roundTo(change * 100, 1)
  // A true minus sign, not a hyphen: this sits in tabular figures beside a
  // number, and a hyphen is narrower and sits at the wrong height.
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : ''
  return `${sign}${Math.abs(percent)}%`
}

/**
 * Which way is good.
 *
 * Not every KPI improves by going up — "days to first 1,000 followers" and
 * "cost per lead" are better lower, and colouring their fall red would tell
 * the user they are losing while they are winning.
 */
export type GoodDirection = 'up' | 'down'

export function changeTone(change: number, goodDirection: GoodDirection): 'up' | 'down' | 'flat' {
  if (Math.abs(change) < 0.005) return 'flat'
  const isGood = goodDirection === 'up' ? change > 0 : change < 0
  return isGood ? 'up' : 'down'
}

/**
 * "updated 2h ago", from an ISO timestamp (15 §8).
 *
 * `now` is a parameter rather than a `Date.now()` call, so the output is
 * testable and so a server render and a client render of the same page cannot
 * disagree about the time and trip a hydration mismatch.
 */
export function formatFreshness(capturedAt: string, now: Date): string {
  const captured = new Date(capturedAt)
  if (Number.isNaN(captured.getTime())) return 'updated recently'

  const minutes = Math.max(0, Math.round((now.getTime() - captured.getTime()) / 60_000))
  if (minutes < 1) return 'updated just now'
  if (minutes < 60) return `updated ${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `updated ${hours}h ago`

  const days = Math.round(hours / 24)
  return `updated ${days}d ago`
}

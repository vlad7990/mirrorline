/**
 * Database rows → the cascade the Goals screen renders.
 *
 * ============================================================================
 * Why the mapping is pure, and separate from the read
 * ============================================================================
 *
 * Everything here is decidable from rows and a clock, so it is the part worth
 * testing exhaustively — the period arithmetic in particular, because it is
 * what decides whether somebody is told they are behind. The read that fetches
 * the rows is a few lines of PostgREST next door and has nothing to assert.
 *
 * ============================================================================
 * `current` is null until something has measured it
 * ============================================================================
 *
 * `metric_snapshots` stays empty until the ingestion in B6 runs, so for every
 * real workspace today there is no current value for any key result.
 *
 * The easy thing would be to default to `0`, or to the baseline. Both are
 * **inventions**: "0 of 40 leads" says we read the account and found nothing,
 * and the baseline says nothing has changed since. Neither is known. The type
 * is `number | null` so the screens have to render the absence, which they do
 * as "Not measured yet".
 */

import { type GoalKey } from '@/lib/audience/account-type'
import { type GoalCascade, type KeyResult, type Objective } from '@/lib/studio/cascade'

export interface GoalRow {
  readonly id: string
  readonly goal_type: string
  readonly outcome_text: string
  readonly period: string
  readonly created_at: string
}

export interface ObjectiveRow {
  readonly id: string
  readonly goal_id: string
  readonly text: string
  readonly position: number
}

export interface KeyResultRow {
  readonly id: string
  readonly objective_id: string
  readonly kpi_key: string
  readonly baseline: number
  readonly target: number
  readonly basis: string
  readonly due: string | null
}

export interface KpiDefinitionRow {
  readonly key: string
  readonly name: string
  readonly unit: string
}

export interface CascadeRows {
  readonly goal: GoalRow | null
  readonly objectives: readonly ObjectiveRow[]
  readonly keyResults: readonly KeyResultRow[]
  readonly kpiDefinitions: readonly KpiDefinitionRow[]
  /** Latest `metric_snapshots.value` per `kpi_key`. Absent means unmeasured. */
  readonly latestByKpi: Readonly<Record<string, number>>
}

const DAY_MS = 24 * 60 * 60 * 1000

/** A quarter is 91 days, matching the 13 weeks the product talks in. */
const QUARTER_DAYS = 91

/** Days in each period. Anything else falls back to a quarter. */
const PERIOD_DAYS: Readonly<Record<string, number>> = {
  month: 30,
  quarter: QUARTER_DAYS,
  year: 365,
}

/**
 * How far through the period we are, 0–1.
 *
 * **Clamped at both ends on purpose.** A goal whose quarter ended months ago
 * would otherwise report 3.0, and `keyResultPace` would call every key result
 * "behind" for the rest of time — a number that is wrong in a way that reads
 * as a judgement about the client's account. A clock disagreement in the other
 * direction would produce a negative, and "ahead of pace" before the period
 * starts is the same error wearing a compliment.
 */
export function periodElapsed(period: string, startedAt: Date, now: Date): number {
  const days = PERIOD_DAYS[period] ?? QUARTER_DAYS
  const elapsedDays = (now.getTime() - startedAt.getTime()) / DAY_MS

  return Math.max(0, Math.min(1, elapsedDays / days))
}

/** "this quarter", "this month". Rendered beside the figure. */
function periodLabel(period: string): string {
  return period in PERIOD_DAYS ? `this ${period}` : 'this quarter'
}

/**
 * The unit word shown after a figure.
 *
 * Taken from the KPI's own name rather than from `unit`, which is a storage
 * type (`count`, `percent`) and not something to print — "40 count" is not a
 * sentence. A count's unit is whatever the KPI counts, so the name carries it.
 */
function unitLabelFor(definition: KpiDefinitionRow | undefined): string {
  if (definition === undefined) return ''
  if (definition.unit === 'percent') return '%'
  if (definition.unit === 'days') return 'days'
  if (definition.unit === 'seconds') return 'seconds'

  // A count or a currency: the name says what is being counted ("Leads per
  // week"), so the figure reads correctly with no unit appended.
  return ''
}

/**
 * The largest target we will store. Not a database limit — `numeric` has no
 * practical one — but a typo guard: a target of 10 billion leads is a slipped
 * keypress, and storing it silently turns every future pace reading into
 * "behind" with no way for the user to see why.
 */
export const MAX_TARGET = 1_000_000_000

export type TargetParse =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly message: string }

/**
 * What a person may type into the target box.
 *
 * Negative is refused rather than clamped: somebody who typed `-40` meant
 * something, and quietly storing `0` would answer a question they did not ask.
 */
export function parseTargetInput(raw: unknown): TargetParse {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (text.length === 0) return { ok: false, message: 'Enter a target.' }

  const value = Number(text)
  if (!Number.isFinite(value)) return { ok: false, message: 'A target has to be a number.' }
  if (value < 0) return { ok: false, message: 'A target cannot be negative.' }
  if (value > MAX_TARGET) {
    return { ok: false, message: 'That target looks like a typo. Enter a smaller number.' }
  }

  return { ok: true, value }
}

export function buildGoalCascade(rows: CascadeRows, now: Date): GoalCascade | null {
  const { goal } = rows

  // No goal means onboarding has not finished. A real state, and the screen's
  // empty state is the right answer rather than an empty cascade pretending
  // to be a complete one.
  if (goal === null) return null

  const definitionsByKey = new Map(rows.kpiDefinitions.map((d) => [d.key, d]))

  const keyResultsByObjective = new Map<string, KeyResult[]>()
  for (const row of rows.keyResults) {
    const definition = definitionsByKey.get(row.kpi_key)

    const keyResult: KeyResult = {
      id: row.id,
      kpiKey: row.kpi_key,
      // The raw key when we hold no definition: ugly and true beats hiding a
      // key result somebody is being measured against.
      label: definition?.name ?? row.kpi_key,
      baseline: Number(row.baseline),
      target: Number(row.target),
      // See the note at the top. Absent means unmeasured, never zero.
      current: row.kpi_key in rows.latestByKpi ? Number(rows.latestByKpi[row.kpi_key]) : null,
      unitLabel: unitLabelFor(definition),
      basis: row.basis,
      due: row.due ?? 'end of period',
    }

    const existing = keyResultsByObjective.get(row.objective_id) ?? []
    keyResultsByObjective.set(row.objective_id, [...existing, keyResult])
  }

  const objectives: readonly Objective[] = [...rows.objectives]
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      text: row.text,
      keyResults: keyResultsByObjective.get(row.id) ?? [],
    }))

  return {
    goalKey: goal.goal_type as GoalKey,
    outcome: goal.outcome_text,
    periodLabel: periodLabel(goal.period),
    periodElapsed: periodElapsed(goal.period, new Date(goal.created_at), now),
    objectives,
    // 15 §1's last row is the Performance Analyst's asks. Nothing writes them
    // yet, so the screen shows none rather than repeating the demo's.
    weeklyActions: [],
  }
}

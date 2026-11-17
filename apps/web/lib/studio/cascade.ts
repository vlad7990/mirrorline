/**
 * The goal cascade from 15 §1: outcome → objectives → key results → KPIs →
 * weekly actions.
 *
 * This is the studio's own sample workspace, not the public site's. It shares
 * `components/kpi/sample-dashboard.ts` for every figure it can, because the
 * marketing preview and the studio are supposed to be showing the same
 * dashboard and two copies of the numbers would drift.
 *
 * **Everything here is invented** and belongs to the fictional demo account in
 * `08_MOCK_DATA.md`. Non-negotiable 7 wants that on the screen, so every
 * surface rendering it draws a `SampleDataLabel`.
 *
 * No React: this is read by server components, by the tests, and eventually by
 * the Supabase seed, whose column lists are 15 §7's.
 */

import { type GoalKey } from '@/lib/audience/account-type'

/**
 * 15 §1: a key result proposed after a 14-day baseline and the Niche Scan
 * benchmarks, then approved by the user.
 *
 * `basis` is not optional. A target with no stated origin reads as a promise,
 * and 15 §1 is explicit that targets are proposals — the UI says "target",
 * never "guaranteed".
 */
export interface KeyResult {
  readonly id: string
  /** Which KPI this key result is measured in. Matches a `KpiDefinition.key`. */
  readonly kpiKey: string
  readonly label: string
  /** Where the account stood when the baseline closed. */
  readonly baseline: number
  readonly target: number
  readonly current: number
  readonly unitLabel: string
  /** "14-day baseline + niche benchmarks". Shown beside the number. */
  readonly basis: string
  /** "31 December", "end of quarter". */
  readonly due: string
}

export interface Objective {
  readonly id: string
  readonly text: string
  readonly keyResults: readonly KeyResult[]
}

export interface GoalCascade {
  readonly goalKey: GoalKey
  /** The outcome in the user's own words (15 §1). */
  readonly outcome: string
  readonly periodLabel: string
  /** 0–1. Drives the pace note on the goal bar. */
  readonly periodElapsed: number
  /** Proposed by the Performance Analyst, edited by the user. */
  readonly objectives: readonly Objective[]
  /** 15 §1's last row: what the Analyst is asking the other agents to change. */
  readonly weeklyActions: readonly string[]
}

/** Six weeks into a thirteen-week quarter, matching `SAMPLE_GOAL`. */
const PERIOD_ELAPSED = 6 / 13

export const SAMPLE_CASCADE: GoalCascade = {
  goalKey: 'leads',
  outcome: 'Get more customers from short video',
  periodLabel: 'this quarter',
  periodElapsed: PERIOD_ELAPSED,
  objectives: [
    {
      id: 'objective-reach',
      text: 'Grow reach with the right people',
      keyResults: [
        {
          id: 'kr-followers',
          kpiKey: 'net_followers',
          label: 'New followers',
          baseline: 1_240,
          target: 3_000,
          current: 1_870,
          unitLabel: 'followers',
          basis: '14-day baseline + niche benchmarks',
          due: 'end of quarter',
        },
        {
          id: 'kr-non-follower-reach',
          kpiKey: 'non_follower_reach',
          label: 'Non-follower reach',
          baseline: 48,
          target: 65,
          current: 61,
          unitLabel: '% of reach',
          basis: 'niche benchmark',
          due: 'end of quarter',
        },
      ],
    },
    {
      id: 'objective-enquiries',
      text: 'Turn viewers into enquiries',
      keyResults: [
        {
          id: 'kr-leads',
          kpiKey: 'leads',
          label: 'Leads',
          baseline: 3,
          target: 120,
          current: 52,
          unitLabel: 'leads',
          basis: '14-day baseline',
          due: 'end of quarter',
        },
        {
          id: 'kr-sends',
          kpiKey: 'sends_per_1k',
          label: 'Sends per 1,000 reach',
          baseline: 12,
          target: 25,
          current: 24,
          unitLabel: 'sends',
          basis: 'niche benchmark',
          due: 'end of quarter',
        },
      ],
    },
  ],
  weeklyActions: [
    'Double the “myth vs fact” format — it carries the highest sends per 1,000 reach.',
    'Test two new openings on the lowest-holding format before dropping it.',
    'Move the evening slot from 6pm to 7pm on the two accounts that allow scheduling.',
  ],
}

/**
 * How a key result is tracking, in words.
 *
 * A union rather than a string, so a caller cannot colour by substring.
 * "Behind" is not a failure state and is deliberately not red anywhere — it is
 * six weeks into a quarter.
 */
export type PaceState = 'ahead' | 'on-pace' | 'behind'

/**
 * Five percentage points rather than zero, so a key result that is
 * fractionally off does not flip state week to week and read as noise. Same
 * threshold as `GoalProgress`, for the same reason.
 */
const PACE_TOLERANCE = 0.05

export function keyResultPace(keyResult: KeyResult, periodElapsed: number): PaceState {
  const span = keyResult.target - keyResult.baseline
  // A key result asking for no movement is already met; dividing by it would
  // produce Infinity and paint the card "ahead" by accident.
  if (span === 0) return 'on-pace'

  const progress = (keyResult.current - keyResult.baseline) / span
  const elapsed = Math.max(0, Math.min(1, periodElapsed))
  const difference = progress - elapsed

  if (difference > PACE_TOLERANCE) return 'ahead'
  if (difference < -PACE_TOLERANCE) return 'behind'
  return 'on-pace'
}

export const PACE_LABELS: Readonly<Record<PaceState, string>> = {
  ahead: 'Ahead of pace',
  'on-pace': 'On pace',
  behind: 'Behind pace',
}

/* -------------------------------------------------------------------------- */
/* Custom KPIs (15 §4)                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 15 §4: "Users can add custom KPIs (name, unit, target, manual or CSV
 * entry)", e.g. phone calls, walk-ins, Google reviews.
 *
 * `entry` is part of the record rather than a setting elsewhere, because how a
 * number arrived decides what the card may claim about it: a figure typed in
 * by hand is the user's measurement, not ours, and the card says so.
 */
export type CustomKpiEntry = 'manual' | 'csv'

export interface CustomKpi {
  readonly key: string
  readonly name: string
  readonly unitLabel: string
  readonly entry: CustomKpiEntry
  readonly target: number
  /** Null until the user has entered or imported anything. Never a zero. */
  readonly current: number | null
  /** Human date of the last entry, or null. */
  readonly lastEntry: string | null
}

export const SAMPLE_CUSTOM_KPIS: readonly CustomKpi[] = [
  {
    key: 'custom_phone_calls',
    name: 'Phone calls',
    unitLabel: 'calls per week',
    entry: 'manual',
    target: 15,
    current: 11,
    lastEntry: '11 Nov',
  },
  {
    key: 'custom_reviews',
    name: 'New reviews',
    unitLabel: 'reviews per month',
    entry: 'csv',
    target: 8,
    current: 5,
    lastEntry: '9 Nov',
  },
  {
    // Added, never filled in. 15 §8: no zero for something nobody measured.
    key: 'custom_walk_ins',
    name: 'Walk-ins',
    unitLabel: 'visits per week',
    entry: 'manual',
    target: 20,
    current: null,
    lastEntry: null,
  },
]

export const CUSTOM_KPI_ENTRY_LABELS: Readonly<Record<CustomKpiEntry, string>> = {
  manual: 'Entered by hand',
  csv: 'Imported from CSV',
}

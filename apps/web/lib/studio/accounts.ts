/**
 * Per-connected-account metrics — 15 §4 ("every metric is stored per connected
 * social account and per post") and 15 §5 tab 4.
 *
 * The accounts themselves come from `@mirrorline/mock`, which already carries
 * the four the demo workspace has, their statuses, and the honest platform
 * notes (TikTok posts stay private until our app is audited). This module adds
 * only what the metrics layer needs on top, so there is still exactly one list
 * of accounts in the repo.
 *
 * **A not-connected account has no KPIs, not zeroed KPIs.** 15 §8 forbids
 * showing a zero for something nobody measured, and the per-account card is
 * the single easiest place in the product to get that wrong: four cards in a
 * row, three with numbers, and the fourth looking unfinished while empty. It
 * is not wrong empty. It is wrong full.
 */

import { type SocialAccount, accounts } from '@mirrorline/mock'

import { type Kpi, type KpiDefinition } from '@/components/kpi/kpi-types'
import { KPI_DEFINITIONS, SAMPLE_NOW } from '@/components/kpi/sample-dashboard'

const HOURS_AGO = (hours: number): string =>
  new Date(SAMPLE_NOW.getTime() - hours * 3_600_000).toISOString()

function definition(key: string): KpiDefinition {
  const found = KPI_DEFINITIONS.find((item) => item.key === key)
  // A missing key is a programming error, not a runtime condition. Throwing
  // turns it into a failing test rather than a card rendering "NaN".
  if (!found) throw new Error(`Unknown KPI definition: ${key}`)
  return found
}

export interface AccountMetrics {
  readonly account: SocialAccount
  /**
   * Empty when the account is not connected. The card renders the connect
   * prompt in that case rather than a row of dashes, because a dash still
   * occupies the place where a measurement would be.
   */
  readonly kpis: readonly Kpi[]
  /** This account's share of the workspace's leads, or null when unmeasured. */
  readonly leadShare: number | null
}

interface AccountFigures {
  readonly hold: number
  readonly holdSeries: readonly number[]
  readonly sends: number
  readonly sendsSeries: readonly number[]
  readonly followers: number
  readonly followersSeries: readonly number[]
  readonly leads: number
  readonly leadsSeries: readonly number[]
  readonly change: Readonly<{ hold: number; sends: number; followers: number; leads: number }>
}

/**
 * One account's KPI strip: hold, sends, follows, leads.
 *
 * Deliberately the same four keys for every account, so the cards compare
 * rather than each telling its own story.
 */
function accountKpis(values: AccountFigures): readonly Kpi[] {
  return [
    {
      definition: definition('three_second_hold'),
      value: {
        state: 'measured',
        value: values.hold,
        series: values.holdSeries,
        change: values.change.hold,
        capturedAt: HOURS_AGO(2),
      },
    },
    {
      definition: definition('sends_per_1k'),
      value: {
        state: 'measured',
        value: values.sends,
        series: values.sendsSeries,
        change: values.change.sends,
        capturedAt: HOURS_AGO(2),
      },
    },
    {
      definition: definition('net_followers'),
      value: {
        state: 'measured',
        value: values.followers,
        series: values.followersSeries,
        change: values.change.followers,
        capturedAt: HOURS_AGO(2),
      },
    },
    {
      definition: definition('leads'),
      value: {
        state: 'measured',
        value: values.leads,
        series: values.leadsSeries,
        change: values.change.leads,
        capturedAt: HOURS_AGO(2),
      },
    },
  ]
}

/**
 * The per-account figures, keyed by the mock account id.
 *
 * The three connected accounts' leads add up to the workspace's nine, and
 * their follower counts to its 318. A dashboard whose parts do not sum to its
 * whole teaches the reader not to trust either number.
 */
const BY_ACCOUNT_ID: Readonly<Record<string, readonly Kpi[]>> = {
  'account-instagram': accountKpis({
    hold: 51.4,
    holdSeries: [44, 46, 47, 49, 50, 51, 51.4],
    sends: 29,
    sendsSeries: [14, 17, 20, 21, 25, 27, 29],
    followers: 164,
    followersSeries: [62, 80, 96, 121, 134, 151, 164],
    leads: 5,
    leadsSeries: [2, 3, 4, 3, 4, 4, 5],
    change: { hold: 0.05, sends: 0.34, followers: 0.09, leads: 0.25 },
  }),
  'account-tiktok': accountKpis({
    hold: 46.8,
    holdSeries: [38, 40, 42, 43, 45, 46, 46.8],
    sends: 22,
    sendsSeries: [10, 12, 15, 15, 18, 20, 22],
    followers: 108,
    followersSeries: [41, 54, 63, 82, 90, 100, 108],
    leads: 3,
    leadsSeries: [1, 1, 2, 2, 3, 2, 3],
    change: { hold: 0.03, sends: 0.28, followers: 0.08, leads: 0.5 },
  }),
  'account-youtube': accountKpis({
    hold: 42.1,
    holdSeries: [36, 37, 38, 40, 41, 41, 42.1],
    sends: 14,
    sendsSeries: [6, 7, 9, 9, 11, 13, 14],
    followers: 46,
    followersSeries: [17, 26, 31, 37, 36, 44, 46],
    leads: 1,
    leadsSeries: [1, 1, 1, 1, 1, 1, 1],
    change: { hold: 0.02, sends: 0.21, followers: 0.05, leads: 0 },
  }),
}

/** This week's leads across the workspace, for the share column. */
export const WORKSPACE_LEADS = 9

export const ACCOUNT_METRICS: readonly AccountMetrics[] = accounts.map((account) => {
  const kpis = BY_ACCOUNT_ID[account.id] ?? []
  const leadsKpi = kpis.find((kpi) => kpi.definition.key === 'leads')
  const leads = leadsKpi?.value.state === 'measured' ? leadsKpi.value.value : null

  return {
    account,
    kpis,
    leadShare: leads === null ? null : leads / WORKSPACE_LEADS,
  }
})

/** Accounts we can actually measure. The rest get a connect prompt. */
export const CONNECTED_ACCOUNT_METRICS: readonly AccountMetrics[] = ACCOUNT_METRICS.filter(
  (entry) => entry.kpis.length > 0,
)

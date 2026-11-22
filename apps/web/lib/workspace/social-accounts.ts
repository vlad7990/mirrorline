/**
 * `social_accounts` rows → the cards the accounts board already renders (B2.3).
 *
 * ============================================================================
 * The figures are absent, not zero and not borrowed
 * ============================================================================
 *
 * `metric_snapshots` stays empty until the ingestion in B6 runs, so no real
 * account has a measurement today. Three ways to render that, and only one is
 * honest:
 *
 * - **Zero.** "0 saves" says we read the account and found nothing.
 * - **The sample figures** `lib/studio/accounts.ts` holds. Worse: a number
 *   beside the client's own handle reads as *their* result, and a "sample data"
 *   label does not undo that. Non-negotiable 7.
 * - **Nothing, with a sentence.** `state: 'unmeasured'` on every KPI, which the
 *   card renders as "Not measured yet".
 *
 * The same choice B2.1 made for key results, where `current: number | null`
 * exists so the screens have to render the absence.
 *
 * **The four keys are still present.** Dropping them would make a connected
 * account look like a not-connected one, and the cards are meant to compare.
 *
 * ============================================================================
 * What is derived, and what would be invention
 * ============================================================================
 *
 * The table stores six things; `SocialAccount` wants ten. The four extra are
 * derivable without claiming anything:
 *
 * - `platformLabel`, `statusLabel` — wording for a value we hold.
 * - `displayName` — **the handle**. The platform's own profile name would need
 *   an API read we have not made and have no token for (§6), so the handle is
 *   the one name we can stand behind.
 * - `isPrivatePosting`, and the default `note` — our own approval state, from
 *   `lib/copy/platform-limits.ts`. A second copy of that sentence here would be
 *   a second thing to update the day a platform approves us.
 */

import { type AccountStatus, type Platform, type SocialAccount } from '@mirrorline/mock'

import { type Kpi } from '@/components/kpi/kpi-types'
import { KPI_DEFINITIONS } from '@/components/kpi/sample-dashboard'
import { type GatedPlatform, privateUntilApproved } from '@/lib/copy/platform-limits'
import { type AccountMetrics } from '@/lib/studio/accounts'

/** One row of `public.social_accounts`, as PostgREST returns it. */
export interface SocialAccountRow {
  readonly id: string
  readonly platform: string
  readonly handle: string | null
  readonly status: string
  readonly note: string | null
  /** `YYYY-MM-DD`, or null when never connected. */
  readonly connected_on: string | null
}

/**
 * The four every account card shows, in this order (15 §4).
 *
 * Deliberately the same four for every account, so the cards compare rather
 * than each telling its own story.
 */
export const ACCOUNT_KPI_KEYS = [
  'three_second_hold',
  'sends_per_1k',
  'net_followers',
  'leads',
] as const

/** What fills a connected account's figures, in the card's own words. */
const AWAITING = 'the first post we publish to this account'

const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
}

const STATUS_LABELS: Readonly<Record<AccountStatus, string>> = {
  connected: 'Connected',
  'reconnect-needed': 'Reconnect needed',
  'not-connected': 'Not connected',
}

/**
 * The platforms whose posts stay private until our app is approved (§6).
 *
 * Typed against `platform-limits.ts`'s `GatedPlatform` so the two cannot
 * drift: if a platform leaves that list, this map stops compiling.
 */
const GATED: Readonly<Partial<Record<Platform, GatedPlatform>>> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

const PLATFORMS = new Set<string>(Object.keys(PLATFORM_LABELS))
const STATUSES = new Set<string>(Object.keys(STATUS_LABELS))

/**
 * A row's platform, or null when the database holds one this build does not
 * know. The column has a check constraint, so this is the case where a newer
 * migration ran against older code — render something rather than crash a
 * screen.
 */
function platformOf(row: SocialAccountRow): Platform | null {
  return PLATFORMS.has(row.platform) ? (row.platform as Platform) : null
}

function statusOf(row: SocialAccountRow): AccountStatus {
  // An unknown status is treated as not-connected: the cautious direction is
  // the one that offers no measurement and claims no connection.
  return STATUSES.has(row.status) ? (row.status as AccountStatus) : 'not-connected'
}

export function toSocialAccount(row: SocialAccountRow): SocialAccount {
  const platform = platformOf(row) ?? 'instagram'
  const gated = GATED[platform]
  const platformLabel = PLATFORM_LABELS[platform]
  const status = statusOf(row)

  return {
    id: row.id,
    platform,
    platformLabel,
    // The handle is the only name we can stand behind. See the note above.
    displayName: row.handle ?? platformLabel,
    handle: row.handle,
    status,
    statusLabel: STATUS_LABELS[status],
    // A stored note is more specific than the platform-wide one, so it wins.
    note: row.note ?? (gated === undefined ? null : privateUntilApproved(gated)),
    isPrivatePosting: gated !== undefined,
    connectedOn: row.connected_on,
  }
}

/** The four KPI keys, every one of them unmeasured. */
function unmeasuredKpis(): readonly Kpi[] {
  return ACCOUNT_KPI_KEYS.map((key) => {
    const definition = KPI_DEFINITIONS.find((item) => item.key === key)
    // A missing key is a programming error, not a runtime condition. Throwing
    // turns it into a failing test rather than a card rendering nothing.
    if (!definition) throw new Error(`Unknown KPI definition: ${key}`)

    return { definition, value: { state: 'unmeasured', awaiting: AWAITING } } as const
  })
}

/**
 * The board's rows, in the order the database returned them.
 *
 * A **not-connected** account gets no KPIs at all, which is what makes the card
 * render its connect prompt: there is nothing to measure *and* something to
 * offer. A **reconnect-needed** one keeps them, because it is still linked and
 * the figures are still ours to produce.
 *
 * `leadShare` is null throughout. It is a share of a workspace total that
 * nothing has measured either, so computing one would be an invention twice
 * over.
 */
export function toAccountMetrics(rows: readonly SocialAccountRow[]): readonly AccountMetrics[] {
  return rows.map((row) => {
    const account = toSocialAccount(row)

    return {
      account,
      kpis: account.status === 'not-connected' ? [] : unmeasuredKpis(),
      leadShare: null,
    }
  })
}

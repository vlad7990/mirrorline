/**
 * The rows the Connected accounts card lists (B2.3, D109).
 *
 * ============================================================================
 * Why a placeholder row is not invented data
 * ============================================================================
 *
 * A real workspace starts with **no `social_accounts` rows at all** — nothing
 * seeds them, and the pipeline only writes rows for accounts that exist. Listed
 * strictly from the table, the card would be empty on day one, with no button
 * to connect anything from.
 *
 * So every supported platform gets a row, and a platform with nothing stored
 * gets one that says `not-connected` with no handle and no date. That claims
 * nothing: "we have no account for this platform" is exactly what is true.
 *
 * ============================================================================
 * Every stored row is rendered, not one per platform
 * ============================================================================
 *
 * `(workspace_id, platform, handle)` is the unique key, so the schema already
 * permits two Instagram handles on one workspace — the agencies case, deferred
 * but deliberately not blocked (Vlad's call, D109). Collapsing to one row per
 * platform would therefore be able to **hide an account somebody connected**,
 * which is a worse failure than an unfamiliar fifth row.
 *
 * In the ordinary case — at most one handle per platform — this returns exactly
 * the four rows the card has always shown, in the order it has always shown
 * them.
 */

import { type Platform, type SocialAccount } from '@mirrorline/mock'

import { type SocialAccountRow, toSocialAccount } from './social-accounts'

/**
 * The four the database's check constraint allows, in the card's order.
 *
 * LinkedIn is last and still post-MVP: its Connect button stays disabled and
 * the reason is written on the row.
 */
export const SUPPORTED_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const

/** A platform with nothing stored: true, and carrying no handle or date. */
function placeholder(platform: Platform): SocialAccount {
  return toSocialAccount({
    // Prefixed so it cannot collide with a uuid, and so a reader of the DOM can
    // tell a placeholder from a row that exists.
    id: `unconnected:${platform}`,
    platform,
    handle: null,
    status: 'not-connected',
    note: null,
    connected_on: null,
  })
}

export function toSettingsAccounts(rows: readonly SocialAccountRow[]): readonly SocialAccount[] {
  const known = rows.filter((row) =>
    (SUPPORTED_PLATFORMS as readonly string[]).includes(row.platform),
  )

  // Platform order first, stored order within a platform. The card's sequence
  // is stable whatever the database returns, so two loads cannot disagree.
  return SUPPORTED_PLATFORMS.flatMap((platform) => {
    const stored = known.filter((row) => row.platform === platform)
    return stored.length === 0 ? [placeholder(platform)] : stored.map(toSocialAccount)
  })
}

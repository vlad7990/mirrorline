/**
 * What the Connected accounts card lists (B2.3, D109).
 *
 * Two rules pull against each other here, and both matter:
 *
 * 1. **Every supported platform gets a row**, so a workspace with nothing
 *    connected still has somewhere to connect from. A real workspace starts
 *    with no rows at all.
 * 2. **Every stored row is rendered.** The data layer permits more than one
 *    handle per platform — `(workspace_id, platform, handle)` is the unique
 *    key, for the agencies case later — so collapsing to one row per platform
 *    would hide an account somebody connected.
 */

import { describe, expect, test } from 'vitest'

import { SUPPORTED_PLATFORMS, toSettingsAccounts } from './settings-accounts'
import { type SocialAccountRow } from './social-accounts'

const row = (over: Partial<SocialAccountRow> = {}): SocialAccountRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  platform: 'instagram',
  handle: '@example',
  status: 'connected',
  note: null,
  connected_on: '2026-11-21',
  ...over,
})

describe('toSettingsAccounts', () => {
  test('an empty workspace still offers every supported platform', () => {
    // Act
    const accounts = toSettingsAccounts([])

    // Assert — the card has to have somewhere to connect from on day one.
    expect(accounts.map((account) => account.platform)).toEqual([...SUPPORTED_PLATFORMS])
    expect(accounts.every((account) => account.status === 'not-connected')).toBe(true)
  })

  test('a placeholder row carries no handle and no date, because there is no account', () => {
    // Act
    const [first] = toSettingsAccounts([])

    // Assert
    expect(first?.handle).toBeNull()
    expect(first?.connectedOn).toBeNull()
  })

  test('a stored row replaces its platform’s placeholder', () => {
    // Act
    const accounts = toSettingsAccounts([row()])

    // Assert — four rows, not five.
    expect(accounts).toHaveLength(SUPPORTED_PLATFORMS.length)
    const instagram = accounts.filter((account) => account.platform === 'instagram')
    expect(instagram).toHaveLength(1)
    expect(instagram[0]?.handle).toBe('@example')
    expect(instagram[0]?.status).toBe('connected')
  })

  test('a second handle on the same platform is listed, not hidden', () => {
    // Act — the agencies case the schema already allows.
    const accounts = toSettingsAccounts([
      row({ id: 'one', handle: '@first' }),
      row({ id: 'two', handle: '@second' }),
    ])

    // Assert — five rows: both instagram handles, plus the three platforms
    // with nothing stored.
    expect(accounts).toHaveLength(SUPPORTED_PLATFORMS.length + 1)
    expect(
      accounts.filter((account) => account.platform === 'instagram').map((a) => a.handle),
    ).toEqual(['@first', '@second'])
  })

  test('platforms stay in the order the card has always shown them', () => {
    // Act — a stored row must not promote its platform up the list.
    const accounts = toSettingsAccounts([row({ platform: 'youtube' })])

    // Assert
    expect(accounts.map((account) => account.platform)).toEqual([...SUPPORTED_PLATFORMS])
  })

  test('a disconnected account keeps its handle, so reconnecting does not retype it', () => {
    // Act
    const accounts = toSettingsAccounts([
      row({ status: 'not-connected', connected_on: null, handle: '@kept' }),
    ])

    // Assert — the row is the stored one, not a placeholder.
    const instagram = accounts.find((account) => account.platform === 'instagram')
    expect(instagram?.handle).toBe('@kept')
    expect(instagram?.status).toBe('not-connected')
  })

  test('a placeholder for a gated platform still carries its limit', () => {
    // Act
    const accounts = toSettingsAccounts([])
    const tiktok = accounts.find((account) => account.platform === 'tiktok')

    // Assert — the sentence a reader needs before connecting, not after.
    expect(tiktok?.note).toBe('TikTok posts stay private until our app is approved.')
  })

  test('a row on a platform this build does not know is dropped rather than rendered', () => {
    // Act — a newer migration against older code. Four rows, not five.
    const accounts = toSettingsAccounts([row({ platform: 'threads', id: 'unknown' })])

    // Assert
    expect(accounts).toHaveLength(SUPPORTED_PLATFORMS.length)
    expect(accounts.some((account) => account.id === 'unknown')).toBe(false)
  })
})

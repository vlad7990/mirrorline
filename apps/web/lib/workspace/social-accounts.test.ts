/**
 * The accounts board, off sample data (B2.3).
 *
 * The rule these tests exist for is the one that is easiest to break by being
 * helpful: **a connected account with nothing measured shows no figure**, not a
 * zero and not a sample. A number beside the client's own handle reads as their
 * result whatever label sits next to it.
 */

import { describe, expect, test } from 'vitest'

import {
  type SocialAccountRow,
  ACCOUNT_KPI_KEYS,
  toAccountMetrics,
  toSocialAccount,
} from './social-accounts'

const row = (over: Partial<SocialAccountRow> = {}): SocialAccountRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  platform: 'instagram',
  handle: '@example',
  status: 'connected',
  note: null,
  connected_on: '2026-11-21',
  ...over,
})

describe('toSocialAccount', () => {
  test('carries the handle, the status and the date through', () => {
    // Act
    const account = toSocialAccount(row())

    // Assert
    expect(account.platform).toBe('instagram')
    expect(account.handle).toBe('@example')
    expect(account.status).toBe('connected')
    expect(account.connectedOn).toBe('2026-11-21')
  })

  test('labels the platform and the status in words the card can print', () => {
    // Act
    const account = toSocialAccount(row({ platform: 'tiktok', status: 'reconnect-needed' }))

    // Assert
    expect(account.platformLabel).toBe('TikTok')
    expect(account.statusLabel).toBe('Reconnect needed')
  })

  test('names the account by its handle, because we never fetched a profile name', () => {
    // Act — no display name is stored, and inventing one would be a claim
    // about a platform read we have not made.
    const account = toSocialAccount(row({ handle: '@thehandle' }))

    // Assert
    expect(account.displayName).toBe('@thehandle')
  })

  test('falls back to the platform when there is no handle yet', () => {
    // Act
    const account = toSocialAccount(row({ handle: null, platform: 'youtube' }))

    // Assert
    expect(account.displayName).toBe('YouTube')
    expect(account.handle).toBeNull()
  })

  test('carries the honest platform limit for a gated platform', () => {
    // Act
    const tiktok = toSocialAccount(row({ platform: 'tiktok' }))

    // Assert — one source for that sentence (`lib/copy/platform-limits.ts`),
    // not a second copy written here.
    expect(tiktok.note).toBe('TikTok posts stay private until our app is approved.')
    expect(tiktok.isPrivatePosting).toBe(true)
  })

  test('a stored note wins over the platform default, because it is more specific', () => {
    // Act
    const account = toSocialAccount(row({ platform: 'tiktok', note: 'Business account pending.' }))

    // Assert
    expect(account.note).toBe('Business account pending.')
  })

  test('instagram is not gated, so it carries no note of its own', () => {
    // Act
    const account = toSocialAccount(row({ platform: 'instagram' }))

    // Assert
    expect(account.note).toBeNull()
    expect(account.isPrivatePosting).toBe(false)
  })
})

describe('toAccountMetrics', () => {
  test('a connected account gets the four KPIs, every one unmeasured', () => {
    // Act
    const [entry] = toAccountMetrics([row()])

    // Assert — the keys are there so the cards still compare like for like,
    // and not one of them carries a number.
    expect(entry?.kpis.map((kpi) => kpi.definition.key)).toEqual([...ACCOUNT_KPI_KEYS])
    expect(entry?.kpis.every((kpi) => kpi.value.state === 'unmeasured')).toBe(true)
  })

  test('no KPI on a real account has a value field at all', () => {
    // Act
    const [entry] = toAccountMetrics([row()])

    // Assert — the assertion that would have failed had this reused the sample
    // figures: `value` is absent from the union member, so there is nothing to
    // render and nothing to mistake for a measurement.
    for (const kpi of entry?.kpis ?? []) {
      expect(kpi.value).not.toHaveProperty('value')
      expect(kpi.value).not.toHaveProperty('series')
    }
  })

  test('an unmeasured KPI says what it is waiting for', () => {
    // Act
    const [entry] = toAccountMetrics([row()])
    const first = entry?.kpis[0]?.value

    // Assert
    expect(first?.state).toBe('unmeasured')
    expect(first?.state === 'unmeasured' && first.awaiting.length).toBeGreaterThan(0)
  })

  test('a reconnect-needed account keeps its KPIs, because it is still linked', () => {
    // Act
    const [entry] = toAccountMetrics([row({ status: 'reconnect-needed' })])

    // Assert
    expect(entry?.kpis).toHaveLength(ACCOUNT_KPI_KEYS.length)
  })

  test('a not-connected account has no KPIs at all, which is the connect prompt', () => {
    // Act
    const [entry] = toAccountMetrics([row({ status: 'not-connected', connected_on: null })])

    // Assert — empty rather than four unmeasured cards: there is nothing to
    // measure *and* an action to offer, which is the other state's job.
    expect(entry?.kpis).toEqual([])
  })

  test('lead share is null for every account, because nothing is measured', () => {
    // Act
    const entries = toAccountMetrics([row(), row({ status: 'not-connected' })])

    // Assert — a share of an unmeasured total is an invention twice over.
    expect(entries.map((entry) => entry.leadShare)).toEqual([null, null])
  })

  test('keeps the database order, so the board does not reshuffle between loads', () => {
    // Act
    const entries = toAccountMetrics([
      row({ id: 'a', platform: 'youtube' }),
      row({ id: 'b', platform: 'instagram' }),
    ])

    // Assert
    expect(entries.map((entry) => entry.account.platform)).toEqual(['youtube', 'instagram'])
  })

  test('no rows is no accounts, not a demo workspace', () => {
    // Act
    const entries = toAccountMetrics([])

    // Assert
    expect(entries).toEqual([])
  })
})

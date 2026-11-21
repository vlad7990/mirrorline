import { describe, expect, test } from 'vitest'

import { localDateIn, parseTimeZone } from './timezone'

describe('parseTimeZone', () => {
  test('accepts the IANA name a browser actually reports', () => {
    // Arrange
    const fromTheBrowser = 'America/New_York'

    // Act
    const parsed = parseTimeZone(fromTheBrowser)

    // Assert
    expect(parsed).toBe('America/New_York')
  })

  test('accepts a backward-compatibility alias, which a real browser may still send', () => {
    // `Intl.supportedValuesOf('timeZone')` omits these; the formatter accepts
    // them, which is why the formatter is the check.
    expect(parseTimeZone('Asia/Calcutta')).toBe('Asia/Calcutta')
    expect(parseTimeZone('US/Eastern')).toBe('US/Eastern')
  })

  test('accepts UTC, because for some workspaces it is the true answer', () => {
    expect(parseTimeZone('UTC')).toBe('UTC')
  })

  test('trims surrounding whitespace rather than rejecting it', () => {
    expect(parseTimeZone('  Europe/London  ')).toBe('Europe/London')
  })

  test('returns null for a zone no database knows', () => {
    expect(parseTimeZone('Narnia')).toBeNull()
    expect(parseTimeZone('Not/AZone')).toBeNull()
  })

  test('returns null for nothing at all, which is how a missing field arrives', () => {
    expect(parseTimeZone('')).toBeNull()
    expect(parseTimeZone('   ')).toBeNull()
  })

  test('returns null for a value that is not a string', () => {
    // `FormData.get` returns `File | string | null`, so all three reach here.
    expect(parseTimeZone(null)).toBeNull()
    expect(parseTimeZone(undefined)).toBeNull()
    expect(parseTimeZone(42)).toBeNull()
    expect(parseTimeZone({ timeZone: 'Europe/London' })).toBeNull()
  })

  test('returns null for an absurdly long value before asking ICU about it', () => {
    // Arrange
    const tooLong = `Europe/${'London'.repeat(20)}`

    // Act
    const parsed = parseTimeZone(tooLong)

    // Assert
    expect(parsed).toBeNull()
  })
})

describe('localDateIn', () => {
  /** 02:30 UTC on Thursday 19 November 2026. */
  const EARLY_UTC_THURSDAY = new Date('2026-11-19T02:30:00Z')

  test('is still the previous day west of Greenwich', () => {
    // Act — 21:30 on Wednesday in New York.
    const date = localDateIn('America/New_York', EARLY_UTC_THURSDAY)

    // Assert — this is the whole reason the function exists: UTC would say the
    // 19th and show the client a week they are not in yet.
    expect(date).toBe('2026-11-18')
  })

  test('is already the next day far enough east', () => {
    // Act — 15:30 on Thursday in Auckland.
    expect(localDateIn('Pacific/Auckland', EARLY_UTC_THURSDAY)).toBe('2026-11-19')
  })

  test('agrees with UTC when the zone is UTC', () => {
    expect(localDateIn('UTC', EARLY_UTC_THURSDAY)).toBe('2026-11-19')
  })

  test('pads the month and the day to two digits', () => {
    // Act — 1 January, the shape that breaks a naive join.
    const date = localDateIn('UTC', new Date('2027-01-01T12:00:00Z'))

    // Assert
    expect(date).toBe('2027-01-01')
  })

  test('returns null for a zone ICU does not know', () => {
    expect(localDateIn('Narnia', EARLY_UTC_THURSDAY)).toBeNull()
  })
})

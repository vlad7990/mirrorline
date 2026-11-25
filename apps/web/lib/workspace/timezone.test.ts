import { describe, expect, test } from 'vitest'

import {
  FALLBACK_TIME_ZONE,
  formatReportDate,
  localDateIn,
  parseTimeZone,
  reportTimeZone,
} from './timezone'

/**
 * The scan Vlad reviewed: it finished at 8:31 PM on 24 November 2026 in New
 * York, which is 01:31 on the 25th in UTC. The report said "Scanned 25
 * November" (D131).
 */
const FIRST_LIVE_SCAN = '2026-11-25T01:31:00.000Z'

describe('formatReportDate', () => {
  test('renders the evening of the 24th as the 24th, not the 25th', () => {
    // Arrange
    const timeZone = 'America/New_York'

    // Act
    const rendered = formatReportDate(FIRST_LIVE_SCAN, timeZone)

    // Assert
    expect(rendered).toBe('24 November 2026')
  })

  test('falls back to New York rather than to the server, which is UTC', () => {
    // A workspace created before D97 captured no zone. The old code rendered
    // the server's day; this renders the business's.
    expect(formatReportDate(FIRST_LIVE_SCAN, null)).toBe('24 November 2026')
  })

  test('uses the workspace zone when it has one, even across the date line', () => {
    // 01:31 UTC on the 25th is already the afternoon of the 25th in Auckland.
    expect(formatReportDate(FIRST_LIVE_SCAN, 'Pacific/Auckland')).toBe('25 November 2026')
  })

  test('returns null for a timestamp that will not parse, so the line is omitted', () => {
    expect(formatReportDate('not a date', 'America/New_York')).toBeNull()
  })
})

describe('reportTimeZone', () => {
  test('keeps a zone ICU knows', () => {
    expect(reportTimeZone('Europe/London')).toBe('Europe/London')
  })

  test('answers the same way for null, empty and nonsense — something gets printed', () => {
    expect(reportTimeZone(null)).toBe(FALLBACK_TIME_ZONE)
    expect(reportTimeZone('')).toBe(FALLBACK_TIME_ZONE)
    expect(reportTimeZone('Narnia/Cair_Paravel')).toBe(FALLBACK_TIME_ZONE)
  })
})

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

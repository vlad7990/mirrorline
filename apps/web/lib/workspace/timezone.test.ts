import { describe, expect, test } from 'vitest'

import { parseTimeZone } from './timezone'

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

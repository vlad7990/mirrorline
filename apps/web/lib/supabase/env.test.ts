/**
 * Hermetic. Every environment here is a literal written in this file — no real
 * key is read, and `process.env` is never consulted, because every function
 * takes the environment as an argument for exactly that reason.
 */

import { describe, expect, test } from 'vitest'

import {
  anonSupabaseConfig,
  describeSupabaseEnv,
  requireServerSupabaseConfig,
  serverSupabaseConfig,
} from './env'

/** Long enough to pass the placeholder check, and obviously not a key. */
const FAKE_KEY = `fake.${'x'.repeat(60)}`
const FAKE_URL = 'https://example.supabase.co'

const COMPLETE_ENV = {
  SUPABASE_URL: FAKE_URL,
  NEXT_PUBLIC_SUPABASE_URL: FAKE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY,
} as const

describe('describeSupabaseEnv', () => {
  test('reports nothing configured when the environment is empty', () => {
    // Arrange
    const env = {}

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.isComplete).toBe(false)
    expect(report.url.isPresent).toBe(false)
    expect(report.anonKey.isPresent).toBe(false)
    expect(report.serviceRoleKey.isPresent).toBe(false)
    expect(report.url.source).toBeNull()
  })

  test('is complete when all three are set under the names the plan asks for', () => {
    // Arrange / Act
    const report = describeSupabaseEnv(COMPLETE_ENV)

    // Assert
    expect(report.isComplete).toBe(true)
    expect(report.nameWarnings).toEqual([])
  })

  test('never includes a credential value in the report', () => {
    // Arrange / Act
    const report = describeSupabaseEnv(COMPLETE_ENV)

    // Assert — the whole report, serialised, must not contain the secret. This
    // is what makes the type's missing `value` field a guarantee rather than an
    // intention.
    expect(JSON.stringify(report)).not.toContain(FAKE_KEY)
    expect(JSON.stringify(report)).not.toContain('xxxx')
  })

  test('records which variable name supplied the URL', () => {
    // Arrange
    const env = { NEXT_PUBLIC_SUPABASE_URL: FAKE_URL }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert — the prefixed name is the source only when it is the one set.
    expect(report.url.source).toBe('NEXT_PUBLIC_SUPABASE_URL')
  })

  test('prefers SUPABASE_URL, which is the name the shipped code already reads', () => {
    // Arrange
    const env = { SUPABASE_URL: FAKE_URL, NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.url.source).toBe('SUPABASE_URL')
  })

  test('warns when only the prefixed URL is set, because scan-store.ts reads the other one', () => {
    // Arrange — the exact mistake §7 of the plan invites by listing only the
    // prefixed name.
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: FAKE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY,
    }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.isComplete).toBe(true)
    expect(report.nameWarnings.join(' ')).toContain('scan-store.ts')
  })

  test('warns when only the unprefixed URL is set, because the browser cannot read it', () => {
    // Arrange
    const env = {
      SUPABASE_URL: FAKE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY,
    }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.nameWarnings.join(' ')).toContain('browser cannot read the URL')
  })

  test('calls out a URL that is not a URL without quoting it', () => {
    // Arrange
    const env = { ...COMPLETE_ENV, SUPABASE_URL: 'not-a-url', NEXT_PUBLIC_SUPABASE_URL: undefined }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.isComplete).toBe(false)
    expect(report.url.shapeProblem).toBe('SUPABASE_URL is not a URL')
    expect(report.url.shapeProblem).not.toContain('not-a-url')
  })

  test('rejects an http URL, because a key must not travel in clear text', () => {
    // Arrange
    const env = {
      ...COMPLETE_ENV,
      SUPABASE_URL: 'http://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.url.shapeProblem).toBe('SUPABASE_URL is not https')
  })

  test('treats a placeholder key as a shape problem rather than a key', () => {
    // Arrange
    const env = { ...COMPLETE_ENV, SUPABASE_SERVICE_ROLE_KEY: 'your-key-here' }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.isComplete).toBe(false)
    expect(report.serviceRoleKey.shapeProblem).toContain('too short')
  })

  test('treats whitespace as absence', () => {
    // Arrange — a variable set to an empty string in a dashboard is the same as
    // unset, and "present but blank" would pass a truthiness check.
    const env = { SUPABASE_URL: '   ' }

    // Act
    const report = describeSupabaseEnv(env)

    // Assert
    expect(report.url.isPresent).toBe(false)
  })
})

describe('serverSupabaseConfig', () => {
  test('returns the url and service-role key when both are set', () => {
    // Arrange / Act
    const config = serverSupabaseConfig(COMPLETE_ENV)

    // Assert
    expect(config).toEqual({ url: FAKE_URL, serviceRoleKey: FAKE_KEY })
  })

  test('strips a trailing slash, so callers can concatenate a path safely', () => {
    // Arrange
    const env = { ...COMPLETE_ENV, SUPABASE_URL: `${FAKE_URL}/` }

    // Act
    const config = serverSupabaseConfig(env)

    // Assert
    expect(config?.url).toBe(FAKE_URL)
  })

  test('is null when the anon key is set but the service-role key is not', () => {
    // Arrange
    const env = { SUPABASE_URL: FAKE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY }

    // Act / Assert
    expect(serverSupabaseConfig(env)).toBeNull()
  })
})

describe('anonSupabaseConfig', () => {
  test('is null when the service-role key is set but the anon key is not', () => {
    // Arrange — the asymmetry matters: a server that can read everything is not
    // a browser that can read its own rows.
    const env = { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY }

    // Act / Assert
    expect(anonSupabaseConfig(env)).toBeNull()
  })

  test('returns the anon key when it is set', () => {
    // Arrange / Act
    const config = anonSupabaseConfig(COMPLETE_ENV)

    // Assert
    expect(config).toEqual({ url: FAKE_URL, anonKey: FAKE_KEY })
  })
})

describe('requireServerSupabaseConfig', () => {
  test('throws a message naming the variable to set and the file to put it in', () => {
    // Arrange / Act / Assert
    expect(() => requireServerSupabaseConfig({})).toThrow(/SUPABASE_URL/)
    expect(() => requireServerSupabaseConfig({})).toThrow(/apps\/web\/\.env\.local/)
  })

  test('the thrown message never quotes the offending value', () => {
    // Arrange — present but malformed is the case that tempts an error message
    // into echoing what it rejected. The value is a word that does not appear
    // in the message's own wording, so the assertion can tell them apart.
    const env = { SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_ROLE_KEY: 'placeholder' }

    // Act
    let message = ''
    try {
      requireServerSupabaseConfig(env)
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : String(error)
    }

    // Assert
    expect(message).toContain('SUPABASE_SERVICE_ROLE_KEY is too short')
    expect(message).not.toContain('placeholder')
  })
})

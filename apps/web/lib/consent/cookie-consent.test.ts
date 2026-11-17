/**
 * The consent record, which now gates a second thing.
 *
 * These were implicit while the banner owned its own storage: nobody could
 * see what a blocked `localStorage` did without reading the component. They
 * matter more now because 18 §3.3 hangs the co-pilot launcher off the same
 * answer — "no stored choice" has to keep meaning *ask again and show
 * nothing*, in every one of the three ways it can happen.
 */

import { describe, expect, test } from 'vitest'

import {
  CONSENT_STORAGE_KEY,
  isConsentChoice,
  readConsentChoice,
  writeConsentChoice,
} from './cookie-consent'

function fakeStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    read: (key: string) => entries.get(key) ?? null,
    size: () => entries.size,
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error('storage is blocked')
  },
  setItem: () => {
    throw new Error('storage is blocked')
  },
}

describe('reading the choice', () => {
  test('returns the stored choice when one was made', () => {
    const storage = fakeStorage({ [CONSENT_STORAGE_KEY]: 'essential' })

    expect(readConsentChoice(storage)).toBe('essential')
  })

  test('returns null when nobody has chosen yet', () => {
    expect(readConsentChoice(fakeStorage())).toBeNull()
  })

  test('returns null when storage throws, rather than assuming consent', () => {
    // Privacy modes throw on access. Re-asking is the conservative failure;
    // treating the throw as "they said yes once" is the dangerous one.
    expect(readConsentChoice(throwingStorage)).toBeNull()
  })

  test('returns null when storage is absent, as it is on the server', () => {
    expect(readConsentChoice(undefined)).toBeNull()
  })

  test('ignores a value it does not recognise', () => {
    const storage = fakeStorage({ [CONSENT_STORAGE_KEY]: 'yes-please' })

    expect(readConsentChoice(storage)).toBeNull()
  })
})

describe('writing the choice', () => {
  test('writes the choice, and only ever that one key', () => {
    const storage = fakeStorage()

    expect(writeConsentChoice(storage, 'all')).toBe(true)
    expect(storage.read(CONSENT_STORAGE_KEY)).toBe('all')
    expect(storage.size()).toBe(1)
  })

  test('reports a blocked write instead of throwing through the caller', () => {
    expect(writeConsentChoice(throwingStorage, 'essential')).toBe(false)
  })

  test('reports false when there is no storage at all', () => {
    expect(writeConsentChoice(undefined, 'essential')).toBe(false)
  })
})

describe('the guard', () => {
  test('accepts the two choices and nothing else', () => {
    expect(isConsentChoice('essential')).toBe(true)
    expect(isConsentChoice('all')).toBe(true)
    expect(isConsentChoice('')).toBe(false)
    expect(isConsentChoice(null)).toBe(false)
    expect(isConsentChoice({ choice: 'all' })).toBe(false)
  })
})

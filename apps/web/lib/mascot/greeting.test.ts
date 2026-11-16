/**
 * The greeting rules, without a browser.
 *
 * The e2e suite proves the bubble appears once in a real session; these prove
 * the decisions underneath it, including the two nobody can reach by clicking:
 * storage that throws, and storage that is not there at all.
 */

import { describe, expect, it } from 'vitest'

import {
  GREETING_DELAY_MS,
  GREETING_STORAGE_KEY,
  GREETING_VISIBLE_MS,
  GREETING_WAVE_MS,
  isQuietPath,
  markGreeted,
  shouldGreet,
} from './greeting'

/** A `sessionStorage` that works, so a test can watch what lands in it. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    read: () => Object.fromEntries(map),
  }
}

/** The Safari-private-mode shape: it refuses to read or write. */
function throwingStorage() {
  return {
    getItem: () => {
      throw new Error('storage disabled')
    },
    setItem: () => {
      throw new Error('storage disabled')
    },
  }
}

describe('shouldGreet', () => {
  it('greets on the first page of a visit', () => {
    expect(shouldGreet(fakeStorage(), '/')).toBe(true)
  })

  it('stays quiet on the next page of the same visit', () => {
    // Arrange
    const storage = fakeStorage()

    // Act
    const first = shouldGreet(storage, '/pricing')
    markGreeted(storage)
    const second = shouldGreet(storage, '/product')

    // Assert
    expect([first, second]).toEqual([true, false])
  })

  it('greets again in a visit that starts with empty storage', () => {
    // A new tab is a new visit, and that is the whole lifetime rule: the flag
    // is gone, so Milo says hello again rather than treating the first
    // greeting as something the reader has completed for ever.
    expect(shouldGreet(fakeStorage(), '/')).toBe(true)
  })

  it('never greets on a legal page, even on the first of a visit', () => {
    expect(shouldGreet(fakeStorage(), '/legal/privacy')).toBe(false)
    expect(shouldGreet(fakeStorage(), '/legal/terms')).toBe(false)
  })

  it('greets when storage is unavailable, rather than going silent', () => {
    expect(shouldGreet(null, '/')).toBe(true)
    expect(shouldGreet(undefined, '/')).toBe(true)
    expect(shouldGreet(throwingStorage(), '/')).toBe(true)
  })

  it('ignores a value that is not the one we write', () => {
    // Another tool, another version, a half-written value: anything that is
    // not exactly ours means "we have no record", not "already greeted".
    const storage = fakeStorage({ [GREETING_STORAGE_KEY]: 'yes' })
    expect(shouldGreet(storage, '/')).toBe(true)
  })
})

describe('markGreeted', () => {
  it('writes one key and nothing else', () => {
    // Arrange
    const storage = fakeStorage()

    // Act
    markGreeted(storage)

    // Assert — the whole of what Milo remembers about a visitor.
    expect(storage.read()).toEqual({ [GREETING_STORAGE_KEY]: '1' })
  })

  it('does not throw when storage refuses to write', () => {
    expect(() => markGreeted(throwingStorage())).not.toThrow()
    expect(() => markGreeted(null)).not.toThrow()
  })
})

describe('isQuietPath', () => {
  it('covers every legal document and the index', () => {
    expect(isQuietPath('/legal')).toBe(true)
    expect(isQuietPath('/legal/cookies')).toBe(true)
  })

  it('does not catch a page that merely starts with the same letters', () => {
    // `/legal-notices` would be a different page, and a `startsWith('/legal')`
    // without the boundary would silence Milo on it by accident.
    expect(isQuietPath('/legal-notices')).toBe(false)
    expect(isQuietPath('/')).toBe(false)
    expect(isQuietPath('/pricing')).toBe(false)
  })
})

describe('the timings the brief sets', () => {
  it('speaks about three seconds in and stays about six', () => {
    expect(GREETING_DELAY_MS).toBe(3_000)
    expect(GREETING_VISIBLE_MS).toBe(6_000)
  })

  it('stops waving well before the words go', () => {
    // A character still waving when the bubble closes reads as a loop.
    expect(GREETING_WAVE_MS).toBeLessThan(GREETING_VISIBLE_MS)
  })
})

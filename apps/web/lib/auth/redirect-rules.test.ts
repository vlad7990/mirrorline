import { describe, expect, test } from 'vitest'

import { STUDIO_HOME } from '@/lib/routes'

import {
  isAuthPath,
  isProtectedPath,
  isSafeNextPath,
  resolveNextPath,
  signInPathFor,
} from './redirect-rules'

describe('isProtectedPath', () => {
  test.each(['/app', '/app/home', '/app/results', '/app/onboarding', '/app/settings'])(
    '%s needs a session',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(true)
    },
  )

  test.each(['/', '/pricing', '/sign-in', '/legal/privacy', '/api/health/supabase'])(
    '%s does not',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false)
    },
  )

  test('a path that merely starts with the same letters is not protected', () => {
    // Arrange / Act / Assert — as far as this function knows `/applications`
    // is a marketing page, and a bare `startsWith('/app')` would have locked
    // it behind a session.
    expect(isProtectedPath('/applications')).toBe(false)
    expect(isProtectedPath('/app-store')).toBe(false)
  })
})

describe('isAuthPath', () => {
  test('sign-in and sign-up are the two', () => {
    expect(isAuthPath('/sign-in')).toBe(true)
    expect(isAuthPath('/sign-up')).toBe(true)
    expect(isAuthPath('/app/home')).toBe(false)
  })
})

describe('isSafeNextPath — the open-redirect guard', () => {
  test.each([
    '/app/home',
    '/app/results',
    '/app/results?tab=week',
    '/app/goals-and-kpis',
    '/pricing',
  ])('%s is a destination we will use', (raw) => {
    expect(isSafeNextPath(raw)).toBe(true)
  })

  test('a hyphen is allowed, which the first version of this guard got wrong', () => {
    // Arrange — the original character class was typed by hand and rejected
    // every path containing a hyphen. Half the studio's routes have one.
    expect(isSafeNextPath('/app/goals-and-kpis')).toBe(true)
    expect(isSafeNextPath('/app/results-week')).toBe(true)
  })

  test.each([
    ['//evil.example', 'protocol-relative, which a browser reads as another origin'],
    ['https://evil.example/login', 'absolute, another origin outright'],
    ['http://evil.example', 'absolute over plain http'],
    ['/\\evil.example', 'a backslash some browsers normalise to a slash'],
    ['javascript:alert(1)', 'a scheme that is not navigation at all'],
    ['/app/home\nSet-Cookie: x=y', 'a newline, which can smuggle a header'],
    ['app/home', 'relative, so it resolves against whatever page we are on'],
    ['', 'empty'],
    [null, 'absent'],
    [undefined, 'undefined'],
  ])('%s is refused — %s', (raw, why) => {
    // The reason rides along as the failure message, so a regression says
    // which hole reopened rather than only that one did.
    expect(isSafeNextPath(raw as string | null | undefined), why).toBe(false)
  })
})

describe('resolveNextPath', () => {
  test('keeps a safe destination', () => {
    expect(resolveNextPath('/app/results?tab=week')).toBe('/app/results?tab=week')
  })

  test.each(['//evil.example', 'https://evil.example', '/\\evil.example', null])(
    'falls back to the studio home rather than repairing %s',
    (raw) => {
      // Assert — a destination we had to fix is one we did not understand, so
      // it is replaced wholesale rather than sanitised into something nearby.
      expect(resolveNextPath(raw as string | null)).toBe(STUDIO_HOME)
    },
  )
})

describe('signInPathFor', () => {
  test('remembers the page somebody was trying to reach', () => {
    // Act
    const path = signInPathFor('/app/results')

    // Assert
    expect(path).toBe('/sign-in?next=%2Fapp%2Fresults')
  })

  test('keeps the query string, so a deep link survives the round trip', () => {
    // Act
    const path = signInPathFor('/app/results', '?tab=week&kpi=leads')

    // Assert — being returned to a filtered view without its filter is the
    // kind of almost-right that reads as broken.
    expect(path).toBe('/sign-in?next=%2Fapp%2Fresults%3Ftab%3Dweek%26kpi%3Dleads')
  })

  test('adds no parameter when the destination is where sign-in goes anyway', () => {
    // Act / Assert
    expect(signInPathFor(STUDIO_HOME)).toBe('/sign-in')
  })

  test('encodes the destination, so it cannot break out of the parameter', () => {
    // Arrange — an un-encoded `&` would turn one parameter into two, and the
    // second one would be a `next` we never wrote.
    const path = signInPathFor('/app/results', '?a=1&next=/evil')

    // Assert
    expect(path).toContain('%26next%3D%2Fevil')
    expect(path.split('next=').length - 1).toBe(1)
  })
})

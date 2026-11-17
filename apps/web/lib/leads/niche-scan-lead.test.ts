import { describe, expect, test } from 'vitest'

import { actionCopy, checkoutMode, planAction } from '../billing/checkout'

import { normaliseHandles, validateNicheScanRequest } from './niche-scan-lead'

const VALID = {
  email: 'someone@example.com',
  niche: 'bookkeeping for tradespeople',
  audience: 'business',
  stage: 'existing',
  goal: 'leads',
  handles: ['@one'],
}

describe('validateNicheScanRequest', () => {
  test('accepts a complete request', () => {
    const result = validateNicheScanRequest(VALID)

    expect(result.ok).toBe(true)
    expect(result.ok && result.lead.email).toBe('someone@example.com')
  })

  test('rejects a body that is not an object', () => {
    expect(validateNicheScanRequest('nope').ok).toBe(false)
    expect(validateNicheScanRequest(null).ok).toBe(false)
  })

  test('rejects an address that is not an email', () => {
    const result = validateNicheScanRequest({ ...VALID, email: 'not-an-email' })

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/email/i)
  })

  test('requires the niche, because it is the whole input to the scan', () => {
    expect(validateNicheScanRequest({ ...VALID, niche: '   ' }).ok).toBe(false)
  })

  test('rejects an audience or goal it does not recognise', () => {
    expect(validateNicheScanRequest({ ...VALID, audience: 'coach' }).ok).toBe(false)
    expect(validateNicheScanRequest({ ...VALID, goal: 'fame' }).ok).toBe(false)
  })

  test('refuses an over-long niche rather than truncating it', () => {
    // Truncating would store something the sender did not write.
    expect(validateNicheScanRequest({ ...VALID, niche: 'x'.repeat(401) }).ok).toBe(false)
  })
})

describe('normaliseHandles', () => {
  test('accepts the three ways people write a handle', () => {
    expect(normaliseHandles(['@one', 'two', 'https://example.com/three/'])).toEqual([
      '@one',
      '@two',
      '@three',
    ])
  })

  test('keeps at most three, since that is what the form offers', () => {
    expect(normaliseHandles(['a', 'b', 'c', 'd'])).toHaveLength(3)
  })

  test('drops blanks and junk instead of failing the whole submission', () => {
    // A malformed third handle should not cost somebody their scan.
    expect(normaliseHandles(['@good', '', '   ', 42, '@'])).toEqual(['@good'])
  })

  test('returns nothing when the field is absent', () => {
    expect(normaliseHandles(undefined)).toEqual([])
  })
})

describe('plan actions', () => {
  test('only Pilot and Creator can be bought outright', () => {
    expect(planAction('pilot')).toBe('checkout')
    expect(planAction('creator')).toBe('checkout')
  })

  test('Growth and Scale are set up on a call', () => {
    expect(planAction('growth')).toBe('book')
    expect(planAction('scale')).toBe('book')
  })

  test('Studio is a waitlist and nothing else', () => {
    // 09 §11: nothing on the site may imply it can be bought today.
    expect(planAction('studio')).toBe('waitlist')
    expect(actionCopy('studio', 'unavailable').label).toBe('Join the waitlist')
  })
})

describe('checkoutMode', () => {
  test('is unavailable with no key, which is the normal case', () => {
    delete process.env.STRIPE_TEST_SECRET_KEY
    expect(checkoutMode()).toBe('unavailable')
  })

  test('is test mode for a test key', () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_example'
    expect(checkoutMode()).toBe('test')
    delete process.env.STRIPE_TEST_SECRET_KEY
  })

  test('refuses a live key rather than silently using it', () => {
    // Non-negotiable 11: test mode only. A live key here is a configuration
    // mistake, and quietly charging someone is the worst possible outcome.
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_example'
    expect(checkoutMode()).toBe('unavailable')
    delete process.env.STRIPE_TEST_SECRET_KEY
  })

  test('never promises a charge when checkout is not connected', () => {
    const copy = actionCopy('pilot', 'unavailable')

    expect(copy.note).toMatch(/not connected|nothing will be charged/i)
  })
})

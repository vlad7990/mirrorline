import { describe, expect, test } from 'vitest'

import { CALLBACK_DESTINATIONS, callbackUrl, siteOrigin, type SiteEnv } from './callback-url'

/** The alias people visit, and the one the allow-list holds. */
const PRODUCTION_DOMAIN = 'mirrorline-eosin.vercel.app'
/** What `VERCEL_URL` actually is: a new one every deployment. */
const DEPLOYMENT_HOST = 'mirrorline-a1b2c3d4.vercel.app'

describe('siteOrigin', () => {
  test('an explicit NEXT_PUBLIC_SITE_URL wins over everything', () => {
    // Arrange — every other signal present and pointing elsewhere.
    const env: SiteEnv = {
      NEXT_PUBLIC_SITE_URL: 'https://mirrorline.com',
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_DOMAIN,
      VERCEL_URL: DEPLOYMENT_HOST,
    }

    // Act & Assert — the escape hatch has to be one, or it is not an answer.
    expect(siteOrigin(env)).toBe('https://mirrorline.com')
  })

  test('on production it is the stable domain, not the deployment host', () => {
    // Arrange — the exact shape of the bug: nothing configured, and
    // `VERCEL_URL` carrying a hostname that is in no allow-list.
    const env: SiteEnv = {
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_DOMAIN,
      VERCEL_URL: DEPLOYMENT_HOST,
    }

    // Act
    const origin = siteOrigin(env)

    // Assert — the assertion the old four lines would have failed.
    expect(origin).toBe(`https://${PRODUCTION_DOMAIN}`)
    expect(origin).not.toContain(DEPLOYMENT_HOST)
  })

  test('on a preview it is that preview, not production', () => {
    // Arrange — `VERCEL_PROJECT_PRODUCTION_URL` is set on previews too, which
    // is why the production branch is gated on `VERCEL_ENV`.
    const env: SiteEnv = {
      VERCEL_ENV: 'preview',
      VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_DOMAIN,
      VERCEL_URL: DEPLOYMENT_HOST,
    }

    // Act & Assert — a preview's confirmation link must come back to the
    // preview that sent it, or somebody confirms on production against the
    // production database.
    expect(siteOrigin(env)).toBe(`https://${DEPLOYMENT_HOST}`)
  })

  test('falls back to the deployment host when production names no domain', () => {
    const env: SiteEnv = { VERCEL_ENV: 'production', VERCEL_URL: DEPLOYMENT_HOST }
    expect(siteOrigin(env)).toBe(`https://${DEPLOYMENT_HOST}`)
  })

  test('is localhost when nothing is set at all', () => {
    expect(siteOrigin({})).toBe('http://localhost:3000')
  })

  test('treats an empty string as unset rather than as an origin', () => {
    // An unset variable and an empty one are the same intent, and `''` would
    // otherwise produce a callback URL with no host at all.
    const env: SiteEnv = { NEXT_PUBLIC_SITE_URL: '', VERCEL_URL: '' }

    expect(siteOrigin(env)).toBe('http://localhost:3000')
  })
})

describe('callbackUrl', () => {
  test('is absolute, because it goes in an email', () => {
    // Act
    const url = callbackUrl(CALLBACK_DESTINATIONS.signUp, {
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_DOMAIN,
    })

    // Assert — the whole string, since this is the thing that was wrong.
    expect(url).toBe(`https://${PRODUCTION_DOMAIN}/auth/callback?next=%2Fapp%2Fonboarding`)
  })

  test('encodes the destination rather than interpolating it', () => {
    // Act
    const url = callbackUrl('/app/results?tab=funnel', {})

    // Assert — an unencoded `?` would make `tab` a parameter of the callback
    // rather than of the destination, and the tab would be silently lost.
    expect(url).toBe('http://localhost:3000/auth/callback?next=%2Fapp%2Fresults%3Ftab%3Dfunnel')
  })

  test('the three senders have three destinations', () => {
    // The point of naming them: a literal at each call site is how two of the
    // three quietly become the same one.
    expect(CALLBACK_DESTINATIONS.signUp).toBe('/app/onboarding')
    expect(CALLBACK_DESTINATIONS.magicLink).toBe('/app/home')
    expect(CALLBACK_DESTINATIONS.passwordReset).toBe('/reset-password')

    const destinations = Object.values(CALLBACK_DESTINATIONS)
    expect(new Set(destinations).size).toBe(destinations.length)
  })
})

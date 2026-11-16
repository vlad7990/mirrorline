/**
 * The publishing section, held to the three claims it is allowed to make.
 *
 * This is the part of `/product` where a marketing site usually overreaches:
 * a row of platform logos implies working integrations, and a roadmap item
 * drawn the same size as a shipped one implies a product. So the tests are
 * about what the copy may not do — name a platform 09 §5 does not, drop the
 * TikTok audit caveat, or let a planned integration read as a built one.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { INTEGRATIONS, PUBLISHING_DESTINATIONS, PUBLISHING_NEVER } from './publishing-content'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const SERVICES = readFileSync(path.join(REPO_ROOT, 'docs/specs/09_SERVICES.md'), 'utf8')
/**
 * Whitespace collapsed, because the spec is hard-wrapped at 76 characters and
 * "no purchased or farmed accounts" straddles two lines there. A test that
 * matched the wrapping would fail the next time somebody reflowed a
 * paragraph, which is a test about Markdown rather than about the claim.
 */
const DAILY_POSTING = SERVICES.slice(
  SERVICES.indexOf("## 5. Daily posting to the client's own accounts"),
  SERVICES.indexOf('## 6. The Originality Gate'),
)
  .replace(/\s+/g, ' ')
  .trim()

describe('where posts go', () => {
  test('the section it comes from exists, so this test reads something', () => {
    expect(DAILY_POSTING.length).toBeGreaterThan(300)
  })

  test('names only the three platforms 09 §5 names', () => {
    expect(PUBLISHING_DESTINATIONS).toHaveLength(3)
    for (const destination of PUBLISHING_DESTINATIONS) {
      const platform = destination.platform.replace(' Reels', '').replace(' Shorts', '')
      expect(DAILY_POSTING, `${destination.platform} is not in 09 §5`).toContain(platform)
    }
  })

  test('every destination goes through an official API', () => {
    // Non-negotiable 3. A destination reached any other way is the previous
    // company, not this one.
    for (const destination of PUBLISHING_DESTINATIONS) {
      expect(destination.how.toLowerCase(), destination.id).toContain('official')
    }
  })

  test('the TikTok audit caveat is in the copy, not only in a status field', () => {
    const tiktok = PUBLISHING_DESTINATIONS.find((destination) => destination.id === 'tiktok')
    expect(tiktok?.status).toBe('audit-pending')
    // The note is what a visitor reads. A status nobody renders is a caveat
    // nobody sees.
    expect(tiktok?.note.toLowerCase()).toContain('private')
    expect(tiktok?.note.toLowerCase()).toContain('audit')
    expect(DAILY_POSTING.toLowerCase()).toContain('stay private until our app is audited')
  })
})

describe('the integrations strip', () => {
  test('every entry carries a status', () => {
    for (const integration of INTEGRATIONS) {
      expect(['built', 'planned'], integration.id).toContain(integration.status)
    }
  })

  test('something is planned and something is not — a strip of all-green is a lie', () => {
    expect(INTEGRATIONS.some((entry) => entry.status === 'planned')).toBe(true)
    expect(INTEGRATIONS.some((entry) => entry.status === 'built')).toBe(true)
  })

  test('a planned entry describes the intention rather than a capability', () => {
    // "Tying a booking back to the post" describes what it would do. "Ties
    // every booking back" would be a claim that it already does.
    for (const integration of INTEGRATIONS.filter((entry) => entry.status === 'planned')) {
      expect(integration.what.length, integration.id).toBeGreaterThan(40)
    }
  })
})

describe('what we never do', () => {
  test('restates non-negotiable 3 in the spec’s own words', () => {
    const never = PUBLISHING_NEVER.join(' ').toLowerCase()
    for (const phrase of ['device automation', 'app clones', 'proxies', 'farmed accounts']) {
      expect(never, phrase).toContain(phrase)
      expect(DAILY_POSTING.toLowerCase(), `09 §5 no longer says "${phrase}"`).toContain(phrase)
    }
  })
})

/**
 * The four billing promises, held against the page that has to honour them.
 *
 * A promise on a pricing page is cheap; the one on
 * `/legal/cancellation-refunds` is the one somebody could hold us to. These
 * tests fail if the marketing summary ever says something the legal page does
 * not — which is the only way this section becomes a lie without anybody
 * editing it on purpose.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { BILLING_DETAIL_HREF, BILLING_PROMISES } from './billing-promises-content'

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const REPO_ROOT = path.resolve(WEB_ROOT, '../..')

const LEGAL_PAGE = readFileSync(
  path.join(WEB_ROOT, 'app/(marketing)/legal/cancellation-refunds/page.tsx'),
  'utf8',
).toLowerCase()

const SERVICES = readFileSync(path.join(REPO_ROOT, 'docs/specs/09_SERVICES.md'), 'utf8')
const PLAIN_BILLING = SERVICES.slice(
  SERVICES.indexOf('## 10. Plain billing'),
  SERVICES.indexOf('## 11. Plans'),
).toLowerCase()

describe('the promises', () => {
  test('there are four, which is what 09 §10 commits to', () => {
    expect(PLAIN_BILLING.length).toBeGreaterThan(200)
    expect(BILLING_PROMISES).toHaveLength(4)
  })

  test('each one is a promise 09 §10 already makes', () => {
    const owed: Record<string, string> = {
      'no-credits': 'no credits',
      'cancel-in-one-click': 'cancel in one click',
      'files-are-yours': 'keeps every file',
      'no-setup-fee': 'no setup fee',
    }

    for (const promise of BILLING_PROMISES) {
      const phrase = owed[promise.id]
      expect(phrase, `${promise.id} is not one of 09 §10's four`).toBeDefined()
      expect(PLAIN_BILLING, `${promise.id}: 09 §10 does not say "${phrase}"`).toContain(phrase)
    }
  })

  test('each one is also written on the page that has to honour it', () => {
    const claims: Record<string, readonly string[]> = {
      'no-credits': ['no credits', 'metered by the minute'],
      'cancel-in-one-click': ['in one click', 'notice'],
      'files-are-yours': ['export', 'after you leave'],
      'no-setup-fee': ['setup fee', 'annual commitment'],
    }

    for (const promise of BILLING_PROMISES) {
      for (const claim of claims[promise.id] ?? []) {
        expect(LEGAL_PAGE, `${promise.id}: the legal page never says "${claim}"`).toContain(claim)
      }
    }
  })

  test('points at the page where the detail is, not at itself', () => {
    expect(BILLING_DETAIL_HREF).toBe('/legal/cancellation-refunds')
  })

  test('says what is ruled out, not only what is offered', () => {
    // "Flat pricing" on its own is marketing. The complaint in P3 is about
    // credits, notice periods and files, so each card has to name one.
    for (const promise of BILLING_PROMISES) {
      expect(promise.body.length).toBeGreaterThan(60)
      expect(promise.body.toLowerCase()).toMatch(/\bno\b|\bnothing\b|\bnot\b|\bexport\b/)
    }
  })
})

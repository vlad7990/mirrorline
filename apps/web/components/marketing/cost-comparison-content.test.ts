/**
 * The cost comparison, held to the two things that make it publishable.
 *
 * **Every market range still says what the source says.** The figures live in
 * `docs/specs/11 §2a` with a URL and a date beside each one, and this file
 * asserts the page's copy of them is the same string. A range that drifts
 * from its source is an invented figure with a citation attached, which is
 * worse than no citation at all.
 *
 * **Our own figure is arithmetic, not copy.** It is `price ÷ posts` off
 * `pricing-tiers.ts`, so the comparison cannot disagree with the price list
 * two sections above it on the same page.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { BANNED_PATTERNS, stripComments } from '../../lib/copy/banned-phrases'
import {
  COST_ROUTES,
  ourRangeLabel,
  ourRowNote,
  perPostLadder,
  perPostUsd,
} from './cost-comparison-content'
import { PRICING_TIERS } from './pricing-tiers'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const RESEARCH = readFileSync(path.join(REPO_ROOT, 'docs/specs/11_MARKET_RESEARCH.md'), 'utf8')

/** Just §2a, so a figure elsewhere in the file cannot satisfy the check. */
const BENCHMARKS = RESEARCH.slice(
  RESEARCH.indexOf('## 2a.'),
  RESEARCH.indexOf('## 3. How the platforms rank'),
)

describe('the market ranges', () => {
  test('the section they come from exists, so this test is reading something', () => {
    expect(BENCHMARKS.length).toBeGreaterThan(500)
    expect(BENCHMARKS).toContain('Cost benchmarks')
  })

  test('every route quotes its range exactly as the source records it', () => {
    for (const route of COST_ROUTES) {
      expect(BENCHMARKS, `${route.id}: ${route.range} is not in 11 §2a`).toContain(route.range)
    }
  })

  test('every route says what it buys and what it leaves undone', () => {
    // A price with no "and then what" is the comparison this page exists to
    // avoid: five numbers, no argument, and the smallest one wins.
    for (const route of COST_ROUTES) {
      expect(route.buys.length).toBeGreaterThan(30)
      expect(route.leavesUndone.length).toBeGreaterThan(30)
    }
  })

  test('names categories and never a company', () => {
    const brands = BANNED_PATTERNS.find((pattern) => pattern.id === 'competitor-brand')
    expect(brands, 'the competitor-brand pattern has been renamed').toBeDefined()

    const copy = stripComments(
      COST_ROUTES.map((route) => `${route.label} ${route.buys} ${route.leavesUndone}`).join('\n'),
    )
    expect(brands?.pattern.test(copy)).toBe(false)
  })

  test('shows the whole band, including the end that beats us', () => {
    // $20 a clip is cheaper than any plan of ours per post, and the row says
    // so rather than quoting the top of the range.
    const freelancer = COST_ROUTES.find((route) => route.id === 'freelancer')
    expect(freelancer?.range).toContain('$20')
  })
})

describe('our own figure', () => {
  test('is the plan price divided by the posts it delivers', () => {
    for (const tier of PRICING_TIERS) {
      const expected =
        tier.priceUsd === null || tier.postsInPeriod === null
          ? null
          : Math.round(tier.priceUsd / tier.postsInPeriod)
      expect(perPostUsd(tier), tier.name).toBe(expected)
    }
  })

  test('skips the plan nobody can buy', () => {
    // Studio is a waitlist. A per-post price for it would be a number about
    // something that does not happen.
    const studio = PRICING_TIERS.find((tier) => tier.id === 'studio')
    expect(studio, 'the Studio tier has gone').toBeDefined()
    expect(studio ? perPostUsd(studio) : 0).toBeNull()
    expect(perPostLadder().some((entry) => entry.name === 'Studio')).toBe(false)
  })

  test('the ladder runs cheapest first and the label matches its ends', () => {
    const ladder = perPostLadder()
    expect(ladder.length).toBeGreaterThan(2)

    const sorted = [...ladder].sort((a, b) => a.usd - b.usd)
    expect(ladder).toEqual(sorted)
    expect(ourRangeLabel()).toBe(`$${sorted[0]?.usd} to $${sorted[sorted.length - 1]?.usd} a post`)
  })

  test('the note names the plan its figure belongs to', () => {
    const suggested = PRICING_TIERS.find((tier) => tier.isSuggested)
    expect(suggested, 'no plan is marked as suggested').toBeDefined()
    if (!suggested) return

    const note = ourRowNote()
    expect(note).toContain(suggested.name)
    expect(note).toContain(`$${perPostUsd(suggested)}`)
  })

  test('admits the pilot is dearer per post rather than hiding it', () => {
    const pilot = PRICING_TIERS.find((tier) => tier.id === 'pilot')
    const growth = PRICING_TIERS.find((tier) => tier.isSuggested)
    expect(pilot && growth, 'the pilot or the suggested plan has gone').toBeTruthy()
    if (!pilot || !growth) return

    const pilotPost = perPostUsd(pilot)
    const growthPost = perPostUsd(growth)
    expect(pilotPost).not.toBeNull()
    expect(growthPost).not.toBeNull()
    expect(pilotPost ?? 0).toBeGreaterThan(growthPost ?? 0)
    expect(ourRowNote().toLowerCase()).toContain('pilot')
  })
})

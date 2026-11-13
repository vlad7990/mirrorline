import { describe, expect, test } from 'vitest'

import {
  DRAFT_LEGAL_LINKS,
  FOOTER_COLUMNS,
  NAV_LINKS,
  NICHE_SCAN,
  allSiteLinks,
  liveLinks,
} from './site-map'

/**
 * The routes that exist today. Every PR that adds one flips `isLive` in
 * site-map.ts and adds it here, so the two cannot drift: a link marked live
 * with no page behind it is a 404 shipped to a preview, which is the failure
 * this file exists to make impossible.
 */
const BUILT_ROUTES = new Set([
  '/',
  '/product',
  '/agents',
  '/pricing',
  '/trust',
  '/privacy',
  '/terms',
  '/sign-in',
  '/sign-up',
  // PR5
  '/how-it-works',
  '/metrics',
  '/compare',
  '/businesses',
  '/individuals',
  '/niche-scan',
  '/niche-scan/sample',
])

describe('site map', () => {
  test('every link marked live points at a route that exists', () => {
    const live = allSiteLinks().filter((link) => link.isLive)

    for (const link of live) {
      expect(BUILT_ROUTES.has(link.href), `${link.href} is marked live but has no page`).toBe(true)
    }
  })

  test('nothing unbuilt is rendered in the nav', () => {
    for (const link of liveLinks(NAV_LINKS)) {
      expect(BUILT_ROUTES.has(link.href)).toBe(true)
    }
  })

  test('the nav follows 16 §4 order once everything is live', () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual([
      'Product',
      'How it works',
      'Metrics',
      'Pricing',
      'Compare',
      'Resources',
    ])
  })

  test('the Niche Scan button keeps the one wording from 14 §3', () => {
    // The same words in the header, the footer and every page CTA. If this
    // ever drifts, the funnel's main button is no longer one button.
    expect(NICHE_SCAN.label).toBe('Get my free Niche Scan')
  })

  test('no link label names an industry', () => {
    // 10_SALES_FOCUS.md §1: no industry pages, ever.
    const industryWords = /coach|clinic|dentist|gym|salon|restaurant|real estate|contractor/i

    for (const link of allSiteLinks()) {
      expect(link.label).not.toMatch(industryWords)
      expect(link.href).not.toMatch(industryWords)
    }
  })

  test('every footer column has a heading and at least one link declared', () => {
    for (const column of FOOTER_COLUMNS) {
      expect(column.heading.length).toBeGreaterThan(0)
      expect(column.links.length).toBeGreaterThan(0)
    }
  })

  test('the draft legal links are live, so the footer is never empty of policy', () => {
    expect(DRAFT_LEGAL_LINKS.every((link) => link.isLive)).toBe(true)
    expect(DRAFT_LEGAL_LINKS.map((link) => link.href)).toEqual(['/privacy', '/terms'])
  })

  test('no href is duplicated within a single footer column', () => {
    for (const column of FOOTER_COLUMNS) {
      const hrefs = column.links.map((link) => link.href)
      expect(new Set(hrefs).size).toBe(hrefs.length)
    }
  })
})

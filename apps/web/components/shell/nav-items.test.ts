/**
 * The sidebar is eight items, and every screen that is not one of them is
 * still reachable.
 *
 * **Both halves matter, and the second is the one that bites.** Trimming a nav
 * is easy; trimming it and orphaning a route leaves a screen that exists,
 * passes its own tests, and cannot be opened. The list ran to eleven for two
 * commits because nothing checked it, so the count is now an assertion and so
 * is each replacement entry point.
 *
 * The entry points are checked by reading the component source for the `href`
 * rather than by rendering. There is no component-test setup in this repo —
 * units are Vitest in Node, browser-level checks are Playwright — and the
 * useful question here is "does a link to this route exist in the tree at
 * all", which is exactly what a missing-link bug looks like. Whether it is
 * clickable is the end-to-end suite's job.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { NAV_ITEMS, isNavItemActive } from './nav-items'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** DESIGN.md "Layout" fixes the count, and 16 §5 did not raise it. */
const SIDEBAR_ITEM_LIMIT = 8

/**
 * Each screen kept out of the nav, and the components that must link to it.
 *
 * Adding a route here is the cost of adding a screen without a nav item: say
 * where it is reached from, or do not ship it.
 */
const REACHED_FROM: readonly (readonly [string, readonly string[]])[] = [
  // A Results tab, plus Home's goal card.
  ['/app/goals', ['../../app/app/(studio)/home/page.tsx', '../../lib/studio/results-tabs.ts']],
  // A Results tab, plus Connected accounts in Settings.
  ['/app/accounts', ['../settings/connected-accounts-card.tsx', '../../lib/studio/results-tabs.ts']],
  // The workspace switcher: the only cross-workspace screen, reached from the
  // control that already asks which brand you are looking at.
  ['/app/portfolio', ['./workspace-switcher.tsx']],
]

function sourceOf(relative: string): string {
  return readFileSync(path.join(HERE, relative), 'utf8')
}

describe('the studio sidebar', () => {
  test('is eight items', () => {
    expect(NAV_ITEMS).toHaveLength(SIDEBAR_ITEM_LIMIT)
  })

  test('is the eight DESIGN.md names, with Trends renamed by 16 §5', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      'Home',
      'Upload',
      'Niche Scan',
      'Calendar',
      'Results',
      'Agents',
      'Brand kit',
      'Settings',
    ])
  })

  test('has no duplicate route', () => {
    const hrefs = NAV_ITEMS.map((item) => item.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('screens kept out of the nav', () => {
  test('are none of them a nav item, or this file is testing nothing', () => {
    const hrefs = new Set(NAV_ITEMS.map((item) => item.href))

    for (const [route] of REACHED_FROM) {
      expect(hrefs.has(route)).toBe(false)
    }
  })

  test('each has at least one link to it somewhere in the tree', () => {
    for (const [route, candidates] of REACHED_FROM) {
      const linked = candidates.filter((relative) => sourceOf(relative).includes(route))

      expect(linked.length, `nothing links to ${route}`).toBeGreaterThan(0)
    }
  })
})

describe('the active nav item', () => {
  const results = NAV_ITEMS.find((item) => item.href === '/app/results')
  const agents = NAV_ITEMS.find((item) => item.href === '/app/agents')

  test('lights up for its own route', () => {
    expect(results).toBeDefined()
    expect(isNavItemActive(results!, '/app/results')).toBe(true)
  })

  test('lights up Results on the two screens it stands in for', () => {
    // Otherwise the reader is on a screen the whole sidebar says they are not.
    expect(isNavItemActive(results!, '/app/goals')).toBe(true)
    expect(isNavItemActive(results!, '/app/accounts')).toBe(true)
  })

  test('claims nothing for Portfolio, which is reached from above the nav', () => {
    for (const item of NAV_ITEMS) {
      expect(isNavItemActive(item, '/app/portfolio')).toBe(false)
    }
  })

  test('does not light up for a route that merely starts with the same string', () => {
    // '/app/agents' must not match '/app/agents-archive'; the guard is the
    // trailing slash in the nested-route check.
    expect(agents).toBeDefined()
    expect(isNavItemActive(agents!, '/app/agents-archive')).toBe(false)
    expect(isNavItemActive(agents!, '/app/agents/trend-scout')).toBe(true)
  })
})

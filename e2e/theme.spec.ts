/**
 * The three-way theme switch: light, dark and system.
 *
 * Contract under test (packages/ui/src/theme-provider.tsx):
 * - the preference is stored under `mirrorline-theme`;
 * - `.dark` on <html> is the single resolved-theme signal;
 * - an inline <head> script applies it before first paint, so the page never
 *   flashes the wrong theme.
 *
 * Note on the no-flash check: the server markup cannot carry the class, because
 * the preference lives in localStorage and the server has never seen it. The
 * honest equivalent is proved two ways below — the bootstrap sits in <head>
 * ahead of every Next.js bundle, and the class still lands when React is
 * prevented from hydrating at all.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  THEME_STORAGE_KEY,
  expectResolvedTheme,
  hasInlineThemeScript,
  readStoredTheme,
  setStoredTheme,
} from './helpers/theme'

onlyProject('chromium', 'The theme contract is viewport-independent.')

/** The sidebar switch is the only visible one on Home. */
const SWITCH_PAGE = '/app/home'

test('light keeps .dark off <html>', async ({ page }) => {
  await page.goto(SWITCH_PAGE)
  await setStoredTheme(page, 'light')
  await page.reload()

  await expectResolvedTheme(page, 'light')
  await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked()
})

test('dark puts .dark on <html>', async ({ page }) => {
  await page.goto(SWITCH_PAGE)
  await setStoredTheme(page, 'dark')
  await page.reload()

  await expectResolvedTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
})

test('system follows prefers-color-scheme in both directions', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto(SWITCH_PAGE)
  await setStoredTheme(page, 'system')
  await page.reload()

  await expect(page.getByRole('radio', { name: 'System' })).toBeChecked()
  await expectResolvedTheme(page, 'dark')

  await page.emulateMedia({ colorScheme: 'light' })
  await expectResolvedTheme(page, 'light')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expectResolvedTheme(page, 'dark')
})

test('the choice survives a reload and a navigation', async ({ page }) => {
  await page.goto(SWITCH_PAGE)
  await expectResolvedTheme(page, 'light')

  await page.getByRole('radio', { name: 'Dark' }).check()
  await expectResolvedTheme(page, 'dark')
  expect(await readStoredTheme(page)).toBe('dark')

  await page.reload()
  await expectResolvedTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()

  // A different route, a different layout: the preference still applies.
  await page.goto('/pricing')
  await expectResolvedTheme(page, 'dark')
})

test('the inline bootstrap is in <head> ahead of every bundle', async ({ request }) => {
  const response = await request.get('/app/home')
  expect(response.status()).toBe(200)
  const html = await response.text()

  expect(hasInlineThemeScript(html), 'no inline theme bootstrap in the document').toBe(true)

  const headEnd = html.indexOf('</head>')
  const scriptAt = html.indexOf(THEME_STORAGE_KEY)
  expect(headEnd, 'document has no </head>').toBeGreaterThan(-1)
  expect(scriptAt, 'theme bootstrap is not inside <head>').toBeLessThan(headEnd)

  // Nothing React ships can have run before it.
  const firstBundleAt = html.indexOf('/_next/static/chunks')
  expect(firstBundleAt, 'no Next.js bundle in the document').toBeGreaterThan(-1)
  expect(scriptAt).toBeLessThan(firstBundleAt)
})

test('no flash: the class lands with React never hydrating', async ({ page }) => {
  await page.goto(SWITCH_PAGE)
  await setStoredTheme(page, 'dark')

  // Block every script Next.js would load. The bootstrap is part of the
  // document, so it still runs; nothing else does. If `.dark` is on <html>
  // after this, only the pre-paint script can have put it there.
  await page.route('**/_next/static/**/*.js', (route) => route.abort())

  await page.goto(SWITCH_PAGE)
  await expectResolvedTheme(page, 'dark')
  await expect(page.locator('html')).toHaveAttribute('style', /color-scheme:\s*dark/)
})

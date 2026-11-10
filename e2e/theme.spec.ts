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
  themeBootstrapScriptTag,
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

  // Keyboard, not a click: the radios are `sr-only` and the visible segment is
  // their label, so the hit target for the input itself is covered. Space on a
  // focused radio is how the control is meant to be driven.
  const darkOption = page.getByRole('radio', { name: 'Dark' })
  await darkOption.focus()
  await page.keyboard.press('Space')

  await expect(darkOption).toBeChecked()
  await expectResolvedTheme(page, 'dark')
  expect(await readStoredTheme(page)).toBe('dark')

  await page.reload()
  await expectResolvedTheme(page, 'dark')
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()

  // A different route, a different layout: the preference still applies.
  await page.goto('/pricing')
  await expectResolvedTheme(page, 'dark')
})

test('the bootstrap is a parser-blocking inline script in <head>', async ({ request }) => {
  const response = await request.get('/app/home')
  expect(response.status()).toBe(200)
  const html = await response.text()

  expect(hasInlineThemeScript(html), 'no inline theme bootstrap in the document').toBe(true)

  const headEnd = html.indexOf('</head>')
  const scriptAt = html.indexOf(THEME_STORAGE_KEY)
  expect(headEnd, 'document has no </head>').toBeGreaterThan(-1)
  expect(scriptAt, 'theme bootstrap is not inside <head>').toBeLessThan(headEnd)

  // Inline and synchronous: the parser stops and runs it before it reaches
  // <body>, so the first paint already has the right class. Next.js emits its
  // own bundles earlier in <head>, but every one of them is `async`, so none
  // of them blocks or beats this.
  const tag = themeBootstrapScriptTag(html)
  expect(tag, 'could not find the bootstrap script tag').not.toBeNull()
  expect(tag).not.toMatch(/\bsrc=/)
  expect(tag).not.toMatch(/\basync\b/)
  expect(tag).not.toMatch(/\bdefer\b/)
  expect(tag).not.toMatch(/type="module"/)

  const bundleTags = html.slice(0, headEnd).match(/<script\b[^>]*\bsrc="\/_next\/[^"]*"[^>]*>/g) ?? []
  expect(bundleTags.length, 'no Next.js bundle in <head>').toBeGreaterThan(0)
  for (const bundleTag of bundleTags) {
    expect(bundleTag, `a blocking bundle could paint before the theme: ${bundleTag}`).toMatch(
      /\basync\b|\bdefer\b|\bnoModule\b/,
    )
  }
})

test('no flash: the class lands with React never hydrating', async ({ page }) => {
  await page.goto(SWITCH_PAGE)
  await setStoredTheme(page, 'dark')

  // Replace every script Next.js would load with an empty file, so React
  // never hydrates. The bootstrap is part of the document, so it still runs.
  // If `.dark` is on <html> after this, only the pre-paint script put it there.
  await page.route(/\/_next\/static\/.*\.js(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  )

  await page.goto(SWITCH_PAGE)
  // Proof that nothing React ships ran: the webpack runtime never registered.
  expect(await page.evaluate(() => 'webpackChunk_N_E' in window)).toBe(false)
  await expectResolvedTheme(page, 'dark')
  await expect(page.locator('html')).toHaveAttribute('style', /color-scheme:\s*dark/)
})

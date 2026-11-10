/**
 * Theme helpers for the end-to-end specs.
 *
 * The app stores the preference under `mirrorline-theme` and an inline script
 * in <head> applies `.dark` to <html> before first paint (see
 * packages/ui/src/theme-provider.tsx). These helpers drive that same contract
 * rather than clicking the segmented control, so a11y.spec.ts and
 * screenshots.spec.ts can set a theme on any route, including ones with no
 * sidebar.
 */

import { expect, type Page } from '@playwright/test'

export const THEME_STORAGE_KEY = 'mirrorline-theme'

export type ThemeName = 'light' | 'dark'

/** Both themes, in the order the sweep and the a11y run walk them. */
export const THEMES: readonly ThemeName[] = ['light', 'dark']

/**
 * Write the preference, then load `path` so the inline script picks it up on
 * the way in. The init script runs on every document in the context, which is
 * what makes the very first navigation already carry the right class.
 */
export async function gotoWithTheme(page: Page, path: string, theme: ThemeName): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        // Private mode: the provider still applies the class after hydration,
        // and that is what the assertions look at.
      }
    },
    [THEME_STORAGE_KEY, theme] as const,
  )

  await page.goto(path)
  await expectResolvedTheme(page, theme)
}

/** Set the stored preference on an already-loaded page. */
export async function setStoredTheme(page: Page, value: string): Promise<void> {
  await page.evaluate(
    ([key, next]) => window.localStorage.setItem(key, next),
    [THEME_STORAGE_KEY, value] as const,
  )
}

/** What the app currently has in storage, or null when nothing is stored. */
export async function readStoredTheme(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), THEME_STORAGE_KEY)
}

/** Web-first: waits for <html> to carry (or drop) the `dark` class. */
export async function expectResolvedTheme(page: Page, theme: ThemeName): Promise<void> {
  const html = page.locator('html')
  if (theme === 'dark') {
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/)
  } else {
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/)
  }
}

/**
 * The `class` attribute of <html> in a raw HTML response, before any
 * JavaScript runs. Used to prove the no-flash inline script is doing its job.
 */
export function initialHtmlClass(html: string): string {
  const match = /<html[^>]*\sclass="([^"]*)"/.exec(html)
  return match?.[1] ?? ''
}

/** True when the document's own <head> inlines the theme bootstrap script. */
export function hasInlineThemeScript(html: string): boolean {
  return html.includes(THEME_STORAGE_KEY) && html.includes('classList.toggle')
}

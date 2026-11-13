/**
 * The reference sweep: one full-page PNG per screen, per viewport, per theme.
 *
 * Output lands in docs/screens-built/ as `<slug>--<width>--<theme>.png`, which
 * is what a human compares against docs/design/claude-design/screens/*.png.
 * Animations are disabled and nothing is masked, so the files are a faithful
 * picture of the real screen.
 */

import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { ALL_SCREENS } from './helpers/routes'
import { THEME_STORAGE_KEY, THEMES, expectResolvedTheme } from './helpers/theme'

onlyProject('screenshots', 'The sweep sets its own viewports; one project is enough.')

/**
 * Defaults to the rolling reference set. `SCREENSHOT_OUT_DIR` redirects the
 * sweep elsewhere — used to capture a dated "before" baseline (for example
 * `docs/screens-built/before-v4`) without overwriting the current references,
 * which are what the next run gets compared against.
 */
const OUTPUT_DIRECTORY = process.env.SCREENSHOT_OUT_DIR
  ? path.resolve(process.env.SCREENSHOT_OUT_DIR)
  : path.resolve(__dirname, '..', 'docs', 'screens-built')

interface Viewport {
  readonly width: number
  readonly height: number
}

/** The two reference viewports DESIGN.md fixes. */
const VIEWPORTS: readonly Viewport[] = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]

/** The sweep is slow by nature: 20 screens per combination, four combinations. */
const SWEEP_TIMEOUT_MS = 300_000

test.beforeAll(() => {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true })
})

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`capture every screen at ${viewport.width}px in ${theme}`, async ({ page }) => {
      test.setTimeout(SWEEP_TIMEOUT_MS)

      await page.setViewportSize(viewport)
      // Added once for the whole run, so each navigation already boots into
      // the right theme and no screenshot catches a repaint.
      await page.addInitScript(
        ([key, value]) => {
          try {
            window.localStorage.setItem(key, value)
          } catch {
            // Storage unavailable: the provider still resolves a theme.
          }
        },
        [THEME_STORAGE_KEY, theme] as const,
      )

      for (const screen of ALL_SCREENS) {
        await page.goto(screen.path)
        await expect(page.getByRole('heading', { level: 1, name: screen.h1 })).toBeVisible()
        await expectResolvedTheme(page, theme)
        // Webfonts shift metrics; waiting on them keeps the PNGs comparable.
        await page.evaluate(async () => {
          await document.fonts.ready
        })

        await page.screenshot({
          path: path.join(OUTPUT_DIRECTORY, `${screen.slug}--${viewport.width}--${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  }
}

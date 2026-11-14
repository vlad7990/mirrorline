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

/**
 * A comma-separated list of slugs, when only some screens are wanted.
 *
 * The companion to `SCREENSHOT_OUT_DIR`, and added for the same reason. The
 * inner-page work (19 v2) rebuilds nine of the twenty-odd screens across four
 * pull requests, and each one owes a before and an after. Sweeping all twenty
 * every time would write four-fifths of the files to prove nothing changed in
 * them, which is both slow and a lot of unreviewable diff.
 *
 * Unset is the old behaviour: every screen. An unknown slug is a typo rather
 * than an empty selection, so the sweep stops instead of quietly capturing
 * nothing — a silent no-op here looks exactly like a passing run.
 */
const SCREEN_FILTER: readonly string[] =
  process.env.SCREENSHOT_ONLY?.split(',')
    .map((slug) => slug.trim())
    .filter((slug) => slug !== '') ?? []

if (SCREEN_FILTER.length > 0) {
  const known = new Set(ALL_SCREENS.map((screen) => screen.slug))
  const unknown = SCREEN_FILTER.filter((slug) => !known.has(slug))
  if (unknown.length > 0) {
    throw new Error(
      `SCREENSHOT_ONLY names ${unknown.length} slug(s) that are not in the route table: ` +
        `${unknown.join(', ')}. The slugs are the screenshot file-name stems in e2e/helpers/routes.ts.`,
    )
  }
}

const SCREENS =
  SCREEN_FILTER.length === 0
    ? ALL_SCREENS
    : ALL_SCREENS.filter((screen) => SCREEN_FILTER.includes(screen.slug))

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

      for (const screen of SCREENS) {
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

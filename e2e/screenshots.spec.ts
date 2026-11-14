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

/**
 * Long enough for `useCountUp` to land on its figure.
 *
 * 1600ms is the count itself (`lib/motion/use-count-up.ts`, from the
 * handoff's website motion system); the rest is a frame's margin. Not imported
 * from the hook because that module is `'use client'` and does not export the
 * constant — so this is a deliberate copy, and the comment is the link
 * between them.
 */
const COUNT_UP_SETTLE_MS = 1_800

/**
 * How long to wait for every visible image before photographing anyway.
 *
 * Generous, because the point is a truthful picture, and bounded, because one
 * page's slow optimiser request must not cost the whole sweep its 300s
 * budget.
 */
const IMAGE_SETTLE_TIMEOUT_MS = 20_000

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

        /*
         * Walk the page before capturing, so lazily-loaded images are really
         * there in the PNG.
         *
         * `fullPage` stretches the capture, it does not scroll the page — the
         * viewport never moves, so a `loading="lazy"` image below the fold
         * never intersects and never starts loading. The screenshot then shows
         * an empty frame where the picture is, which is worse than a missing
         * file: it looks like a layout bug in a reference image that is
         * supposed to be evidence.
         *
         * This cost an investigation on the first page that put a screenshot
         * below the fold (19 v2's inner pages). Nothing was wrong with the
         * page; the camera was lying.
         */
        await page.evaluate(async () => {
          const step = window.innerHeight
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y)
            await new Promise((resolve) => setTimeout(resolve, 120))
          }
          window.scrollTo(0, 0)
        })
        /*
         * Decode, not just fetch: an image that has arrived but not painted is
         * still a blank frame in the capture.
         *
         * **Bounded, and it does not fail the sweep.** The first unbounded
         * version hung for the full 300s test timeout on the home page, whose
         * parallax backdrop asks the image optimiser for `w=3840` re-encodes
         * of 640px-wide reel frames — those requests are still in flight long
         * after everything else has settled. That is a real finding about the
         * home page and it belongs to the home page, not to the camera: a
         * sweep that cannot finish produces no evidence at all, which is a
         * worse outcome than a sweep that records what it saw.
         *
         * So it waits, and if something is still loading it says which and
         * photographs the page anyway. The annotation is in the report and the
         * gap is in the PNG; neither is silent.
         */
        const unsettled = await page
          .waitForFunction(
            () =>
              [...document.querySelectorAll('img')]
                .filter((image) => getComputedStyle(image).display !== 'none')
                .every((image) => image.complete),
            undefined,
            { timeout: IMAGE_SETTLE_TIMEOUT_MS },
          )
          .then(() => [] as string[])
          .catch(async () =>
            page.evaluate(() =>
              [...document.querySelectorAll('img')]
                .filter((image) => getComputedStyle(image).display !== 'none' && !image.complete)
                .map((image) => image.currentSrc || image.src),
            ),
          )

        if (unsettled.length > 0) {
          test.info().annotations.push({
            type: 'images-still-loading',
            description: `${screen.slug} (${viewport.width}px, ${theme}): ${unsettled.join(', ')}`,
          })
        }

        /*
         * Let the counting figures finish.
         *
         * `animations: 'disabled'` freezes CSS animations and has no opinion
         * about JavaScript. `useCountUp` interpolates on
         * `requestAnimationFrame`, so the scroll above starts every counter on
         * the page and the capture lands wherever they happen to be — which
         * put "12 posts · 27061 views" into a reference image whose fixture
         * says 21 and 48300. A reference PNG showing numbers the product does
         * not show is worse than no reference PNG.
         *
         * Waiting rather than stubbing, because the stable alternative — poll
         * until the page's text stops changing — never settles on the home
         * page, whose hero line cycles on purpose (D25).
         */
        await page.waitForTimeout(COUNT_UP_SETTLE_MS)

        await page.screenshot({
          path: path.join(OUTPUT_DIRECTORY, `${screen.slug}--${viewport.width}--${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  }
}

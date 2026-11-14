/**
 * The screen recordings spec 17 §5 asks for: 10–15s of each motion-v2 change,
 * desktop and mobile, written to docs/screens-built/motion-v2/.
 *
 * **Deliberately not part of the normal suite.** It asserts almost nothing —
 * the output is a video for a human to watch — and it costs a quarter of a
 * minute per clip. Skipped unless `MOTION_RECORD` is set, so `pnpm test:e2e`
 * stays fast and a recording failure can never read as a product failure:
 *
 *     MOTION_RECORD=1 pnpm exec playwright test e2e/recordings.spec.ts \
 *       --project=chromium --project=mobile
 *
 * Scroll-driven motion cannot be captured by sitting still, so each clip
 * drives the page the way a reader would: short steps with a pause between
 * them. `scrollBy({ behavior: 'smooth' })` would hand the pacing to the
 * browser and make the clip length unpredictable, so the steps are explicit.
 *
 * `screenshots.spec.ts` is the still-image sweep and disables animation. This
 * is its opposite number and must not be folded into it.
 */

import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test, type Page, type TestInfo } from '@playwright/test'

const IS_RECORDING = Boolean(process.env.MOTION_RECORD)
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'screens-built', 'motion-v2')

/** ~12s of scrolling: 24 steps at 500ms. Inside spec 17's 10–15s window. */
const SCROLL_STEPS = 24
const STEP_PAUSE_MS = 500

/**
 * Videos are only finalised once the page closes, so the save happens after
 * the close rather than at the end of the body. The project name is in the
 * filename because the same clip is recorded at both viewports.
 */
async function save(page: Page, testInfo: TestInfo, clip: string) {
  const video = page.video()
  if (!video) throw new Error('no video: run with --project and video enabled')

  mkdirSync(OUTPUT_DIR, { recursive: true })
  await page.close()
  await video.saveAs(path.join(OUTPUT_DIR, `${clip}-${testInfo.project.name}.webm`))
}

// Top-level, which Playwright requires: `test.use` inside a describe is a
// runtime error, not a scoping nicety. Harmless for the rest of the suite
// because the tests below are the only ones in this file and they skip
// unless MOTION_RECORD is set.
test.use({ video: { mode: 'on', size: { width: 1280, height: 800 } } })

test.describe('motion-v2 recordings', () => {
  test.skip(!IS_RECORDING, 'set MOTION_RECORD=1 to record; see the file header')

  // Every step is a wait, so the default timeout cannot cover a clip plus the
  // page load in front of it.
  test.setTimeout(120_000)

  test('home, scrolled end to end', async ({ page }, testInfo) => {
    await page.goto('/')
    // The hero must have settled first, or the opening second of the clip is a
    // layout rather than the motion it exists to show.
    await expect(page.locator('h1').first()).toBeVisible()

    // One assertion, so a clip of a broken page fails instead of shipping.
    // The rails are what this PR added and they are on every section.
    expect(await page.locator('.section-rail').count()).toBeGreaterThan(5)

    const step = await page.evaluate(() => Math.round(window.innerHeight * 0.55))
    for (let index = 0; index < SCROLL_STEPS; index += 1) {
      await page.mouse.wheel(0, step)
      await page.waitForTimeout(STEP_PAUSE_MS)
    }

    await save(page, testInfo, 'home-rails-and-reveals')
  })

  test('the hero, settling and then scrolled', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()

    // Hold on the hero first: the headline's line reveal and the inset
    // preview's first loop both happen on load, and a clip that starts
    // scrolling immediately misses the half of this PR that is not parallax.
    await page.waitForTimeout(3_500)

    // Then a slow drift down, which is where the three depths separate.
    for (let index = 0; index < 18; index += 1) {
      await page.mouse.wheel(0, 60)
      await page.waitForTimeout(430)
    }

    await save(page, testInfo, 'hero-depth-and-headline')
  })

  test('the Output sequence, start to finish', async ({ page }, testInfo) => {
    await page.goto('/')

    const stage = page.locator('.output-stage')
    await stage.scrollIntoViewIfNeeded()
    // GSAP arms the stage a tick after paint on a wide screen. On the mobile
    // project it never arms, and the clip is the snap row instead — which is
    // the mobile version 17 §3 asks to see.
    await page.waitForTimeout(1_200)

    // Smaller steps than the home clip: this is 250vh of pinned sequence, and
    // stepping it at the page's pace would skip whole stages between frames.
    for (let index = 0; index < 30; index += 1) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(400)
    }

    // A clip of a broken section is worse than no clip, so the end state is
    // asserted: every verdict legible by the time the sequence has run.
    await expect(page.locator('[data-cut-frame] [data-status-chip]').first()).toBeVisible()

    await save(page, testInfo, 'output-multiply-sequence')
  })

  test('the argument sections and the metrics preview', async ({ page }, testInfo) => {
    await page.goto('/')

    // Start at the 2026 cards and run through the contrast rows, the recipe
    // and the metrics band — the four effects of PR4 in the order a reader
    // meets them.
    const stack = page.locator('.stack-cards')
    await stack.scrollIntoViewIfNeeded()
    await page.waitForTimeout(700)

    for (let index = 0; index < 26; index += 1) {
      await page.mouse.wheel(0, 150)
      await page.waitForTimeout(450)
    }

    await save(page, testInfo, 'argument-and-metrics')
  })

  test('the account picker, switching', async ({ page }, testInfo) => {
    await page.goto('/')

    const track = page.locator('.choice-track').first()
    await track.scrollIntoViewIfNeeded()
    await expect(track).toHaveAttribute('data-hydrated', 'true')

    const options = track.getByRole('radio')
    // Back and forth, slowly enough that the pill is seen travelling rather
    // than teleporting between two frames.
    for (let index = 0; index < 8; index += 1) {
      await options.nth(index % 2).click()
      await page.waitForTimeout(1_200)
    }

    await save(page, testInfo, 'account-picker-pill')
  })
})

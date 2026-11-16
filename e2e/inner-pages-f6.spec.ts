/**
 * The F6 pages, asserted on the rendered page rather than in a component file.
 *
 * 19 v2's acceptance rule — "every ★ exists on its page, and the page's own
 * e2e test asserts it" — applied to the eleven pages F1–F5 left on the old
 * kit. The ★ list these check against is 19 v3.
 *
 * **One of these assertions is about the budget rather than the design**, and
 * it is here rather than in a unit test because it is only true of the page
 * the browser builds: one `priority` image and no `<video>` is a claim about
 * the document, and a component can keep its promise while a page that
 * renders it twice breaks the page's.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'these are content assertions; responsive.spec.ts owns 390px')

/** Same device as `page-gaps.spec.ts`: a section is its labelled heading. */
async function sectionById(page: Page, headingId: string) {
  const section = page.locator(`section[aria-labelledby="${headingId}"]`)
  await expect(section).toHaveCount(1)
  await expect(section.locator(`#${headingId}`)).toBeVisible()
  return section
}

/** The two audience pages differ in content and not in shape (16 §4). */
const AUDIENCE_PAGES = [
  { path: '/businesses', eyebrow: 'For businesses', stages: 2 },
  { path: '/individuals', eyebrow: 'For individuals', stages: 2 },
] as const

for (const audience of AUDIENCE_PAGES) {
  test.describe(audience.path, () => {
    test('opens on a frame wall that says what the frames are', async ({ page }) => {
      await page.goto(audience.path)

      // The hero is the F1 kit's rather than the old text hero: a full-bleed
      // backdrop of samples, and a label under it naming them as ours rather
      // than a client's. The label is the half that matters — a wall of
      // unlabelled video frames on a marketing page is exactly the claim
      // non-negotiable 7 exists to stop.
      const hero = page.locator('main section').first()
      await expect(hero.getByText(audience.eyebrow)).toBeVisible()
      await expect(hero).toContainText('AI-generated samples of our own output')
      await expect(hero).toContainText('not a client')

      // The corner card, with its own label on the frame.
      await expect(hero.getByText('AI-generated sample').first()).toBeVisible()
    })

    test('draws a sample week per account stage, and describes it', async ({ page }) => {
      await page.goto(audience.path)
      const section = await sectionById(page, 'stages-heading')

      // One strip per stage, each described for a reader who cannot see it.
      const weeks = section.locator('figcaption', { hasText: 'a sample week at' })
      await expect(weeks).toHaveCount(audience.stages)

      // The cadence sentence and the picture come from one pair of numbers,
      // so the caption repeats the line printed above it. If those ever
      // disagree, one of them was typed.
      const cadences = await section.locator('dd', { hasText: 'posts a week' }).allInnerTexts()
      expect(cadences).toHaveLength(audience.stages)
      for (const cadence of cadences) {
        await expect(section.locator('figcaption', { hasText: cadence })).toHaveCount(1)
      }
    })

    test('closes with its own CTA, not the block every page used to share', async ({ page }) => {
      await page.goto(audience.path)

      // The page's own framing (F1's `PAGE_CTAS`)...
      await expect(page.getByRole('heading', { name: /Monday|fortnight/ })).toBeVisible()
      // ...and never the shared headline it replaced.
      await expect(page.locator('main')).not.toContainText('Record once. Show up everywhere.')

      // The offer itself is appended from one place, so the terms read the
      // same on every page that states them.
      await expect(page.locator('main')).toContainText('$750')
    })

    test('holds the per-page image budget', async ({ page }) => {
      await page.goto(audience.path)

      // 19 v2 §image budget: one priority image, at most twelve lazy ones,
      // and no video at all on a page like this.
      await expect(page.locator('main img:not([loading="lazy"])')).toHaveCount(1)

      const lazy = await page.locator('main img[loading="lazy"]').count()
      expect(lazy).toBeLessThanOrEqual(12)

      await expect(page.locator('main video')).toHaveCount(0)
    })

    test('names no industry anywhere', async ({ page }) => {
      await page.goto(audience.path)

      // 16 §1, and the reason these two pages exist at all: they segment by
      // account type, never by trade. The sample *frames* vary by trade on
      // purpose; the *copy* must not, which is what this checks.
      const copy = await page.locator('main').innerText()
      expect(copy).not.toMatch(/\bfor (dentists|realtors|restaurants|gyms|lawyers|clinics)\b/i)
    })
  })
}

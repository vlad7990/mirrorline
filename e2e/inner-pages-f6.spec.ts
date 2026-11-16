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

/**
 * Every page F6 moves onto the kit, whatever else it carries.
 *
 * `videos` is the page's ceiling, and anything above 19 v2's one carries a
 * written reason — the device `youtube-claims.test.ts` uses, for the same
 * argument: an exception a reader can see is a different thing from a rule
 * quietly relaxed. A reason short enough to be a shrug is not a reason, so
 * the test measures it.
 */
const KIT_PAGES = [
  { path: '/businesses', videos: 1 },
  { path: '/individuals', videos: 1 },
  {
    path: '/agents',
    videos: 3,
    reason:
      'The gate panel shows the three cuts Compliance actually held, each with its own status chip and reason. They are the subject of the section rather than decoration, so they cannot become a hover-loop still the way a reel strip can — and they sit well below the fold, where D50’s hero-video measurement does not apply. Revisit if /agents ever joins the Lighthouse gate.',
  },
  { path: '/trust', videos: 1 },
  { path: '/about', videos: 1 },
  { path: '/contact', videos: 1 },
  { path: '/faq', videos: 1 },
  { path: '/changelog', videos: 1 },
  {
    path: '/niche-scan/sample',
    videos: 3,
    reason:
      'The three sample recipes each carry a frame of what that recipe produces, which is the page: a recipe card with no output beside it is the thing /niche-scan/sample exists to stop being. They are below the fold and the page is not on the Lighthouse gate. Revisit if it ever joins it.',
  },
] as const

for (const { path, videos, ...rest } of KIT_PAGES) {
  test.describe(`${path} · the kit`, () => {
    test('has the frame-wall hero and its label', async ({ page }) => {
      await page.goto(path)
      const hero = page.locator('main section').first()

      await expect(hero).toContainText('AI-generated samples of our own output')
      await expect(hero.getByText('AI-generated sample').first()).toBeVisible()
    })

    test('holds the per-page image budget', async ({ page }) => {
      await page.goto(path)

      await expect(page.locator('main img:not([loading="lazy"])')).toHaveCount(1)
      expect(await page.locator('main img[loading="lazy"]').count()).toBeLessThanOrEqual(12)
      expect(await page.locator('main video').count()).toBeLessThanOrEqual(videos)

      // A page over 19 v2's one video owes an explanation, and one long
      // enough to have been thought about.
      const reason = 'reason' in rest ? rest.reason : ''
      if (videos > 1) expect(reason.length).toBeGreaterThan(80)
    })

    test('closes on its own words, with the terms appended from one place', async ({ page }) => {
      await page.goto(path)

      await expect(page.locator('main')).not.toContainText('Record once. Show up everywhere.')
      await expect(page.locator('main')).toContainText('$750')
    })
  })
}

test.describe('/agents', () => {
  test('carries the hand-off order once, in a list, and not twice', async ({ page }) => {
    await page.goto('/agents')
    const section = await sectionById(page, 'agents-heading')

    // 19 v3 ★3 asked for home's scroll-lit spine here and was struck the day
    // it was written: the cards below already introduce the seven in order,
    // so the spine made the page the same seven agents twice and 10,355px
    // long. The order lives in the <ol>, which is what assistive technology
    // reads anyway — and this asserts the duplicate has not come back.
    await expect(section.locator('ol')).toHaveCount(1)
    await expect(page.locator('main [data-agent-spine-fill]')).toHaveCount(0)
    await expect(section).toContainText('Compliance')
  })

  test('shows a day of the log, with costs where there are costs', async ({ page }) => {
    await page.goto('/agents')
    const section = await sectionById(page, 'log-heading')

    // ★4, and the honest half: a step that only decides shows an em dash
    // rather than a made-up figure, and the whole thing says it is sample.
    const entries = section.locator('li')
    expect(await entries.count()).toBeGreaterThan(4)
    await expect(section).toContainText('Sample data')
    await expect(section.getByText('—').first()).toBeVisible()
    await expect(section.getByText(/^\$\d/).first()).toBeVisible()
  })
})

test.describe('/trust', () => {
  test('runs the Originality Gate on a real remake, with the limit stated', async ({ page }) => {
    await page.goto('/trust')
    const section = await sectionById(page, 'gate-demo-heading')

    // ★3. The honest half is the threshold: a similarity meter with no limit
    // beside it is a number that cannot be wrong.
    await expect(section).toContainText('30%')
    await expect(section).toContainText('Sample data')
  })

  test('draws where the files go, and ends the list', async ({ page }) => {
    await page.goto('/trust')
    const section = await sectionById(page, 'data-heading')

    // ★5, and the claim the section actually makes — four hops and no fifth.
    await expect(section.locator('ol > li')).toHaveCount(4)
    await expect(section).toContainText('Through the official Instagram, TikTok and YouTube APIs')
    await expect(section).toContainText('never hold your platform password')
  })

  test('shows an AI label on a reel, where a client would meet it', async ({ page }) => {
    await page.goto('/trust')

    // ★4, which already existed inside the rules rather than as a section of
    // its own — asserted here so a tidy-up cannot remove it silently.
    await expect(page.locator('main').getByText('AI scene').first()).toBeVisible()
  })
})

/**
 * The reading pages: /legal/* and /accessibility.
 *
 * These assert three absences as well as two presences, because the absences
 * are the design (19 v3 ★ F6d). A closing CTA creeping back onto the privacy
 * notice is exactly the kind of change that looks like an improvement in a
 * diff and is wrong on the page.
 */
const DOC_PAGES = [
  '/accessibility',
  '/legal/acceptable-use',
  '/legal/ai-use',
  '/legal/cancellation-refunds',
  '/legal/cookies',
] as const

for (const path of DOC_PAGES) {
  test.describe(`${path} · reading layout`, () => {
    test('has a contents list whose links reach real headings', async ({ page }) => {
      await page.goto(path)
      const toc = page.locator('nav[aria-labelledby="toc-heading"]')
      await expect(toc).toHaveCount(1)

      // Every anchor resolves to a heading that exists. A table of contents
      // with a dead link is worse than none: it tells the reader the section
      // is there.
      const hrefs = await toc.locator('a').evaluateAll((as) =>
        as.map((a) => a.getAttribute('href') ?? ''),
      )
      expect(hrefs.length).toBeGreaterThan(2)
      for (const href of hrefs) {
        await expect(page.locator(href)).toHaveCount(1)
      }
    })

    test('states when it was written, and not when it was built', async ({ page }) => {
      await page.goto(path)

      // ★3. The date is the document's own string, so it reads as a date
      // somebody chose rather than today's.
      await expect(page.locator('main')).toContainText('Last updated')
      await expect(page.locator('main')).toContainText('9 November 2026')
    })

    test('sells nothing and shows nothing', async ({ page }) => {
      await page.goto(path)
      const main = page.locator('main')

      // No closing CTA — the old `SiteCta` sat at the foot of every one of
      // these, asking the reader to buy while they were still reading the
      // terms.
      await expect(main).not.toContainText('Record once. Show up everywhere.')
      await expect(main).not.toContainText('$750')
      // No reels, no frame wall — and no hero room either. The first version
      // of this port kept `PageHero`, which draws `HeroBackdrop`
      // unconditionally, so the label sat on the privacy notice describing a
      // photograph the page should not have had. Both labels are checked,
      // because there is one per hero variant and either would mean a
      // picture came back.
      await expect(main.locator('video')).toHaveCount(0)
      await expect(main).not.toContainText('AI-generated samples of our own output')
      await expect(main).not.toContainText('The room behind this is an AI-generated image')
    })
  })
}

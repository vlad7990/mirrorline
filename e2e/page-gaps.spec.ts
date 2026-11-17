/**
 * The sections the gap-fill added, asserted on the rendered pages.
 *
 * 19 v2's acceptance rule is that every required section "exists on its page,
 * and the page's own e2e test asserts it". These sections come from 16 §4 and
 * 11 §2 rather than from 19's ★ list, and they get the same treatment —
 * because a section that exists only in a component file is a section one
 * careless import removes.
 *
 * Each test asserts the **honest** half of its section as well as its
 * presence: the whole band on the cost table rather than only the table, the
 * TikTok caveat rather than only the TikTok phone, the Planned label rather
 * than only the integrations list. Those are the parts a redesign quietly
 * loses.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'these are content assertions; responsive.spec.ts owns 390px')

/**
 * A section by the heading it points at, never by the words inside it.
 *
 * `locator('section', { hasText: … })` was the first attempt and it picked
 * the wrong section twice: `/how-it-works` says "about fifteen minutes" in
 * its hero as well as in the section about them, and `hasText` matches
 * ancestors and earlier siblings alike. Every section these tests care about
 * labels itself with `aria-labelledby`, which is exactly one element.
 */
async function sectionById(page: Page, headingId: string) {
  const section = page.locator(`section[aria-labelledby="${headingId}"]`)
  await expect(section).toHaveCount(1)
  await expect(section.locator(`#${headingId}`)).toBeVisible()
  return section
}

test.describe('/pricing', () => {
  test('compares the cost of the other routes, in categories and whole ranges', async ({
    page,
  }) => {
    await page.goto('/pricing')
    const section = await sectionById(page, 'cost-heading')

    // Every route from 11 §2a, by category.
    for (const route of [
      'A freelance editor',
      'A per-clip agency',
      'A clip subscription',
      'A full-service agency',
      'Hiring for it',
    ]) {
      await expect(section.getByText(route, { exact: true })).toBeVisible()
    }

    // The whole band, including the end that is cheaper than we are.
    await expect(section.getByText('$20–$75 a clip')).toBeVisible()
    await expect(section.getByText('$2,000–$5,000 a month')).toBeVisible()

    // Our own figure, and the fact that it is arithmetic rather than a claim.
    await expect(section).toContainText('a post')
    await expect(section).toContainText('divided by the posts it delivers')

    // Categories only: no brand anywhere in the section.
    await expect(section).not.toContainText(/opus ?clip|submagic|vizard|descript/i)
  })

  test('makes the four billing promises, and links to the page that binds', async ({ page }) => {
    await page.goto('/pricing')
    const section = await sectionById(page, 'billing-heading')
    for (const promise of [
      'No credits',
      'Cancel in one click',
      'Every file stays yours',
      'No setup fee',
    ]) {
      await expect(section.getByRole('heading', { name: promise })).toBeVisible()
    }

    const link = section.getByRole('link', { name: /cancellation and refunds/i })
    await expect(link).toHaveAttribute('href', '/legal/cancellation-refunds')
  })

  test('shows the one add-on, and that it cannot be bought yet (PR D)', async ({ page }) => {
    await page.goto('/pricing')
    const section = await sectionById(page, 'addon-heading')

    // What it is and what it costs. 09 §11 is the only place the figure is
    // written down; this asserts the page renders that figure rather than a
    // second one typed here.
    await expect(section.getByRole('heading', { name: 'Long-form YouTube' })).toBeVisible()
    await expect(section.getByText('$600', { exact: true })).toBeVisible()

    // The honest half, which is the whole reason 19 v2's objection no longer
    // applies — asserted word for word, because a paraphrase is the failure
    // mode here. The same sentence appears on /app/calendar for TikTok, and
    // `platform-limits.test.ts` holds the two together.
    await expect(
      section.getByText('YouTube posts stay private until our app is approved.'),
    ).toBeVisible()

    // A waitlist rather than a purchase. 09 §11: nothing on the site may
    // imply it can be bought today.
    await expect(section.getByText('Waitlist', { exact: true })).toBeVisible()
    await expect(section.getByRole('button', { name: /buy|start|subscribe/i })).toHaveCount(0)

    // The limit that decides whether it is for you, in the list rather than
    // in a footnote under it.
    await expect(section).toContainText(/you send/i)
  })
})

test.describe('/product', () => {
  test('shows where posts go, and says the awkward thing about TikTok', async ({ page }) => {
    await page.goto('/product')
    const section = await sectionById(page, 'publishing-heading')
    for (const platform of ['Instagram Reels', 'TikTok', 'YouTube Shorts']) {
      await expect(section.getByRole('heading', { name: platform })).toBeVisible()
    }

    // Official APIs, non-negotiable 3, said three times because it is true
    // three times.
    await expect(section.getByText(/Official Instagram API/)).toBeVisible()
    await expect(section.getByText(/Official TikTok API/)).toBeVisible()
    await expect(section.getByText(/Official YouTube Data API/)).toBeVisible()

    // The caveat 09 §5 insists on, next to the claim it qualifies.
    await expect(section).toContainText(/private until TikTok has audited/i)

    // Never-do list, and the planned integrations labelled as planned.
    await expect(section).toContainText('No device automation')
    await expect(section.getByText('Planned').first()).toBeVisible()
    await expect(section.getByText('Built').first()).toBeVisible()
  })

  test('answers the five questions a tour leaves open', async ({ page }) => {
    await page.goto('/product')
    const faq = await sectionById(page, 'product-faq-heading')
    await expect(faq.getByRole('button', { name: /What if I have no footage/ })).toBeVisible()
    await expect(faq.getByRole('button', { name: /Who presses go/ })).toBeVisible()
  })
})

test.describe('/how-it-works', () => {
  test('itemises the fifteen minutes rather than claiming them', async ({ page }) => {
    await page.goto('/how-it-works')
    const section = await sectionById(page, 'effort-heading')
    await expect(section.getByText('8 min')).toBeVisible()
    await expect(section.getByText('15 min')).toBeVisible()
    await expect(section).toContainText('Approve the week')
  })

  test('splits the work from the decisions', async ({ page }) => {
    await page.goto('/how-it-works')
    const section = await sectionById(page, 'division-heading')
    await expect(section).toContainText('compliance gate')
    await expect(section).toContainText(/Approve the week/i)
  })

  test('answers the first fortnight before anyone has to ask', async ({ page }) => {
    await page.goto('/how-it-works')
    const faq = await sectionById(page, 'onboarding-faq-heading')
    await expect(
      faq.getByRole('button', { name: /What do you need from me on day one/ }),
    ).toBeVisible()
  })
})

test.describe('/metrics', () => {
  test('shows one account beside the portfolio, and refuses to average them', async ({ page }) => {
    await page.goto('/metrics')
    const section = await sectionById(page, 'views-heading')
    await expect(section.getByRole('heading', { name: 'The portfolio view' })).toBeVisible()
    await expect(section.getByText('Scale plan')).toBeVisible()
    await expect(section.getByText('Sample data')).toBeVisible()

    // The honesty rule this section exists to state.
    await expect(section).toContainText('Nothing is averaged across brands')
  })
})

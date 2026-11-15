/**
 * The F5 pages, and the promises only a browser can check.
 *
 * 19 v2 §acceptance asks that "every ★ exists on its page, and the page's own
 * e2e test asserts it". Most of those ★s are structure, and structure is
 * already covered: routes.spec.ts asserts the single `<h1>`, a11y.spec.ts
 * sweeps both themes, responsive.spec.ts checks 390px and the unit suite
 * asserts the content rules. What is left are the claims about *behaviour*,
 * each of which would survive every one of those checks while being false:
 *
 *   1. The category filter works with JavaScript off (★3). A filter built
 *      from links looks identical to one built from buttons until scripting
 *      is turned off, and at that point one of them stops working.
 *   2. The newsletter form sends nothing (★5). The page says so; a request
 *      count is what makes that a fact rather than copy.
 *   3. The failed sign-in does not say which half was wrong (★2). A message
 *      naming the password is a one-word edit away and reads perfectly well.
 *   4. The forgotten-password state exists and is reachable (★3).
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'One engine is enough for behaviour that is not rendering.')

/* -------------------------------------------------------------------------- */
/* /resources                                                                  */
/* -------------------------------------------------------------------------- */

test.describe('/resources', () => {
  test('the category filter narrows the list, and the URL carries the choice', async ({ page }) => {
    await page.goto('/resources')

    const all = page.getByRole('list', { name: 'All articles' })
    await expect(all.getByRole('listitem')).toHaveCount(6)

    await page.getByRole('link', { name: 'Platform rules', exact: true }).click()

    await expect(page).toHaveURL(/category=rules/)
    const filtered = page.getByRole('list', { name: 'Articles on platform rules' })
    await expect(filtered.getByRole('listitem')).toHaveCount(2)
  })

  /**
   * The point of building the filter out of links rather than buttons.
   *
   * A fresh context with scripting off, so what is asserted is the server's
   * answer and nothing else — no hydration, no client router, no handlers.
   */
  test('the filter still works with JavaScript off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/resources?category=measuring')

    const filtered = page.getByRole('list', { name: 'Articles on measuring' })
    await expect(filtered.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Measuring', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await context.close()
  })

  test('an unknown category shows the whole library rather than an empty page', async ({
    page,
  }) => {
    await page.goto('/resources?category=not-a-category')

    await expect(
      page.getByRole('list', { name: 'All articles' }).getByRole('listitem'),
    ).toHaveCount(6)
  })

  test('the templates and the glossary are on the page, not offered by email', async ({ page }) => {
    await page.goto('/resources')

    // The sheets themselves, rather than a card describing them.
    await expect(page.getByRole('list', { name: 'Templates you can copy' })).toBeVisible()
    await expect(page.getByText('Idea, in one sentence: ______')).toBeVisible()

    // A definition list, which is what lets a screen reader move term to term.
    // Located by tag rather than by role: `dt` carries the `term` role, but
    // its accessible name is not computed from its own content, so
    // `getByRole('term', { name })` matches nothing at all.
    await expect(page.locator('dt', { hasText: 'Three-second hold' })).toBeVisible()
  })

  test('the newsletter needs consent before it will do anything', async ({ page }) => {
    await page.goto('/resources')

    await page.getByLabel('Email', { exact: true }).fill('someone@example.org')
    await page.getByRole('button', { name: 'Sign me up when it exists' }).click()

    // By id, not by role: Next renders its own always-present
    // `role="alert"` route announcer, so `getByRole('alert')` is two
    // elements on every page and fails strict mode.
    await expect(page.locator('#newsletter-consent-error')).toContainText('Please tick the box')
  })

  /**
   * "The form sends nothing: no address is stored and no email is sent."
   *
   * Counted rather than trusted. The listener is attached before the click
   * and watches every request the page makes, so an action, a fetch or a form
   * POST added later all fail this the same way.
   */
  test('the newsletter sends no request at all', async ({ page }) => {
    await page.goto('/resources')
    await page.waitForLoadState('networkidle')

    const outbound: string[] = []
    page.on('request', (request) => {
      // Ignore what the browser does on its own: lazy images scrolling into
      // view, and Next's own prefetches. A submission that posted an address
      // would be neither of those.
      const kind = request.resourceType()
      if (kind === 'image' || kind === 'script' || kind === 'stylesheet' || kind === 'font') return
      outbound.push(`${request.method()} ${request.url()}`)
    })

    await page.getByLabel('Email', { exact: true }).fill('someone@example.org')
    await page.getByLabel(/Email me when there is something worth reading/).click()
    await page.getByRole('button', { name: 'Sign me up when it exists' }).click()

    await expect(page.getByRole('status')).toContainText('Nothing was sent')
    expect(outbound).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/* The article template                                                        */
/* -------------------------------------------------------------------------- */

test.describe('an article page', () => {
  test('carries a labelled cover, a progress line and a related block', async ({ page }) => {
    await page.goto('/resources/what-to-measure')

    // The cover is the hero, and `PageHeroImage` labels it unconditionally.
    await expect(page.getByText('The room behind this is an AI-generated image')).toBeVisible()

    // The progress line is CSS-only and collapses where it cannot work, so
    // this asserts the element is in the document rather than that it is
    // visible — whether it draws is the `@supports` guard's business.
    await expect(page.locator('.reading-progress')).toHaveCount(1)

    await expect(
      page.getByRole('list', { name: 'More articles' }).getByRole('listitem'),
    ).toHaveCount(3)
  })

  test('never offers itself as a related article', async ({ page }) => {
    await page.goto('/resources/what-to-measure')

    const related = page.getByRole('list', { name: 'More articles' })
    await expect(related.getByRole('link', { name: /only measure five things/ })).toHaveCount(0)
  })
})

/* -------------------------------------------------------------------------- */
/* /sign-in and /sign-up                                                       */
/* -------------------------------------------------------------------------- */

test.describe('/sign-in', () => {
  test('a failed sign-in says so without saying which half was wrong', async ({ page }) => {
    await page.goto('/sign-in')

    // A reserved `.example` address, which cannot be an account.
    await page.getByLabel('Email', { exact: true }).fill('you@your-business.example')
    await page.getByLabel('Password', { exact: true }).fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    const error = page.locator('#sign-in-error')
    await expect(error).toContainText('We could not sign you in with those details')

    // The half that must never be named. A message mentioning either one
    // confirms the other was right, which is how addresses get enumerated.
    await expect(error).not.toContainText('password is')
    await expect(error).not.toContainText('No account')
    await expect(error).not.toContainText('does not exist')
  })

  test('the forgotten-password state is reachable, and does not confirm the address', async ({
    page,
  }) => {
    await page.goto('/sign-in')

    await page.getByRole('button', { name: 'Forgot your password?' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset your password')

    await page.getByLabel('Email', { exact: true }).fill('someone@example.org')
    await page.getByRole('button', { name: 'Send the reset link' }).click()

    await expect(page.getByRole('status')).toContainText('If an account exists for that address')

    // And back, which is the half of a two-state card that usually goes missing.
    await page.getByRole('button', { name: 'Back to sign in' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back')
  })

  test('the example address is neutral: no invented person, no real mail host', async ({ page }) => {
    await page.goto('/sign-in')

    const body = await page.locator('body').innerText()
    expect(body).toContain('you@your-business.example')
    expect(body).not.toContain('@gmail')
    expect(body).not.toContain('maya@')
  })
})

test.describe('/sign-up', () => {
  test('will not create a workspace until the rights box is ticked', async ({ page }) => {
    await page.goto('/sign-up')

    await page.getByLabel('Your name').fill('A name')
    await page.getByLabel('Work email').fill('someone@example.org')
    await page.getByLabel('Workspace name').fill('A workspace')
    await page.getByLabel('Password', { exact: true }).fill('a long enough passphrase')
    await page.getByRole('button', { name: 'Create your workspace' }).click()

    await expect(page.locator('#sign-up-rights-error')).toContainText(
      'material you own or hold the rights to',
    )
    await expect(page).toHaveURL(/sign-up/)
  })
})

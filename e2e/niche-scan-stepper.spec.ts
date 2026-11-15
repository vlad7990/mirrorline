/**
 * The Niche Scan stepper, and the regression it exists to prevent.
 *
 * 19 v2 ★/niche-scan item 2 was left open through F4 for one reason, written
 * up in D52: the form read its answers off the live DOM at submit, so
 * unmounting the inactive steps would post a lead with a blank niche and a
 * blank address. Nothing would have looked wrong — the request goes out, the
 * server answers, and the only sign is a rejection naming a field three
 * screens back.
 *
 * So the test that matters here is not "the stepper advances". It is **what
 * is in the request body after walking all four steps**, asserted against
 * answers typed into steps that are long gone from the DOM by the time the
 * button is pressed. The rest of this file is the behaviour around it.
 *
 * The POST is intercepted rather than allowed through: a real submission
 * writes a lead to the store, and a test suite should not leave rows behind.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'One engine is enough for behaviour that is not rendering.')

const NICHE = 'We run a two-person bookkeeping practice for tradespeople'
const EMAIL = 'someone@example.org'

/** Step one: type the niche and advance. */
async function answerNiche(page: Page, value = NICHE) {
  await page.getByLabel('What do you do? In your own words.').fill(value)
  await page.getByRole('button', { name: 'Next' }).click()
}

test.describe('the four-step form', () => {
  test('shows one question at a time, and the later fields are not in the DOM', async ({
    page,
  }) => {
    await page.goto('/niche-scan')

    await expect(page.getByLabel('What do you do? In your own words.')).toBeVisible()

    // Not "hidden" — absent. A hidden required field is the other half of
    // what D52 ruled out, because it blocks submit with nothing on screen.
    await expect(page.locator('#scan-email')).toHaveCount(0)
    await expect(page.locator('#scan-handle-0')).toHaveCount(0)

    await expect(page.getByText('Step 1 of 4')).toBeVisible()
  })

  test('refuses to advance past an empty first question', async ({ page }) => {
    await page.goto('/niche-scan')

    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.getByText('Tell us what you do, in your own words.')).toBeVisible()
    await expect(page.getByText('Step 1 of 4')).toBeVisible()
  })

  test('the rail marks the step you are on', async ({ page }) => {
    await page.goto('/niche-scan')

    const rail = page.getByRole('list', { name: 'Steps in this request' })
    await expect(rail.getByRole('listitem').first()).toHaveAttribute('aria-current', 'step')

    await answerNiche(page)

    await expect(rail.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step')
    await expect(rail.getByRole('listitem').first()).not.toHaveAttribute('aria-current', 'step')
  })

  test('Back returns the answer you already gave', async ({ page }) => {
    await page.goto('/niche-scan')

    await answerNiche(page)
    await page.getByRole('button', { name: 'Back' }).click()

    await expect(page.getByLabel('What do you do? In your own words.')).toHaveValue(NICHE)
  })

  /**
   * One `<form>` across four steps is what makes this work. A stepper built
   * from divs and click handlers looks identical and loses it, and nobody
   * notices until somebody tries to fill the form in from a keyboard.
   */
  test('Enter advances rather than submitting', async ({ page }) => {
    await page.goto('/niche-scan')

    await page.getByLabel('What do you do? In your own words.').fill(NICHE)
    await page.getByLabel('What do you do? In your own words.').press('Enter')

    await expect(page.getByText('Step 2 of 4')).toBeVisible()
  })

  test('an invalid address is caught on the last step, not by the server', async ({ page }) => {
    let posted = false
    await page.route('**/api/niche-scan', async (route) => {
      posted = true
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })

    await page.goto('/niche-scan')
    await answerNiche(page)
    await page.getByRole('button', { name: 'Next' }).click() // goal
    await page.getByRole('button', { name: 'Next' }).click() // handles

    await page.getByLabel('Where should the scan go?').fill('not-an-address')
    await page.getByRole('button', { name: 'Get my free Niche Scan' }).click()

    await expect(page.getByText('does not look like an email address')).toBeVisible()
    expect(posted).toBe(false)
  })

  /**
   * **The D52 regression test.**
   *
   * Both of these answers were typed into steps that are no longer in the
   * document when the button is pressed. Before this PR the payload read them
   * with `new FormData(event.currentTarget)`, which would have sent two empty
   * strings.
   */
  test('the lead payload carries answers from steps that are no longer mounted', async ({
    page,
  }) => {
    let body: Record<string, unknown> | null = null
    await page.route('**/api/niche-scan', async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })

    await page.goto('/niche-scan')

    await answerNiche(page)

    await page.getByRole('button', { name: 'Bookings' }).click()
    await page.getByRole('button', { name: 'Next' }).click()

    await page.getByLabel('Account 1').fill('@someone')
    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.locator('#scan-niche')).toHaveCount(0)
    await page.getByLabel('Where should the scan go?').fill(EMAIL)
    await page.getByRole('button', { name: 'Get my free Niche Scan' }).click()

    await expect(page.getByRole('heading', { name: 'That is with us.' })).toBeVisible()

    expect(body).not.toBeNull()
    const sent = body as unknown as Record<string, unknown>
    expect(sent.niche).toBe(NICHE)
    expect(sent.email).toBe(EMAIL)
    expect(sent.goal).toBe('bookings')
    expect(sent.handles).toEqual(['@someone'])
  })
})

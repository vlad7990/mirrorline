/**
 * Every route answers 200 and is shaped like a page: one <h1>, one <main>
 * landmark and a non-empty <title>.
 *
 * This is the cheap net under the rest of the suite — if a route stops
 * rendering, this fails first and names the route.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { ROUTES } from './helpers/routes'

onlyProject('chromium', 'Route shape is viewport-independent; the chromium project owns it.')

for (const route of ROUTES) {
  test(`${route.name} (${route.path}) is a well-formed page`, async ({ page }) => {
    const response = await page.goto(route.path)

    expect(response, `no response for ${route.path}`).not.toBeNull()
    expect(response?.status(), `status for ${route.path}`).toBe(200)

    // Exactly one top-level heading, and it says what the route table claims.
    const headings = page.getByRole('heading', { level: 1 })
    await expect(headings).toHaveCount(1)
    await expect(headings).toHaveText(route.h1)

    // Exactly one main landmark, for the root layout's skip link to land on.
    await expect(page.getByRole('main')).toHaveCount(1)

    await expect(page).toHaveTitle(/\S/)
  })
}

test('POST /api/leads stores a valid lead and rejects an incomplete one', async ({ request }) => {
  const accepted = await request.post('/api/leads', {
    data: {
      intent: 'pilot',
      name: 'E2E Tester',
      email: 'e2e@example.test',
      company: 'Playwright QA',
      want: 'Checking the lead endpoint answers in the documented envelope.',
    },
  })
  expect(accepted.status()).toBe(201)
  expect(await accepted.json()).toMatchObject({ ok: true })

  const rejected = await request.post('/api/leads', { data: { intent: 'pilot' } })
  expect(rejected.status()).toBe(400)
  expect(await rejected.json()).toMatchObject({ ok: false })
})

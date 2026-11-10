/**
 * 390 x 844 — the phone viewport DESIGN.md fixes.
 *
 * Two promises are checked here. No screen may scroll sideways, and the studio
 * shell must swap its 240px sidebar for the top bar and its drawer.
 *
 * Runs in the `mobile` project, which already sets the viewport, so nothing
 * here has to resize anything.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { ROUTES, STUDIO_SHELL_ROUTES } from './helpers/routes'

onlyProject('mobile', 'This spec is about the 390x844 viewport the mobile project sets.')

/** One pixel of slack: sub-pixel layout can round a width up by a fraction. */
const SCROLL_SLACK = 1

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.documentElement
          return root.scrollWidth - root.clientWidth
        }),
      { message: 'the page still scrolls horizontally at 390px' },
    )
    .toBeLessThanOrEqual(SCROLL_SLACK)
}

for (const route of ROUTES) {
  test(`${route.name} (${route.path}) does not scroll sideways at 390px`, async ({ page }) => {
    await page.goto(route.path)
    // Wait for the heading rather than a timeout: layout is settled once the
    // page's own content is on screen.
    await expect(page.getByRole('heading', { level: 1, name: route.h1 })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
}

test('the studio sidebar is gone at 390px and the drawer replaces it', async ({ page }) => {
  await page.goto('/app/home')

  // The sidebar's nav is the only "Studio" navigation landmark; while the
  // drawer is closed none is reachable, which is the sidebar being hidden.
  await expect(page.getByRole('navigation', { name: 'Studio' })).toHaveCount(0)

  const trigger = page.getByRole('button', { name: 'Open menu' })
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  await trigger.click()

  const drawer = page.getByRole('dialog', { name: 'Studio menu' })
  await expect(drawer).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(drawer.getByRole('navigation', { name: 'Studio' })).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Home' })).toBeVisible()
})

test('the drawer traps focus and Escape closes it', async ({ page }) => {
  await page.goto('/app/home')
  await page.getByRole('button', { name: 'Open menu' }).click()

  const drawer = page.getByRole('dialog', { name: 'Studio menu' })
  await expect(drawer).toBeVisible()

  // Focus starts inside the drawer and cannot reach anything behind it: a
  // native modal <dialog> makes the rest of the page inert.
  //
  // Chromium wraps the cycle through the document scope, so for one press
  // `document.activeElement` is <body>. That is the wrap point, not an escape —
  // what matters is that no control outside the dialog is ever focused. The
  // loop runs past the wrap to prove the cycle closes back into the drawer.
  const TAB_PRESSES = 16
  const focusReport: string[] = []

  for (let press = 0; press < TAB_PRESSES; press += 1) {
    const where = await drawer.evaluate((node) => {
      const active = document.activeElement
      if (active === null) return 'none'
      if (node.contains(active)) return 'inside'
      if (active === document.body || active === document.documentElement) return 'wrap'
      return `OUTSIDE:${active.tagName.toLowerCase()}:${(active.textContent ?? '').trim().slice(0, 30)}`
    })
    focusReport.push(`${press}:${where}`)
    expect(where, `focus left the drawer: ${focusReport.join(' ')}`).not.toMatch(/^OUTSIDE/)
    await page.keyboard.press('Tab')
  }

  // Not just "never outside" — focus really does come back into the drawer.
  expect(focusReport.filter((entry) => entry.endsWith('inside')).length).toBeGreaterThan(
    TAB_PRESSES / 2,
  )
  await expect(drawer.getByRole('button', { name: 'Close menu' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

test('every studio route offers the mobile menu trigger', async ({ page }) => {
  for (const route of STUDIO_SHELL_ROUTES) {
    await page.goto(route.path)
    await expect(
      page.getByRole('button', { name: 'Open menu' }),
      `no mobile menu trigger on ${route.path}`,
    ).toBeVisible()
  }
})

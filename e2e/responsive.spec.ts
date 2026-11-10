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

  // Focus starts inside the drawer and cannot leave it: a native modal
  // <dialog> makes everything behind it inert.
  const TAB_PRESSES = 14
  for (let press = 0; press < TAB_PRESSES; press += 1) {
    await expect
      .poll(() => drawer.evaluate((node) => node.contains(document.activeElement)), {
        message: `focus escaped the drawer after ${press} Tab presses`,
      })
      .toBe(true)
    await page.keyboard.press('Tab')
  }

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

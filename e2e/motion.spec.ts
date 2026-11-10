/**
 * The motion system, which nothing else in this suite looks at.
 *
 * DESIGN.md "Motion" makes three promises that are cheap to break silently and
 * invisible in a screenshot:
 *
 * 1. A disclosure animates its height, so the page displaces rather than the
 *    panel appearing on top of its neighbours.
 * 2. An exit is shorter than its entrance (DESIGN.md puts exits at ~65%).
 *    Leaving is not an event; arriving is.
 * 3. Under prefers-reduced-motion the durations collapse but the animation is
 *    still *named*. Radix's Presence waits for `animationend` before it
 *    unmounts a panel, so removing the animation outright would leave closed
 *    panels mounted. This is the subtlest rule in the system and the easiest
 *    to "tidy up" into a bug.
 *
 * The FAQ is the test subject because it is the one disclosure on a public
 * page, so a regression here is visible to a prospect.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'motion is a property of the CSS, not of the viewport')

const FAQ_PAGE = '/'

/** Milliseconds from a computed `animation-duration` such as "0.2s". */
function toMs(duration: string): number {
  const first = duration.split(',')[0].trim()
  return first.endsWith('ms') ? parseFloat(first) : parseFloat(first) * 1000
}

async function openFirstFaqItem(page: Page) {
  const trigger = page.locator('button').filter({ hasText: '?' }).first()
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  return trigger
}

test('the FAQ panel animates its height open, and clips while it does', async ({ page }) => {
  await page.goto(FAQ_PAGE)
  await openFirstFaqItem(page)

  const panel = page.locator('.accordion-panel[data-state="open"]').first()
  await expect(panel).toBeAttached()

  const style = await panel.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      name: computed.animationName,
      duration: computed.animationDuration,
      overflow: computed.overflow,
      measuredHeight: computed.getPropertyValue('--radix-accordion-content-height'),
    }
  })

  expect(style.name).toBe('mirrorline-accordion-down')
  // Radix has to have measured the panel, or the keyframe animates to nothing.
  expect(style.measuredHeight).toMatch(/\d/)
  // Without this the text spills out of the panel while it is still short.
  expect(style.overflow).toBe('hidden')
})

test('the FAQ panel leaves faster than it arrives', async ({ page }) => {
  await page.goto(FAQ_PAGE)
  const trigger = await openFirstFaqItem(page)

  const enterMs = toMs(
    await page
      .locator('.accordion-panel[data-state="open"]')
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration),
  )

  await trigger.click()

  const closing = page.locator('.accordion-panel[data-state="closed"]').first()
  const exit = await closing.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { name: computed.animationName, duration: computed.animationDuration }
  })

  expect(exit.name).toBe('mirrorline-accordion-up')
  expect(toMs(exit.duration)).toBeLessThan(enterMs)
})

test('reduced motion collapses the duration but keeps the animation named', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)
  await openFirstFaqItem(page)

  const panel = page.locator('.accordion-panel[data-state="open"]').first()
  await expect(panel).toBeAttached()

  const style = await panel.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { name: computed.animationName, duration: computed.animationDuration }
  })

  // Named, so Presence still gets its animationend and unmounts the panel.
  expect(style.name).toBe('mirrorline-accordion-down')
  // Effectively instant. 1ms is the ceiling the theme sets for this.
  expect(toMs(style.duration)).toBeLessThanOrEqual(1)
})

test('the press affordance is wired to the duration token, not a literal', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const pressable = page.locator('.press').first()
  await expect(pressable).toBeAttached()

  const duration = await pressable.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  )

  // DESIGN.md "Motion — Press": 140ms. A literal here drifts from the token.
  expect(toMs(duration)).toBeCloseTo(140, -1)
})

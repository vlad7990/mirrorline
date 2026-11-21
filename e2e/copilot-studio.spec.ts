/**
 * The studio co-pilot, driven the way a client drives it (18 §2.3, §2.4).
 *
 * Four things live here because only a browser can show them, and the last is
 * the one the spec is most insistent about:
 *
 * - **⌘K opens it from anywhere in `/app/*`**, focused on the input. A unit
 *   test can prove a handler exists; only a browser proves the key reaches it
 *   from a page the component does not own.
 * - **Escape closes it and focus goes back to the trigger.** The trigger is
 *   hidden while the panel is open, and `focus()` on a hidden element does
 *   nothing and reports nothing — which is why this is a test and not a line
 *   of code somebody trusted.
 * - **Two shapes across `xl`.** Modal and trapped below it, an aside beside
 *   the content above it.
 * - **Nothing ran until Approve was pressed.** §2.3 asks for this as a test
 *   rather than a promise, and the only honest version of that test reads the
 *   calendar grid afterwards: the proof a move happened is the chip being in
 *   a different column, not a sentence in the panel saying so.
 *
 * Chromium only, at two viewports, because the shape *is* the behaviour here.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'the co-pilot’s rules are behavioural; the viewports are the point')

const TRIGGER = 'Ask Milo about this account — AI assistant'
const MOVE_QUESTION = 'Can you move my Thursday post to Tuesday?'
const PROPOSALS = 'Proposed, waiting on you'

/** Below `xl`: the dialog shape. */
const NARROW = { width: 390, height: 844 }
/** Above `xl`: the inline aside. */
const WIDE = { width: 1440, height: 900 }

function trigger(page: Page) {
  return page.getByRole('button', { name: TRIGGER })
}

function panel(page: Page) {
  return page.getByRole('dialog', { name: /Ask Milo/ })
}

async function ask(page: Page, question: string) {
  await panel(page).getByLabel('Your question').fill(question)
  await panel(page).getByRole('button', { name: 'Ask', exact: true }).click()
}

/**
 * Every chip on the grid, by its accessible name, sorted.
 *
 * Read through the accessibility API rather than through a `data-` attribute
 * added for the test. The chip's label already begins with the day it sits in
 * — `"Thursday 19, 9:15 am, Instagram, …"` — so a move changes it, and
 * reading it means the test asserts on the thing a screen-reader user would
 * be told rather than on a hook nobody else uses. Sorted, because the DOM
 * order within a row changes when a chip is re-bucketed and the question here
 * is only *where each chip is*.
 */
async function grid(page: Page) {
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('td [aria-label]')].map(
      (element) => element.getAttribute('aria-label') ?? '',
    ),
  )
  return [...labels].sort()
}

test.describe('⌘K, from anywhere under /app', () => {
  test('opens the panel focused on the input, and closes again', async ({ page }) => {
    await page.setViewportSize(WIDE)
    // Deliberately not the calendar: §2.4 says "from anywhere in /app/*", and
    // a shortcut tested only on the screen it acts upon proves nothing about
    // "anywhere".
    await page.goto('/app/results')

    await expect(panel(page)).toBeHidden()
    await page.keyboard.press('Meta+k')

    await expect(panel(page)).toBeVisible()
    // §2.4: "⌘K opens the panel focused on the input."
    await expect(panel(page).getByLabel('Your question')).toBeFocused()

    await page.keyboard.press('Meta+k')
    await expect(panel(page)).toBeHidden()
  })

  test('Escape closes it and focus returns to the trigger', async ({ page }) => {
    await page.setViewportSize(WIDE)
    await page.goto('/app/calendar')

    await trigger(page).click()
    await expect(panel(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(panel(page)).toBeHidden()
    // The trigger is hidden while the panel is open, so this only passes
    // because the restore happens in an effect once it is back.
    await expect(trigger(page)).toBeFocused()
  })
})

test.describe('two shapes, one panel', () => {
  test('is a modal dialog below xl and an aside above it', async ({ page }) => {
    await page.goto('/app/calendar')

    await page.setViewportSize(NARROW)
    await trigger(page).click()
    // Modal: the rest of the studio is inert behind it, and it says so.
    await expect(panel(page)).toHaveAttribute('aria-modal', 'true')
    await page.keyboard.press('Escape')

    await page.setViewportSize(WIDE)
    await trigger(page).click()
    // An aside is part of the page. Claiming `aria-modal` here would tell a
    // screen reader the studio is unreachable while it plainly is not.
    await expect(panel(page)).not.toHaveAttribute('aria-modal', 'true')
  })

  test('traps Tab inside the dialog shape', async ({ page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/app/calendar')
    await trigger(page).click()
    await expect(panel(page)).toBeVisible()

    // Tab around the whole panel several times. Focus must never leave it —
    // a dialog that lets Tab wander behind the scrim is a dialog a keyboard
    // user cannot get out of in the other direction either.
    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press('Tab')
      const isInside = await panel(page).evaluate((element) =>
        element.contains(document.activeElement),
      )
      expect(isInside, `focus left the panel after ${press + 1} tabs`).toBe(true)
    }
  })
})

test.describe('it proposes; the person disposes (§2.3)', () => {
  test('a dismissed proposal changes nothing, and an approved one moves the grid', async ({
    page,
  }) => {
    await page.setViewportSize(WIDE)
    await page.goto('/app/calendar')

    await trigger(page).click()
    await ask(page, MOVE_QUESTION)

    const card = panel(page).getByRole('list', { name: PROPOSALS }).getByRole('listitem')
    await expect(card).toBeVisible()
    // Said before the press, not only after it.
    await expect(panel(page)).toContainText('Nothing happens until you press Approve')

    // Where every chip sits *now*. Read off the grid rather than from the
    // panel's prose: the panel claiming a move is exactly the thing this test
    // exists not to trust.
    const before = await grid(page)
    expect(before.length, 'the calendar rendered no chips to read').toBeGreaterThan(0)

    await card.getByRole('button', { name: 'Dismiss' }).click()
    await expect(panel(page)).toContainText('Dismissed. Nothing ran.')
    expect(await grid(page)).toEqual(before)

    // Ask again and approve, and the grid has to change.
    await ask(page, MOVE_QUESTION)
    const second = panel(page)
      .getByRole('list', { name: PROPOSALS })
      .last()
      .getByRole('listitem')
    await second.getByRole('button', { name: 'Approve' }).click()

    // B2.2: an approved move is a write now, so the panel's line says saved
    // rather than "Sample data, not saved". It still names what a move does
    // not do, because the Publisher does not exist yet.
    await expect(panel(page)).toContainText('Moved on the calendar and saved')
    await expect.poll(async () => grid(page)).not.toEqual(before)
  })

  test('approving twice cannot run the move twice', async ({ page }) => {
    await page.setViewportSize(WIDE)
    await page.goto('/app/calendar')

    await trigger(page).click()
    await ask(page, MOVE_QUESTION)

    const card = panel(page).getByRole('list', { name: PROPOSALS }).getByRole('listitem')
    await card.getByRole('button', { name: 'Approve' }).click()

    // The buttons go once a decision is made, so there is nothing left to
    // press. That is the simplest form of "it cannot run twice", and the
    // identity check in `decideProposal` is the belt behind this brace.
    await expect(card.getByRole('button', { name: 'Approve' })).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'Dismiss' })).toHaveCount(0)
  })
})

test.describe('what it says about itself', () => {
  test('is labelled AI on the trigger and in the panel header', async ({ page }) => {
    await page.setViewportSize(WIDE)
    await page.goto('/app/home')

    // §3.3: the label is on the launcher's face, not in a tooltip.
    await expect(trigger(page)).toHaveAccessibleName(/AI assistant/)

    await trigger(page).click()
    await expect(panel(page)).toContainText('AI')
    // §2.3 on the screen: it can propose, and it cannot act.
    await expect(panel(page)).toContainText('it cannot make them')
  })

  test('the open panel has no serious axe violations', async ({ page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/app/calendar')
    await trigger(page).click()
    await ask(page, MOVE_QUESTION)
    await expect(panel(page)).toContainText('Approve')

    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )

    expect(
      serious,
      serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n'),
    ).toEqual([])
  })
})

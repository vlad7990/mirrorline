/**
 * Rescheduling a post, by both of the paths that can do it.
 *
 * The brief asked for tests for both, and that is not belt-and-braces: the
 * drag and the "Move to…" menu are two implementations of one promise, and
 * the way they fail is by drifting apart — one moves the post, the other
 * moves it and says something different about it, and nobody notices because
 * each works on its own.
 *
 * The menu is also the WCAG 2.5.7 (Dragging Movements) path, so a suite that
 * only drove the drag would be testing the half of the feature that some
 * people cannot use.
 *
 * Nothing here hard-codes a fixture date. The grid is read for a row that has
 * a chip and a second day to put it on, so re-dating `@mirrorline/mock` does
 * not quietly turn these green against a calendar nobody is looking at.
 */

import { expect, type Locator, type Page, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'Dragging is a mouse affordance; the menu covers the rest.')

/** `data-drop-cell="instagram|2026-11-09"` — the attribute the drag reads. */
const CELL = '[data-drop-cell]'

interface Slot {
  readonly key: string
  readonly platform: string
  readonly date: string
}

function parseSlot(key: string): Slot {
  const [platform, date] = key.split('|')
  return { key, platform: platform ?? '', date: date ?? '' }
}

/** A row with a chip to move, and an emptier day on that row to move it to. */
async function findMove(page: Page): Promise<{ from: Slot; to: Slot }> {
  const found = await page.evaluate((selector) => {
    const cells = Array.from(document.querySelectorAll(selector))
    const keyOf = (cell: Element) => cell.getAttribute('data-drop-cell') ?? ''

    for (const cell of cells) {
      if (!cell.querySelector('button')) continue
      const platform = keyOf(cell).split('|')[0]
      // Fewest chips, so the count assertion on the target is unambiguous.
      const target = cells
        .filter((other) => other !== cell && keyOf(other).startsWith(`${platform}|`))
        .sort(
          (a, b) => a.querySelectorAll('button').length - b.querySelectorAll('button').length,
        )[0]
      if (target) return { from: keyOf(cell), to: keyOf(target) }
    }
    return null
  }, CELL)

  expect(found, 'the week grid needs a row with a chip and a second day').not.toBeNull()
  if (!found) throw new Error('no movable chip on the grid')
  return { from: parseSlot(found.from), to: parseSlot(found.to) }
}

function cell(page: Page, slot: Slot): Locator {
  return page.locator(`[data-drop-cell="${slot.key}"]`)
}

async function openCalendar(page: Page): Promise<void> {
  await page.goto('/app/calendar')
  // The grid is the subject; waiting on the h1 alone can win the race.
  await expect(page.locator(CELL).first()).toBeVisible()
}

/** Press, cross the 6px threshold, and land on `target`. */
async function dragChipTo(page: Page, chip: Locator, target: Locator): Promise<boolean> {
  const start = await chip.boundingBox()
  const end = await target.boundingBox()
  if (!start || !end) return false

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + start.width / 2 + 24, start.y + start.height / 2 + 12, {
    steps: 4,
  })
  await expect(page.locator('[data-drag-ghost]')).toBeVisible()
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 })
  return true
}

test('the screen says a move is sample data before anyone makes one', async ({ page }) => {
  await openCalendar(page)

  // Non-negotiable 7. The claim is on the screen, not only in the commit —
  // and it says "not saved", which is the part a reader needs *before* they
  // drag something and then reload the page.
  await expect(page.getByText(/Sample data, not saved/i).first()).toBeVisible()
})

test('dragging a post to another day moves it there', async ({ page }) => {
  await openCalendar(page)
  const { from, to } = await findMove(page)

  const source = cell(page, from)
  const target = cell(page, to)
  const chip = source.locator('button').first()
  const chipName = await chip.getAttribute('aria-label')
  expect(chipName).toBeTruthy()

  const before = await target.locator('button').count()
  if (!(await dragChipTo(page, chip, target))) return

  // The drop slot names itself before the drop, not after it.
  await expect(target).toHaveClass(/ring-ink/)
  await page.mouse.up()

  // It landed, and — the half that is easy to get wrong — it left.
  await expect(target.locator('button')).toHaveCount(before + 1)
  await expect(source.getByRole('button', { name: chipName ?? '' })).toHaveCount(0)
  await expect(page.locator('[data-drag-ghost]')).toHaveCount(0)

  // And the confirmation repeats that nothing was really rescheduled.
  await expect(page.getByRole('status').filter({ hasText: /Moved to/ })).toContainText(
    'Sample data, not saved',
  )
})

test('Escape during a drag puts the post back', async ({ page }) => {
  await openCalendar(page)
  const { from, to } = await findMove(page)

  const source = cell(page, from)
  const target = cell(page, to)
  const sourceBefore = await source.locator('button').count()
  const targetBefore = await target.locator('button').count()

  if (!(await dragChipTo(page, source.locator('button').first(), target))) return

  await page.keyboard.press('Escape')
  await page.mouse.up()

  await expect(page.locator('[data-drag-ghost]')).toHaveCount(0)
  await expect(source.locator('button')).toHaveCount(sourceBefore)
  await expect(target.locator('button')).toHaveCount(targetBefore)
})

test('a post cannot be dragged onto another platform row', async ({ page }) => {
  await openCalendar(page)
  const { from } = await findMove(page)

  // Moving between rows is a publishing decision, not a scheduling one, so
  // the drag has to refuse it rather than quietly re-platform the post.
  const otherRow = await page.evaluate(
    ({ selector, platform }) => {
      const cells = Array.from(document.querySelectorAll(selector))
      const other = cells.find(
        (candidate) => !(candidate.getAttribute('data-drop-cell') ?? '').startsWith(`${platform}|`),
      )
      return other?.getAttribute('data-drop-cell') ?? null
    },
    { selector: CELL, platform: from.platform },
  )
  expect(otherRow, 'the grid needs a second platform row').not.toBeNull()
  if (!otherRow) return

  const source = cell(page, from)
  const foreign = page.locator(`[data-drop-cell="${otherRow}"]`)
  const foreignBefore = await foreign.locator('button').count()
  const sourceBefore = await source.locator('button').count()

  if (!(await dragChipTo(page, source.locator('button').first(), foreign))) return

  // No drop slot lights up on a row that cannot take it.
  await expect(foreign).not.toHaveClass(/ring-ink/)
  await page.mouse.up()

  await expect(foreign.locator('button')).toHaveCount(foreignBefore)
  await expect(source.locator('button')).toHaveCount(sourceBefore)
})

test('the "Move to…" menu reschedules without any dragging', async ({ page }) => {
  await openCalendar(page)
  const { from } = await findMove(page)

  const source = cell(page, from)
  const chip = source.locator('button').first()
  const chipName = await chip.getAttribute('aria-label')
  await chip.click()

  // WCAG 2.5.7: the no-drag path is present for the post in hand.
  await expect(page.getByRole('heading', { name: 'Move to…' })).toBeVisible()

  const move = page.getByRole('button', { name: /Move post|Already there/ })
  // It opens describing where the post already is, so there is nothing to do
  // until something is changed.
  await expect(move).toBeDisabled()

  await page.getByLabel('Day', { exact: true }).click()
  const days = page.getByRole('option')
  await expect(days.first()).toBeVisible()
  const dayCount = await days.count()
  await days.nth(dayCount - 1).click()

  await expect(move).toBeEnabled()
  await move.click()

  await expect(page.getByRole('status').filter({ hasText: /Moved to/ })).toContainText(
    'Sample data, not saved',
  )
  await expect(source.getByRole('button', { name: chipName ?? '' })).toHaveCount(0)
})

test('the menu offers only the slots that platform already posts in', async ({ page }) => {
  await openCalendar(page)
  const { from } = await findMove(page)

  await cell(page, from).locator('button').first().click()
  await expect(page.getByRole('heading', { name: 'Move to…' })).toBeVisible()

  await page.getByLabel('Time', { exact: true }).click()
  await expect(page.getByRole('option').first()).toBeVisible()
  const times = await page.getByRole('option').allInnerTexts()

  // Every offered time is one this row really uses. Inventing a posting time
  // would promise a scheduling engine we do not have.
  const onGrid = await page.evaluate(
    ({ selector, platform }) => {
      const cells = Array.from(document.querySelectorAll(selector)).filter((candidate) =>
        (candidate.getAttribute('data-drop-cell') ?? '').startsWith(`${platform}|`),
      )
      return cells
        .flatMap((candidate) => Array.from(candidate.querySelectorAll('button')))
        .map((button) => (button.getAttribute('aria-label') ?? '').split(', ')[1] ?? '')
    },
    { selector: CELL, platform: from.platform },
  )

  expect(times.length).toBeGreaterThan(0)
  for (const time of times) expect(onGrid, `${time} is not a slot on this row`).toContain(time)
})

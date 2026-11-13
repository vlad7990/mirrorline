/**
 * The home page's v4 sections: the picker, the problem cards, and the rule
 * that no industry is named anywhere on the page.
 *
 * The axe sweep in a11y.spec.ts audits each route as it first renders, which
 * means it never sees a problem card's answer — those reach the DOM only once
 * a card is open. One of them shipped with a contrast failure for exactly
 * that reason, so the expanded state is audited here instead.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'One engine is enough for behaviour that is not rendering.')

const STORAGE_KEY = 'mirrorline.account-choice'

test('the picker keeps the choice in the URL and in storage', async ({ page }) => {
  await page.goto('/')

  const individual = page.getByRole('radio', { name: 'An individual' })
  await expect(individual).toHaveAttribute('aria-checked', 'false')

  await individual.click()

  await expect(individual).toHaveAttribute('aria-checked', 'true')
  // The URL is half the contract: it is what makes a shared link open on the
  // same reading the sender saw.
  await expect(page).toHaveURL(/who=individual/)

  const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
  expect(stored).toContain('individual')
})

test('a URL parameter beats whatever was stored before', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'An individual' }).click()
  await expect(page).toHaveURL(/who=individual/)

  // A link someone was sent has to win over a previous visit's choice, or a
  // shared ?who= opens on the wrong reading.
  await page.goto('/?who=business&account=new')

  await expect(page.getByRole('radio', { name: 'A business' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByRole('radio', { name: 'Starting a new account' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('the picker is two radio groups, and arrow keys move inside one', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('radiogroup')).toHaveCount(2)

  await page.getByRole('radio', { name: 'A business' }).focus()
  await page.keyboard.press('ArrowRight')

  // The role promises arrow-key movement; without a handler the group is just
  // a row of tab stops that looks like radios.
  await expect(page.getByRole('radio', { name: 'An individual' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('a problem card opens its answer, and the open card passes axe', async ({ page }) => {
  await page.goto('/')

  const card = page.getByRole('button', { name: /The clips come back wrong/ })
  await expect(card).toHaveAttribute('aria-expanded', 'false')

  await card.click()
  await expect(card).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(/scoring learns from your results/)).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )

  expect(
    serious,
    `open problem card has violations:\n${serious.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
  ).toEqual([])
})

test('only one problem card is open at a time', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /The clips come back wrong/ }).click()
  await page.getByRole('button', { name: /sound like me/ }).click()

  await expect(page.getByRole('button', { name: /The clips come back wrong/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

test('the home page names no industry', async ({ page }) => {
  await page.goto('/')

  // 10_SALES_FOCUS.md §1 and 16 §1: segmentation is by account type and goal
  // only. Four industry cards sat here until v4, which is what this guards.
  const body = (await page.locator('body').innerText()).toLowerCase()

  for (const word of [
    'coaches and consultants',
    'clinics and wellness',
    'studios and gyms',
    'local services',
    'real estate',
    'for coaches',
    'built for clinics',
  ]) {
    expect(body, `"${word}" is industry-specific wording`).not.toContain(word)
  }
})

test('the hero names both ways in, not only the client’s own footage', async ({ page }) => {
  await page.goto('/')

  // 16 §3 row 1. The old sub described the Multiplier alone, which excluded
  // every account that has no footage yet.
  await expect(page.getByText(/Send us your videos, or we create originals/)).toBeVisible()
})

test('the header no longer invents a number of pilot places', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText(/places this month/)).toHaveCount(0)
  await expect(page.getByText(/the Niche Scan is free/)).toBeVisible()
})

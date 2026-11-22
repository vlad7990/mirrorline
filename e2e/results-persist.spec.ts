/**
 * B2.4: the Ledger and the alert bar read this workspace, not the fixtures.
 *
 * ============================================================================
 * The alert bar is the one piece of sample data that asked for action
 * ============================================================================
 *
 * Everywhere else a leftover fixture is a wrong number on a card. Here it was
 * a red bar on the studio's front page reading *"Instagram signed us out"* —
 * about the demo workspace's account, shown to a client who may never have
 * connected Instagram at all. It did not merely misinform: it asked them to go
 * and fix something that was not broken.
 *
 * So the assertions are negative, as they were for B2.3. The demo's alert must
 * not reach a real workspace's Home, and the demo's figures must not reach its
 * ledger.
 *
 * ============================================================================
 * An empty ledger is not a table of zeroes
 * ============================================================================
 *
 * The ledger counts what we did, so a zero would be honest *if a week had
 * happened*. None has — nothing publishes until B7 — so the board says "No
 * weeks yet" rather than drawing seven noughts, and this proves it.
 */

import { type Browser, expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a fixture is either on the page or it is not, at any width')

/** The demo workspace's alert, from `lib/studio/insights.ts`. */
const DEMO_ALERT = 'Instagram signed us out'

/** Values from `SAMPLE_LEDGER`. Neither may appear on a real workspace. */
const DEMO_LEDGER_VALUES = ['48,000', '20 Oct']

async function signedIn(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'results')
  const password = testPassword(runId)

  await createConfirmedUser(config, email, password, `E2E ${runId}`)

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  return { page, context, runId }
}

test('a real workspace is not told the demo account disconnected', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedIn(browser, config)

  await page.goto('/app/home')

  // Assert the page rendered first. Otherwise "no alert" would pass on a blank
  // screen, which is how this kind of assertion fails uselessly.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expect(page.getByText(DEMO_ALERT)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Reconnect Instagram/ })).toHaveCount(0)

  await context.close()
})

test('the Overview tab raises no alert for a workspace with none', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedIn(browser, config)

  await page.goto('/app/results')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

  await expect(page.getByText(DEMO_ALERT)).toHaveCount(0)

  await context.close()
})

test('the Ledger says it has no weeks, and shows no sample figures', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedIn(browser, config)

  await page.goto('/app/results?tab=ledger')
  await expect(page.getByRole('heading', { level: 1, name: 'Ledger' })).toBeVisible()

  await expect(page.getByText('No weeks yet')).toBeVisible()

  // And none of the demo's rows: `48,000` is a sample view count and `20 Oct`
  // one of its weeks. Either on screen means the board fell back to fixtures.
  for (const value of DEMO_LEDGER_VALUES) {
    await expect(
      page.getByText(value, { exact: false }),
      `the sample ledger value ${value} reached a real workspace`,
    ).toHaveCount(0)
  }

  // Nothing to export from an empty ledger, so the control is not offered: a
  // CSV with one header row is a worse answer than no button.
  await expect(page.getByRole('button', { name: /Export/ })).toHaveCount(0)

  await context.close()
})

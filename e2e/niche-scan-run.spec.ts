/**
 * V1 · starting a Niche Scan from the studio, and what a keyless run must say.
 *
 * ============================================================================
 * Why this is worth a spec of its own
 * ============================================================================
 *
 * The scan agent shipped with its action already written and **nothing calling
 * it** — `grep runNicheScanAction` found one hit, the definition. A path with no
 * caller is a path with no coverage, and D116 is the record of what that costs:
 * nineteen studio specs were skipped in CI and two real defects sat behind them
 * for days while the build stayed green.
 *
 * ============================================================================
 * The suite runs keyless, and that is the interesting case
 * ============================================================================
 *
 * `playwright.config.ts` pins `ANTHROPIC_API_KEY` empty for the server it
 * starts, so a scan here takes the sample path: no API call, no money, a
 * deterministic report. That is not a limitation of this test — it is the
 * assertion.
 *
 * Non-negotiable 7 says demo data is labelled. The failure this guards against
 * is the sample arriving **unlabelled** after a button press, because that is
 * the version a client would read as real research into their own niche. So the
 * test presses the button and then checks for the label, not merely that
 * something appeared.
 */

import { type Browser, expect, type Page, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'pressing a button and waiting for a write has no viewport in it')

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

/** The niche this workspace says it is in, written at onboarding. */
const NICHE = 'Independent dog trainers in Leeds'
const OUTCOME = 'Twenty enquiries a month by March'

/**
 * Its own account, not the shared session (D84).
 *
 * This test writes a report to its workspace. On the shared workspace those
 * writes accumulate, and "the latest report" would be whichever run went last.
 */
async function signedInPage(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'scan')
  const password = testPassword(runId)

  await createConfirmedUser(config, email, password, `E2E ${runId}`)

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  return { page, context }
}

async function completeOnboarding(page: Page) {
  await page.goto('/app/onboarding')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox', { name: RIGHTS_LABEL }).check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Your niche and goal' })).toBeVisible()
  await page.getByLabel('What do you do?').fill(NICHE)
  await page.getByLabel('What would success look like?').fill(OUTCOME)
  await page.getByRole('button', { name: 'Open my studio' }).click()
  await expect(page).toHaveURL(/\/app\/home$/, { timeout: 20_000 })
}

test('the scan form arrives filled in with this workspace’s own niche', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedInPage(browser, config)
  await completeOnboarding(page)

  await page.goto('/app/trends')

  // Read back from `workspaces.niche`, which onboarding wrote. An empty box
  // here would mean asking the client to retype what they already told us.
  await expect(page.getByLabel('Niche to research')).toHaveValue(NICHE)
  await expect(page.getByRole('button', { name: 'Run a scan' })).toBeEnabled()

  await context.close()
})

test('a scan run without a key saves the sample, and says that it is a sample', async ({
  browser,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedInPage(browser, config)
  await completeOnboarding(page)

  await page.goto('/app/trends')

  // Before: nothing has run, so the screen shows the "no scan yet" state rather
  // than an empty page.
  await expect(page.getByText('No scan yet')).toBeVisible()

  await page.getByRole('button', { name: 'Run a scan' }).click()

  // The action's own answer. It takes the sample path because the server has no
  // key, and it says so in those words rather than reporting plain success.
  await expect(
    page.getByText('Saved a sample report. Add an API key to run real research.'),
  ).toBeVisible({ timeout: 60_000 })

  // **The assertion this file exists for.** A report landed, and it is labelled.
  // Unlabelled sample research attributed to the client's own niche is the
  // outcome non-negotiable 7 forbids.
  await expect(page.getByText('Sample data').first()).toBeVisible()

  // And the empty state is gone, which is how we know a row was actually
  // written rather than the message being the only thing that changed.
  await expect(page.getByText('No scan yet')).toHaveCount(0)

  await context.close()
})

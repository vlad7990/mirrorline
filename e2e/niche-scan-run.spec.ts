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

/**
 * ============================================================================
 * This test used to assert a finished scan. It cannot any more, and that is
 * the feature rather than a gap (D119)
 * ============================================================================
 *
 * Until the queue landed, pressing the button ran the whole scan inside the
 * server action, so a keyless run saved the sample before the request returned
 * and this spec could assert "Saved a sample report" and the empty state
 * disappearing.
 *
 * The action now writes a job and returns in milliseconds, because a real scan
 * takes four to six minutes against a 300-second function ceiling (D118).
 * **No worker runs in CI**, so nothing drains the queue here — which means the
 * honest thing to assert is what the press actually does: a job exists, and
 * the screen says so.
 *
 * Rewriting rather than deleting keeps the two guarantees that matter at this
 * boundary — the button reaches the server, and the client is told what is
 * happening — and stops the suite asserting a contract the product no longer
 * offers.
 *
 * **What moved rather than vanished:**
 *
 * - *A sample report is labelled* (non-negotiable 7) is asserted by
 *   `demo-path.spec.ts`, which walks the Niche Scan screen and requires
 *   "Sample data" to be visible on it.
 * - *A keyless scan saves the sample and says so* is the worker's half. It was
 *   proved end to end against the preview database when the worker was built
 *   (D119): claim → run → report written → job `complete`. Covering it in CI
 *   needs a worker running beside the suite, which is a follow-up noted in
 *   `docs/PROGRESS.md` rather than something to fake here.
 */
test('pressing Run a scan queues the work and the screen says so', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedInPage(browser, config)
  await completeOnboarding(page)

  await page.goto('/app/trends')

  // Before: nothing has run, so the screen shows the "no scan yet" state rather
  // than an empty page.
  await expect(page.getByText('No scan yet')).toBeVisible()

  const runButton = page.getByRole('button', { name: 'Run a scan' })
  await expect(runButton).toBeEnabled()
  await runButton.click()

  /*
   * The press is answered in milliseconds now, so the thing to wait for is the
   * progress panel rather than a report. `role="status"` because this is the
   * screen telling the reader something changed without moving their focus.
   */
  await expect(page.getByRole('status').filter({ hasText: 'Scanning your niche' })).toBeVisible({
    timeout: 30_000,
  })

  // The duration is quoted up front. A spinner with no number starts reading
  // as a hang at about twenty seconds, and this wait is minutes long.
  await expect(page.getByText(/Usually about 5 minutes/)).toBeVisible()

  /*
   * **The assertion with money behind it.** While a scan is pending the button
   * is locked, because a second press is a second Sonnet call with ~28 web
   * searches for a report already being written. The database refuses the
   * duplicate too (`jobs_one_pending_per_kind`), so this is the first of two
   * defences rather than the only one.
   */
  await expect(page.getByRole('button', { name: 'Scanning…' })).toBeDisabled()

  /*
   * And the empty state is **still** there, which is correct: no worker has
   * run, so no report exists. A screen claiming otherwise a second after the
   * press would be the lie this whole change exists to avoid.
   */
  await expect(page.getByText('No scan yet')).toBeVisible()

  await context.close()
})

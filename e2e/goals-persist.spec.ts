/**
 * B2's first screen off sample data: Goals reads the workspace, and the one
 * target it lets you change survives a reload.
 *
 * ============================================================================
 * The assertion that matters is the absence of the demo
 * ============================================================================
 *
 * `GoalsBoard` still defaults to `SAMPLE_CASCADE` when it is handed no
 * cascade, because the marketing site renders it that way behind a "Sample
 * data" label. The failure this file guards against is that default reaching a
 * signed-in client **unlabelled** — a studio showing somebody else's goal with
 * nothing saying so. So the first test asserts the demo outcome is absent, not
 * merely that some outcome is present.
 */

import { type Browser, expect, type Page, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  readKeyResultTarget,
  seedGoalCascade,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a persistence journey has no viewport in it')

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

/** The demo workspace's outcome, from `SAMPLE_CASCADE`. Must never appear. */
const DEMO_OUTCOME = 'Get more customers from short video'

const NICHE = 'Independent bakery in Leeds'
const OUTCOME = 'Fifty walk-ins a week by March'

/**
 * A signed-in page on a workspace of this test's own.
 *
 * **Not the shared session (D84).** Every test here completes onboarding and
 * seeds a key result, and on one shared workspace those writes pile up: the
 * second test's `getByLabel('Target')` would match the first test's key
 * result. Its own account per test is the only arrangement where each
 * assertion is about what that test did.
 */
async function signedInPage(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'goals')
  const password = testPassword(runId)

  const user = await createConfirmedUser(config, email, password, `E2E ${runId}`)

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  return { page, context, user }
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

test('the Goals screen shows this workspace’s outcome, never the demo’s', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user } = await signedInPage(browser, config)
  await completeOnboarding(page)

  await page.goto('/app/goals')

  // The user's own words, written in onboarding and read back from `goals`.
  await expect(page.getByText(OUTCOME)).toBeVisible()

  // And the demo's, which this screen used to render by default.
  await expect(page.getByText(DEMO_OUTCOME)).toHaveCount(0)

  await context.close()
})

test('an unmeasured key result says so rather than reporting zero', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user } = await signedInPage(browser, config)
  await completeOnboarding(page)

  const seeded = await seedGoalCascade(config, { target: 120, userId: user.id })
  expect(seeded, 'the fixture should have seeded a key result').not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/goals')

  // `metric_snapshots` is empty until B6, so there is no current value. "0 of
  // 120 leads" would say we read the account and found nothing — a reading we
  // never took.
  await expect(page.getByText('Not measured yet').first()).toBeVisible()
  await expect(page.getByText('Ahead of pace')).toHaveCount(0)
  await expect(page.getByText('Behind pace')).toHaveCount(0)

  await context.close()
})

test('a proposed target is written, and is still there after a reload', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user } = await signedInPage(browser, config)
  await completeOnboarding(page)

  const seeded = await seedGoalCascade(config, { target: 120, userId: user.id })
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/goals')

  // `getByRole`, not `getByLabel`. `getByLabel('Target')` matches by substring,
  // and `GoalProgress` draws the outcome bar as a `role="img"` whose aria-label
  // reads "Not measured yet. The target is 120, this quarter." — so the label
  // locator found the bar as well as the field and failed strict mode. The role
  // is what distinguishes the one of them you can type into.
  const target = page.getByRole('spinbutton', { name: 'Target' })
  await expect(target).toHaveValue('120')

  await target.fill('440')
  await page.getByRole('button', { name: 'Propose a new target' }).click()

  // The copy is deliberate: 15 §1 forbids a target reading as a commitment.
  await expect(page.getByText(/still a proposal, not a promise/i)).toBeVisible({ timeout: 20_000 })

  // The claim under test, checked in the database rather than on screen.
  expect(await readKeyResultTarget(config, seeded.keyResultId)).toBe(440)

  // And after a reload, because a figure that only lives in React state is
  // exactly the bug B2 exists to fix.
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'Target' })).toHaveValue('440')

  await context.close()
})

test('a target the parser would refuse is refused with a sentence', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user } = await signedInPage(browser, config)
  await completeOnboarding(page)

  const seeded = await seedGoalCascade(config, { target: 120, userId: user.id })
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/goals')

  // **Not `-40`.** That was the first version of this test and it never reached
  // the server: `min={0}` makes a negative fail the browser's own constraint
  // validation, so the form refuses to submit and the action never runs. The
  // parser's negative branch is therefore unreachable *through this form* — it
  // exists for a crafted POST, and `goal-cascade.test.ts` covers it directly.
  //
  // A value over `MAX_TARGET` (1,000,000,000) is the honest choice here: the
  // field accepts it, the browser submits it, and only the server can refuse
  // it. That is the half this test is for.
  await page.getByRole('spinbutton', { name: 'Target' }).fill('2000000000')
  await page.getByRole('button', { name: 'Propose a new target' }).click()

  await expect(page.getByText(/looks like a typo/i)).toBeVisible({ timeout: 20_000 })

  // Nothing was written.
  expect(await readKeyResultTarget(config, seeded.keyResultId)).toBe(120)

  await context.close()
})

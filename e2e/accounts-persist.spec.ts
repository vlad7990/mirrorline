/**
 * B2.3: the Accounts board reads this workspace's accounts, and shows no figure
 * it does not have.
 *
 * ============================================================================
 * The assertion that matters is a negative one
 * ============================================================================
 *
 * `metric_snapshots` is empty until B6's ingestion, so a connected account has
 * no measurements. The failure to guard against is not an error — it is a
 * **plausible number**: the sample figures in `lib/studio/accounts.ts` beside
 * the client's own handle, which reads as their result whatever label sits next
 * to it (non-negotiable 7).
 *
 * So one test asserts there is **no digit anywhere in the KPI cards**. A unit
 * test can prove the mapper returns `unmeasured`; only a browser can prove
 * nothing downstream formatted a figure anyway.
 *
 * ============================================================================
 * The fixture is the service role, and the Settings spec is the other half
 * ============================================================================
 *
 * A member cannot insert into `social_accounts` — D96 revoked the verbs — so
 * the fixture is the service role. `connect_social_account` is exercised
 * separately, through the Settings card, so the write under test is never also
 * the fixture.
 */

import { type Browser, expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  seedSocialAccount,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a figure is either rendered or it is not, at any width')

/** A handle from `@mirrorline/mock`. Must never appear in a real studio. */
const DEMO_HANDLE = '@thequietpractice'

async function signedInWithAccount(
  browser: Browser,
  config: SupabaseTestConfig,
  status?: string,
) {
  const runId = newRunId()
  const email = testEmail(runId, 'accounts')
  const password = testPassword(runId)

  const user = await createConfirmedUser(config, email, password, `E2E ${runId}`)

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  // After the sign-in, because `ensure_workspace_for_current_user` runs there
  // and the account needs a workspace to belong to.
  const seeded = await seedSocialAccount(config, { userId: user.id, runId, status })

  return { page, context, user, runId, seeded }
}

test('the board shows this workspace’s account, never the demo’s', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInWithAccount(browser, config)
  expect(seeded, 'the accounts fixture should have seeded').not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/accounts')

  // Its own account, by the handle the fixture tagged with this run's id.
  await expect(page.getByText(seeded.handle)).toBeVisible()

  // And none of the demo workspace's. This is the assertion that would have
  // caught the screen still reading `@mirrorline/mock`.
  await expect(page.getByText(DEMO_HANDLE)).toHaveCount(0)

  await context.close()
})

test('a connected account with nothing measured says so, and shows no number', async ({
  browser,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInWithAccount(browser, config)
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/accounts')

  // The four KPI keys are present, so the cards still compare — and every one
  // of them says the same thing.
  const unmeasured = page.getByText('Not measured yet')
  await expect(unmeasured.first()).toBeVisible()
  expect(await unmeasured.count()).toBeGreaterThanOrEqual(4)

  await context.close()
})

test('no KPI card on a real account contains a digit', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInWithAccount(browser, config)
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/accounts')
  await expect(page.getByText('Not measured yet').first()).toBeVisible()

  // `.machine` is this repo's marker for a machine-readable figure: the metric
  // itself, the "vs last week" change, and the freshness line all carry it
  // (`kpi-card.tsx`). Asserting on it rather than on digits in the card's text,
  // because **some digits are legitimate** — "3-second hold" and "sends per 1k"
  // are KPI names, and the first version of this test failed on the account's
  // own handle and connection date. A card with no `.machine` has rendered no
  // figure, which is the actual claim.
  const cards = page.locator('li:not(:has(li))').filter({ hasText: 'Not measured yet' })
  const count = await cards.count()
  expect(count, 'the KPI cards should be on the page to be checked').toBeGreaterThanOrEqual(4)

  for (let index = 0; index < count; index += 1) {
    const figures = cards.nth(index).locator('.machine')
    expect(await figures.count(), `KPI card ${index} rendered a figure`).toBe(0)
  }

  // And the sample figures specifically, since reusing them is the exact
  // shortcut this milestone refused: the three connected mock accounts' hold
  // values. Any of these on a real workspace's screen is somebody else's
  // number beside this client's handle.
  for (const sample of ['51.4', '46.8', '42.1']) {
    await expect(
      page.getByText(sample, { exact: false }),
      `the sample figure ${sample} reached a real account`,
    ).toHaveCount(0)
  }

  await context.close()
})

test('a not-connected account offers the connect prompt instead of empty cards', async ({
  browser,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInWithAccount(browser, config, 'not-connected')
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/accounts')

  // Its handle is still listed — a disconnected account is a different thing
  // from one that never existed.
  await expect(page.getByText(seeded.handle)).toBeVisible()

  // And it has no unmeasured cards: "nothing to measure" and "connect this" are
  // different states, and only one of them has an action.
  await expect(page.getByText('Not measured yet')).toHaveCount(0)

  await context.close()
})

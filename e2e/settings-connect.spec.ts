/**
 * B2.3: Settings connects and disconnects a real account, and a reload agrees.
 *
 * ============================================================================
 * Why a browser test, when the functions already have database ones
 * ============================================================================
 *
 * `rls.db.test.ts` proves `connect_social_account` and
 * `disconnect_social_account` do the right thing when called directly, and
 * `settings-accounts.test.ts` proves the card's rows are built correctly from
 * whatever the table holds. Neither proves the two halves meet: that the
 * handle typed into the card is the handle the action receives, that the action
 * is called at all, and that the row it wrote is what the next load renders.
 *
 * That seam is exactly where B2.3 nearly shipped a bug. The card's callbacks
 * moved from `(accountId)` to `(platform, handle)` (D107) and the board's old
 * one-parameter handlers stayed **assignable**, so typecheck passed on a wiring
 * fault that would have sent a platform where an id was expected. No unit test
 * and no gate could see it. A browser can.
 *
 * ============================================================================
 * The reload is the assertion, and the optimistic update is why
 * ============================================================================
 *
 * `SettingsBoard` flips the row before the server answers and rolls back if it
 * refuses — so a "Connected" chip immediately after the click proves nothing at
 * all. Each test therefore waits for the confirmation toast, reloads, and
 * asserts against a freshly rendered page, which is the only state that has
 * been through the database.
 *
 * `readSocialAccountStatus` is checked as well, with the service role. It is
 * not the claim being made; it is what tells "nothing was written" apart from
 * "written, and the screen did not show it" when one of these goes red.
 *
 * ============================================================================
 * Two tests, and neither one's fixture is its own subject
 * ============================================================================
 *
 * Connect starts from a workspace with **no `social_accounts` rows at all**,
 * which is what a real one starts as: the card's Instagram row is the
 * placeholder `toSettingsAccounts` supplies (D109), and the typed handle is the
 * only account in play.
 *
 * Disconnect starts from a row seeded with the service role, for the same
 * reason the Accounts spec does it that way — a disconnect test that connected
 * through the UI first would fail twice for one cause, and the second failure
 * would be the confusing one.
 */

import { type Browser, type Page, expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  readSocialAccountStatus,
  seedSocialAccount,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a connection round-trip is the same at any width')

/** A handle from `@mirrorline/mock`. Must never appear in a real workspace. */
const DEMO_HANDLE = '@thequietpractice'

/** The row every test here acts on. Not gated, so it carries no standing note. */
const PLATFORM = 'instagram'
const PLATFORM_LABEL = 'Instagram'

async function signedIn(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'settings')
  const password = testPassword(runId)

  const user = await createConfirmedUser(config, email, password, `E2E ${runId}`)

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  // `ensure_workspace_for_current_user` runs on the way in, so the workspace
  // these accounts belong to exists only after this resolves.
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  return { page, context, user, runId }
}

/**
 * The Instagram row inside the Connected accounts card.
 *
 * Scoped to the card rather than to the page: Settings renders eight cards and
 * more than one of them has list items, so an unscoped `li` would match
 * whichever the grid happened to order first.
 */
function instagramRow(page: Page) {
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Connected accounts' }) })

  return card.locator('li').filter({ hasText: PLATFORM_LABEL })
}

/**
 * Wait for the board to have heard back, and fail on a refusal rather than on
 * a timeout.
 *
 * Matching either outcome first is deliberate. Waiting only for the success
 * wording would spend the full timeout on an error and then report a missing
 * locator — which says nothing about *why*, when the error toast on screen
 * carries the action's own sentence.
 */
async function expectToastSaying(page: Page, expected: string) {
  const settled = page.getByText(
    new RegExp(`^${PLATFORM_LABEL} (connected|disconnected|not changed)$`),
  )

  await expect(settled).toBeVisible()
  await expect(page.getByText(`${PLATFORM_LABEL} not changed`)).toHaveCount(0)
  await expect(page.getByText(expected, { exact: true })).toBeVisible()
}

test('a typed handle is connected, and is still connected after a reload', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user, runId } = await signedIn(browser, config)
  const handle = `@e2e_${runId}`

  await page.goto('/app/settings')

  const row = instagramRow(page)
  await expect(row).toHaveCount(1)

  // Nothing stored, so this is the placeholder row: off, and offering a field
  // rather than claiming an account (D109).
  await expect(row.getByText('Off', { exact: true })).toBeVisible()
  await expect(page.getByText(DEMO_HANDLE)).toHaveCount(0)

  const connect = row.getByRole('button', { name: `Connect ${PLATFORM_LABEL}`, exact: true })

  // The field is load-bearing: there is no OAuth to take a handle from (§6), so
  // a Connect with nothing typed would have to invent one.
  await expect(connect).toBeDisabled()

  await row.getByLabel(`${PLATFORM_LABEL} handle`, { exact: true }).fill(handle)
  await expect(connect).toBeEnabled()
  await connect.click()

  await expectToastSaying(page, `${PLATFORM_LABEL} connected`)

  // What the database holds, before anything is re-rendered. See the note at
  // the top: this is the line that names the cause when the reload disagrees.
  expect(
    await readSocialAccountStatus(config, { userId: user.id, platform: PLATFORM, handle }),
    'connect_social_account should have stored the typed handle as connected',
  ).toBe('connected')

  await page.reload()

  const reloaded = instagramRow(page)
  await expect(reloaded.getByText('Connected', { exact: true })).toBeVisible()
  await expect(reloaded.getByText(handle)).toBeVisible()

  // A connected row shows its handle on the line above and offers no field, so
  // the absence of one is how the reload proves this is a stored row rather
  // than the placeholder it started as.
  await expect(reloaded.getByLabel(`${PLATFORM_LABEL} handle`, { exact: true })).toHaveCount(0)
  await expect(
    reloaded.getByRole('button', { name: `Disconnect ${PLATFORM_LABEL}`, exact: true }),
  ).toBeVisible()

  await context.close()
})

test('a disconnected account is still disconnected after a reload', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, user, runId } = await signedIn(browser, config)

  const seeded = await seedSocialAccount(config, { userId: user.id, runId, platform: PLATFORM })
  expect(seeded, 'the accounts fixture should have seeded').not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/settings')

  const row = instagramRow(page)
  await expect(row.getByText('Connected', { exact: true })).toBeVisible()

  await row.getByRole('button', { name: `Disconnect ${PLATFORM_LABEL}`, exact: true }).click()

  await expectToastSaying(page, `${PLATFORM_LABEL} disconnected`)

  expect(
    await readSocialAccountStatus(config, {
      userId: user.id,
      platform: PLATFORM,
      handle: seeded.handle,
    }),
    'disconnect_social_account should have stored not-connected',
  ).toBe('not-connected')

  await page.reload()

  const reloaded = instagramRow(page)
  await expect(reloaded.getByText('Off', { exact: true })).toBeVisible()
  await expect(
    reloaded.getByRole('button', { name: `Disconnect ${PLATFORM_LABEL}`, exact: true }),
  ).toHaveCount(0)

  // The row survives the disconnect and keeps its handle — an account somebody
  // disconnected is a different thing from one that never existed — so the
  // field is back, already filled, and Connect is live again.
  await expect(reloaded.getByText(seeded.handle)).toBeVisible()
  await expect(
    reloaded.getByRole('button', { name: `Connect ${PLATFORM_LABEL}`, exact: true }),
  ).toBeEnabled()

  await context.close()
})

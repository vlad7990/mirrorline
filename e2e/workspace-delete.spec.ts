/**
 * The delete control, carried all the way through — on an account that exists
 * only to be destroyed.
 *
 * ============================================================================
 * Why this needs its own account
 * ============================================================================
 *
 * `workspace-data.spec.ts` proves the *gate*: the control is there, it offers
 * the export, and it refuses the right name in the wrong case. What it
 * deliberately never does is press the button, because it runs on the shared
 * session (D84) — the account every other spec in the run depends on.
 *
 * So this file makes its own. A throwaway user, created through the admin API
 * so no mail is sent, signed in through the real form in its own browser
 * context, and then deleted through the real control. Nothing here touches the
 * shared session, and the account it creates is swept by the same age rule as
 * everything else if any of this fails halfway.
 *
 * ============================================================================
 * What "gone" is allowed to mean
 * ============================================================================
 *
 * The row checks read with the **service role**, not as the user. Reading as
 * the user would be circular: after the account is deleted there is no session,
 * so RLS would return nothing whether the rows were deleted or merely hidden.
 * The service role is the only reader that can tell "destroyed" from
 * "invisible", which is the whole claim being tested.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  findOwnedWorkspaceId,
  newRunId,
  supabaseConfig,
  testEmail,
  testPassword,
  workspaceRowCounts,
} from './helpers/test-accounts'

onlyProject('chromium', 'a destructive account journey has no viewport in it')

test('an owner deletes their workspace, and both it and the account are gone', async ({
  browser,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  /* --- Arrange: an account that exists only for this test ---------------- */

  const runId = newRunId()
  const email = testEmail(runId, 'selfdelete')
  const password = testPassword(runId)
  const workspaceName = `E2E ${runId}`

  const created = await createConfirmedUser(config, email, password, workspaceName)

  // Its own context: no `storageState`, so nothing about the shared session
  // reaches this browser and nothing this browser does reaches the session.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//, { timeout: 30_000 })

  // The workspace is made by `ensure_workspace_for_current_user` during
  // sign-in, so it exists by now. Captured before the deletion, because
  // afterwards there is nothing left to ask for its id.
  const workspaceId = await findOwnedWorkspaceId(config, created.id)
  expect(workspaceId, 'the signed-in user should own a workspace').not.toBeNull()
  if (workspaceId === null) return

  const before = await workspaceRowCounts(config, workspaceId)
  expect(before.workspaces, 'the workspace should exist before it is deleted').toBe(1)
  expect(before.memberships, 'the owner membership should exist before deletion').toBe(1)

  /* --- Act: delete it through the control a client would use ------------- */

  await page.goto('/app/settings')

  await page
    .getByRole('region', { name: 'Delete this workspace' })
    .getByRole('button', { name: 'Delete this workspace' })
    .click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: `Delete ${workspaceName}?` })).toBeVisible()

  await dialog.getByRole('textbox').fill(workspaceName)

  const confirm = dialog.getByRole('button', { name: 'Delete this workspace' })
  await expect(confirm).toBeEnabled()
  await confirm.click()

  // The action signs out and redirects. Generous, like every other assertion
  // that waits on a server action reaching a Postgres in another region.
  await page.waitForURL(/\/sign-in/, { timeout: 30_000 })

  /* --- Assert: the rows are gone ----------------------------------------- */

  const after = await workspaceRowCounts(config, workspaceId)

  for (const [table, count] of Object.entries(after)) {
    expect(count, `${table} still has rows after the workspace was deleted`).toBe(0)
  }

  /* --- Assert: the account cannot sign in -------------------------------- */

  // D80: the last workspace takes the `auth.users` row with it. The honest
  // proof is the front door, not an admin lookup — a user who cannot sign in
  // with the right password is the thing the client actually cares about.
  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // The one deliberately uninformative sentence every failed sign-in gets — a
  // deleted account must not be distinguishable from a wrong password, or the
  // form becomes a way to enumerate addresses.
  await expect(page.getByText('We could not sign you in with those details')).toBeVisible({
    timeout: 30_000,
  })
  await expect(page).toHaveURL(/\/sign-in/)

  await context.close()
})

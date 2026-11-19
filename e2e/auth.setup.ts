import { expect, test as setup } from '@playwright/test'

import {
  createConfirmedUser,
  newRunId,
  STUDIO_STORAGE_STATE,
  supabaseConfig,
  testEmail,
  testPassword,
  writeRunId,
} from './helpers/test-accounts'

/**
 * Sign in once, so the rest of the suite can see the studio.
 *
 * A Playwright *setup project*: it runs before the others, which list it in
 * `dependencies`. The session it saves is reused rather than re-established
 * per spec, which matters because every sign-in is a real password grant
 * against the real project.
 *
 * ============================================================================
 * Why it signs in through the form rather than injecting a token
 * ============================================================================
 *
 * The account is created through the **admin** API, because the public sign-up
 * endpoint sends mail and that sender is rate-limited (D79, D84). But the
 * *sign-in* goes through the actual page: fill the fields, press the button,
 * wait for the studio.
 *
 * Minting a session over the API and writing the cookies by hand would be
 * faster and would test nothing. This way the one thing every other spec now
 * depends on — that a person can sign in — is asserted before any of them run,
 * and when it breaks the failure arrives here instead of as two hundred
 * confusing redirects.
 */
setup('sign in and save the session', async ({ page }) => {
  const config = supabaseConfig()

  // Fail rather than skip. A suite that quietly ran the whole studio
  // unauthenticated would report a wall of redirects and bury the cause.
  expect(
    config,
    'The e2e suite needs the Supabase keys in apps/web/.env.local — see docs/plan/BACKEND_PHASE.md §7.',
  ).not.toBeNull()
  if (config === null) return

  const runId = newRunId()
  // The teardown runs in its own process and cannot see this variable, so the
  // id goes to disk. Without it the sweep would only know the age rule, and
  // this run's own accounts would survive until they were two hours old.
  writeRunId(runId)

  const email = testEmail(runId)
  const password = testPassword(runId)

  await createConfirmedUser(config, email, password, `E2E ${runId}`)

  await page.goto('/sign-in')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)

  // Ticked on purpose: the saved state has to survive being loaded into a
  // fresh browser context, and an unticked box makes a session cookie the
  // browser drops on close (D58, `lib/supabase/cookie-policy.ts`).
  await page.getByLabel('Keep me signed in on this device').check()

  await page.getByRole('button', { name: 'Sign in' }).click()

  // The studio home is where sign-in lands. Waiting on the URL rather than a
  // selector keeps this independent of whatever the studio renders.
  await page.waitForURL(/\/app\/home/, { timeout: 30_000 })

  await page.context().storageState({ path: STUDIO_STORAGE_STATE })
})

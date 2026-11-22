import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { expect, test as setup } from '@playwright/test'

import {
  createConfirmedUser,
  newRunId,
  seedScheduledPosts,
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

  /**
   * No keys, and the caller said that is expected: skip rather than fail.
   *
   * **Opt-in, and the default is still to fail.** A developer whose keys have
   * gone missing wants the loud version — the sentence below, once, rather
   * than a wall of redirects six specs later. Only a caller that has
   * deliberately set `E2E_ALLOW_NO_SUPABASE` gets the quiet one, and the CI
   * job that sets it runs the half of the suite needing no session at all:
   * the marketing site, the co-pilot in sample mode, routing, accessibility
   * and responsive behaviour.
   *
   * **An empty storage state is written anyway**, because `storageState`
   * names a file that must exist — every dependent project fails to start
   * without it, which would turn a clean skip back into a wall of failures.
   * Empty is the honest content: there is no session, and the studio specs
   * skip themselves on the same missing config.
   */
  if (config === null && process.env.E2E_ALLOW_NO_SUPABASE === '1') {
    mkdirSync(dirname(STUDIO_STORAGE_STATE), { recursive: true })
    writeFileSync(STUDIO_STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }), 'utf8')
    setup.skip(true, 'No Supabase keys, and E2E_ALLOW_NO_SUPABASE=1: the studio specs skip.')
    return
  }

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

  const user = await createConfirmedUser(config, email, password, `E2E ${runId}`)

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

  /**
   * The calendar's week, seeded here rather than per spec (B2.2).
   *
   * Until B2.2 the calendar read `@mirrorline/mock`, so every spec that opened
   * `/app/calendar` found a full grid whoever was signed in. It now reads this
   * workspace's `scheduled_posts`, and **nothing authors one**: there is no
   * insert policy, by design — the pipeline writes posts and a member may only
   * move them (D95). So a fresh account's calendar is empty, and the specs that
   * drag a chip, screenshot the grid or audit it for accessibility would all
   * fail on an empty week rather than on anything true.
   *
   * It belongs in setup because it is a property of *the session those specs
   * share*. Seeding per spec would put five more posts on the same workspace
   * each time and make "the chip I moved" ambiguous — the problem D84 hit from
   * the other direction.
   *
   * A failure here fails the setup, which fails every dependent project. That
   * is intended: a silently unseeded calendar is a wall of confusing failures
   * in six specs, and this is the one place that can say why.
   */
  const seeded = await seedScheduledPosts(config, { userId: user.id, runId })

  expect(
    seeded,
    'The calendar fixture did not seed. Check that 20261119030000_scheduled_posts_and_moves.sql and 20261119080000_scheduled_posts_ai_scenes.sql are applied to this project.',
  ).not.toBeNull()
})

/**
 * Where an emailed link actually lands (D101).
 *
 * ============================================================================
 * The bug this exists for
 * ============================================================================
 *
 * Confirming an address put people on the **marketing home page** instead of
 * onboarding. Nothing in the callback was wrong: the `emailRedirectTo` the
 * sign-up sent carried Vercel's per-deployment hostname, which is in no
 * project's redirect allow-list, so Supabase discarded it and fell back to the
 * Site URL.
 *
 * That is a failure no unit test can see — it needs a real link, minted the way
 * the email mints it and followed the way a person follows it. So the first
 * test does exactly that, and the rest cover the guard on the way back in.
 *
 * ============================================================================
 * Why the link is generated rather than emailed
 * ============================================================================
 *
 * `generate_link` returns the same URL the email would carry without sending
 * one: the sender is rate-limited (D79), and a test that read a mailbox would
 * be testing the mailbox. Everything after the click is identical.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  generateSignupLink,
  newRunId,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a redirect is a property of the router, not of the viewport')

/**
 * Signed out, for the whole file.
 *
 * The suite's saved session would hide every failure here. A signed-in visitor
 * sent to `/sign-in` is bounced straight to `/app/home` by the middleware — so
 * "the callback refused a dead link" and "the callback honoured it" would both
 * end on the studio home and look identical. Found the hard way: the stale-code
 * test passed through to `/app/home` and asserted nothing.
 */
test.use({ storageState: { cookies: [], origins: [] } })

/** The notice `/auth/callback` sends a dead link to. */
const LINK_FAILED = 'that-link-did-not-work'

/**
 * Does this project's allow-list honour a callback **at our path**?
 *
 * Asked by following the verify link without a browser and reading the one
 * header that answers it. Supabase sends the browser to `redirect_to` when the
 * URL is allowed and somewhere else when it is not, and the difference is the
 * whole bug.
 *
 * **The path is the assertion, not the origin.** The first version of this
 * compared origins and passed while the link landed on
 * `http://localhost:3000/#access_token=…` — our origin, with `/auth/callback`
 * silently dropped, because an allow-list entry of `http://localhost:3000`
 * without `/**` matches the origin and rewrites the path. That is the
 * production symptom exactly: the right host, the home page, no error
 * anywhere.
 *
 * It burns the link it is given — these tokens are one-time — which is why the
 * caller mints a second for the real assertion.
 */
async function redirectHonoured(link: string, ourOrigin: string): Promise<boolean> {
  const response = await fetch(link, { redirect: 'manual' })
  const location = response.headers.get('location')
  if (location === null) return false

  try {
    const target = new URL(location)
    return target.origin === ourOrigin && target.pathname === '/auth/callback'
  } catch {
    return false
  }
}

test('a real confirmation link lands on onboarding, not on the home page', async ({
  page,
  baseURL,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const origin = new URL(baseURL ?? 'http://localhost:3000').origin

  // The URL the sign-up action builds: `lib/auth/callback-url.ts`, with the
  // destination `CALLBACK_DESTINATIONS.signUp`.
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/app/onboarding')}`

  async function mint(label: string): Promise<string | null> {
    const runId = newRunId()
    return generateSignupLink(config, {
      email: testEmail(runId, label),
      password: testPassword(runId),
      redirectTo,
    })
  }

  const probe = await mint('callback-probe')
  expect(probe, 'the admin API minted no link — check the service-role key').not.toBeNull()
  if (probe === null) return

  // Skipped rather than failed when the project has not been configured: this
  // is a missing entry in the Supabase redirect allow-list, not a regression in
  // the code, and a red test here would point at the wrong thing. Named in full
  // so the fix is the message rather than an investigation.
  const honoured = await redirectHonoured(probe, origin)
  test.skip(
    !honoured,
    `This project's redirect allow-list does not include ${origin}/auth/callback, so Supabase fell back to the Site URL. Add "${origin}/**" to Authentication → URL Configuration → Redirect URLs. See docs/PROGRESS.md, "the two commands".`,
  )

  const link = await mint('callback')
  expect(link).not.toBeNull()
  if (link === null) return

  await page.goto(link)

  // The assertion the bug would have failed. Landing on `/` means Supabase
  // discarded `redirect_to` and used the Site URL — the exact symptom, and the
  // reason this asserts the destination rather than merely "not an error".
  await expect(page).toHaveURL(/\/app\/onboarding/, { timeout: 30_000 })

  // And the link signed them in, rather than bouncing them to sign-in.
  await expect(page).not.toHaveURL(/\/sign-in/)
})

test('a link with no code says so, rather than pretending to sign anybody in', async ({
  page,
}) => {
  await page.goto('/auth/callback')

  await expect(page).toHaveURL(new RegExp(`/sign-in\\?notice=${LINK_FAILED}`))
})

test('a stale code lands on the notice, not on the destination it asked for', async ({ page }) => {
  // The common case by a wide margin: people open mail twice, and scanners
  // follow links before anybody clicks them.
  await page.goto(`/auth/callback?code=not-a-real-code&next=${encodeURIComponent('/app/goals')}`)

  await expect(page).toHaveURL(new RegExp(`/sign-in\\?notice=${LINK_FAILED}`))
  await expect(page).not.toHaveURL(/\/app\/goals/)
})

test('an off-site next never leaves our origin', async ({ page, baseURL }) => {
  // The open-redirect attempt this guard exists for: a link that signs somebody
  // in for real and then hands them to a convincing fake. `resolveNextPath`
  // falls back to the studio home rather than repairing the destination.
  const ourHost = new URL(baseURL ?? 'http://localhost:3000').host

  for (const hostile of [
    'https://evil.example/login',
    // Protocol-relative: a browser reads this as another origin.
    '//evil.example/login',
    // Some browsers normalise the backslash to a slash.
    '/\\evil.example',
    'javascript:alert(1)',
  ]) {
    await page.goto(`/auth/callback?next=${encodeURIComponent(hostile)}`)

    // Compared against *our* host, not against itself: the point is that the
    // browser is still here, and only a real origin makes that assertion mean
    // anything.
    expect(new URL(page.url()).host, `${hostile} escaped the origin`).toBe(ourHost)
  }
})

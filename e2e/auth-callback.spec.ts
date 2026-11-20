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
 * the email mints it, and the question of where Supabase sends it. So the first
 * test asks exactly that, and the rest cover the guard on the way back in. The
 * note above that test explains why it stops at the callback.
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
 * Where Supabase actually sends the browser, read from the one header that
 * says so.
 *
 * Following the verify link without a browser is the point: the answer sits in
 * the `Location` of the 303, before any of our code runs, so a wrong answer
 * cannot be mistaken for a routing mistake of ours. It burns the link — these
 * tokens are one-time — so the caller gets one use of it.
 *
 * **The path is the assertion, not the origin.** The first version of this
 * compared origins and passed while the link landed on
 * `http://localhost:3000/#access_token=…` — our origin, with `/auth/callback`
 * silently dropped. That is the production symptom exactly: the right host,
 * the home page, no error anywhere.
 */
async function callbackDestination(link: string): Promise<string | null> {
  const response = await fetch(link, { redirect: 'manual' })
  const location = response.headers.get('location')
  if (location === null) return null

  try {
    const target = new URL(location)
    return `${target.origin}${target.pathname}`
  } catch {
    return null
  }
}

/**
 * Which `redirect_to` survived the mint — a different question from where the
 * link goes.
 *
 * Supabase echoes the value it accepted back into the action link, so this
 * separates "the allow-list refused our URL" from "the browser went somewhere
 * unexpected afterwards". It is the signal that caught the placement bug
 * described on `generateSignupLink`.
 */
function acceptedRedirect(link: string): string | null {
  try {
    return new URL(link).searchParams.get('redirect_to')
  } catch {
    return null
  }
}

/**
 * Why this stops at the callback rather than following through to onboarding.
 *
 * An admin-minted link cannot complete our callback, and no configuration
 * changes that. `createServerClient` fixes `flowType: 'pkce'`, so a real
 * sign-up stores a verifier and its emailed link comes back with `?code=`,
 * which `/auth/callback` exchanges. `generate_link` never saw a
 * `code_challenge`, so GoTrue issues the implicit grant instead and returns
 * the tokens in the **fragment** — which a browser never sends to a server, so
 * the callback sees no code and correctly refuses the link.
 *
 * That makes the last hop unreachable here and the first hop the only thing
 * worth asserting — and the first hop is the bug: D101 was a link that went to
 * the Site URL instead of to us. `sign-up-ui.spec.ts` covers code-for-session
 * with a real sign-up, which is why that one needs a real mailbox.
 */
test('a real confirmation link is sent to our callback, not to the home page', async ({
  baseURL,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const origin = new URL(baseURL ?? 'http://localhost:3000').origin

  // The URL the sign-up action builds: `lib/auth/callback-url.ts`, with the
  // destination `CALLBACK_DESTINATIONS.signUp`.
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/app/onboarding')}`

  const runId = newRunId()
  const link = await generateSignupLink(config, {
    email: testEmail(runId, 'callback'),
    password: testPassword(runId),
    redirectTo,
  })
  expect(link, 'the admin API minted no link — check the service-role key').not.toBeNull()
  if (link === null) return

  // Skipped rather than failed when the project has not been configured: a
  // missing entry in the Supabase redirect allow-list is not a regression in
  // the code, and a red test here would point at the wrong thing. Named in
  // full so the fix is the message rather than an investigation.
  const accepted = acceptedRedirect(link)
  test.skip(
    accepted !== redirectTo,
    `Supabase did not accept ${redirectTo} — it minted the link with ${accepted ?? '(none)'}, which is the Site URL fallback. Either this project's redirect allow-list is missing "${origin}/**" (Authentication → URL Configuration → Redirect URLs), or the request put "redirect_to" where GoTrue does not read it — see generateSignupLink. docs/PROGRESS.md has both.`,
  )

  // The assertion the bug would have failed. `${origin}/` means Supabase
  // discarded `redirect_to` and used the Site URL — the exact symptom, and the
  // reason this asserts the destination rather than merely "not an error".
  expect(await callbackDestination(link)).toBe(`${origin}/auth/callback`)
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

import { expect, test } from '@playwright/test'

import {
  deleteTestAccounts,
  newRunId,
  probeSignUp,
  signupUiEmail,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

/**
 * The sign-up form, submitted for real, once.
 *
 * `demo-path.spec.ts` used to do this as step one of the journey, back when the
 * form checked nothing. It cannot any more: the journey runs signed in, and a
 * real sign-up sends a confirmation mail through a rate-limited sender. So the
 * form gets a spec of its own, and the journey gets a session.
 *
 * ============================================================================
 * Why this skips instead of failing
 * ============================================================================
 *
 * D79 keeps auth mail on Supabase's built-in sender, which allows only a
 * handful of messages an hour, and every sign-up here spends one. Run the suite
 * twice in quick succession and the second run gets
 * `429 email rate limit exceeded` — **a fact about the sender, not about our
 * code**. A red test meaning "try again later" teaches people to ignore red
 * tests.
 *
 * So on the failure path it asks Supabase what actually went wrong and skips
 * **only** for the rate limit. Anything else still fails, loudly, with the
 * reason attached. **Adding Resend SMTP once there is a domain removes the
 * limit and this skip stops happening** (D79, D84).
 */
test.describe('/sign-up, submitted for real', () => {
  // Signed out: the suite's default session would bounce us to the studio
  // before the form ever rendered.
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('refuses to proceed without the rights confirmation', async ({ page }) => {
    // Arrange — non-negotiable 1, enforced on the way in rather than merely
    // described. This assertion moved here from the demo path; it is not new,
    // and it did not stop being tested when the journey changed.
    await page.goto('/sign-up')
    await expect(page.getByRole('heading', { level: 1, name: 'Set up your studio' })).toBeVisible()

    const runId = newRunId()
    await page.getByLabel('Your name').fill('End to end')
    await page.getByLabel('Work email').fill(testEmail(runId, 'rights'))
    await page.getByLabel('Workspace name').fill(`E2E ${runId}`)
    await page.getByLabel('Password', { exact: true }).fill(testPassword(runId))

    const rights = page.getByRole('checkbox', { name: RIGHTS_LABEL })
    await expect(rights).not.toBeChecked()

    // Act
    await page.getByRole('button', { name: 'Create your workspace' }).click()

    // Assert — Next ships its own role="alert" route announcer, so filter by
    // the copy rather than taking the first alert on the page.
    await expect(
      page.getByRole('alert').filter({ hasText: 'We can only work from material you own' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  test('creates an account and asks the person to check their email', async ({ page }) => {
    const config = supabaseConfig()
    test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
    if (config === null) return

    // **This is the only test that sends real mail**, so it is the only one
    // that may not invent an address. Every other account here is made through
    // the admin API, which sends nothing and so can use the unregistrable
    // `.invalid` placeholder.
    const runId = newRunId()
    const email = signupUiEmail(runId)

    test.skip(
      email === null,
      'E2E_SIGNUP_EMAIL is not set. This test submits the real sign-up form, which sends a ' +
        'confirmation email — so it needs an address on a mailbox you own (a plus-address is ' +
        'ideal: you+mirrorline@example.com). Set E2E_SIGNUP_EMAIL and re-run. Without it there ' +
        'is no address we can mail without guessing whose inbox it reaches.',
    )
    if (email === null) return

    // Arrange
    const password = testPassword(runId)

    await page.goto('/sign-up')
    await page.getByLabel('Your name').fill('End to end')
    await page.getByLabel('Work email').fill(email)
    await page.getByLabel('Workspace name').fill(`E2E ${runId}`)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('checkbox', { name: RIGHTS_LABEL }).check()

    // Act
    await page.getByRole('button', { name: 'Create your workspace' }).click()

    const checkEmail = page.getByRole('heading', { name: 'Check your email' })
    const somethingWentWrong = page
      .getByRole('alert')
      .filter({ hasText: 'Something went wrong at our end' })

    // Race the two outcomes: a rate-limited run then reaches the
    // classification below in a second, rather than after a 30s timeout.
    await expect(checkEmail.or(somethingWentWrong).first()).toBeVisible({ timeout: 30_000 })

    if (await checkEmail.isVisible()) {
      // Assert — the confirmation path. There is no session yet, so the
      // workspace is not created until the link is followed; `/auth/callback`
      // is what does it.
      await expect(page.getByText('Check your email for a link to confirm')).toBeVisible()

      // **Clean up immediately, not at teardown.** The address lives in
      // somebody's real inbox, and the configured base address is fixed — so
      // an account left behind would also make the next run fail with "a user
      // with this email already exists". The sweep still catches it if this
      // line is never reached.
      await deleteTestAccounts(config, runId)
      return
    }

    // The UI shows one deliberately opaque sentence for every unexpected
    // failure, which is right for a person and useless here. Ask the source.
    //
    // The probe goes to the same owned mailbox, one label along: it hits the
    // public endpoint too, so it must not be an address we do not own either.
    const probe = await probeSignUp(config, signupUiEmail(runId, 'probe') ?? email, password)

    test.skip(
      probe.isRateLimited,
      `Supabase's built-in email sender is rate-limited (${probe.reason}). That is D79's known limitation rather than a regression — adding Resend SMTP once we have a domain removes it. Re-run in an hour to exercise this path.`,
    )

    // Anything else is a real failure, with the reason attached so nobody has
    // to guess which of the two it was.
    throw new Error(`Sign-up failed for a reason other than the rate limit: ${probe.reason}`)
  })
})

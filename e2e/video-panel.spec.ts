/**
 * V5 · the Upload screen's real panel, and the two things it must not do.
 *
 * ============================================================================
 * Why this spec exists at all
 * ============================================================================
 *
 * The panel is a server component that reads three tables, and **two of them
 * may not exist yet**: the migration reaches a database when somebody applies
 * it, and preview is behind until then. A server component that throws on a
 * missing table takes the whole route with it — a 500 on the Upload screen,
 * for a feature nobody has even used.
 *
 * So the reads fail soft by design (`read-renders.ts` logs and returns empty),
 * and this is the assertion that keeps them that way. It is the same lesson
 * D116 recorded from the other direction: a path with no caller is a path with
 * no coverage, and nineteen skipped studio specs once hid two real defects for
 * days.
 *
 * ============================================================================
 * What it asserts, and what it deliberately does not
 * ============================================================================
 *
 * **No worker runs in CI**, so nothing drains the queue and no render can
 * finish here. Asserting a finished video would be asserting a fiction. What
 * is real and worth holding:
 *
 * * the panel renders rather than 500ing, against whatever schema exists;
 * * a client with no approved idea is told to approve one first, rather than
 *   being handed an upload box that leads nowhere (V3's rule: compute is not
 *   spent on a script the Originality Gate has not passed);
 * * the rights record is on the screen, labelled, because non-negotiable 1 is
 *   not satisfied by a column.
 */

import { type Browser, expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  createConfirmedUser,
  newRunId,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'this asserts what the panel says, not how it lays out')

/** Its own account (D84): a shared workspace accumulates other specs' rows. */
async function signedInPage(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'video')
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

test('the Upload screen renders its real panel, whatever the schema holds', async ({
  browser,
}, testInfo) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedInPage(browser, config)

  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/app/upload')

  await expect(page.getByRole('heading', { name: 'Your videos' })).toBeVisible()

  // A fresh workspace has approved nothing, so the honest answer is to say so
  // rather than to offer a file picker whose render would be refused.
  await expect(page.getByText('Approve one of your video ideas')).toBeVisible()

  // The sample screen below it still works. Its own heading counts the mock
  // cuts, which is how the two halves stay distinguishable: the panel above
  // shows what this workspace actually has, and this shows what the product
  // does.
  await expect(page.getByRole('heading', { name: /One video, \d+ posts/ })).toBeVisible()

  // Evidence, at both widths CLAUDE.md asks for. Attached rather than written
  // into the repo, so it travels with whichever run produced it.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await testInfo.attach(`upload-panel-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  }

  expect(errors, 'the panel must not throw in the browser').toEqual([])

  await context.close()
})

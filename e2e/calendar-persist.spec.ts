/**
 * B2.2: the calendar reads this workspace's posts, and a move survives a
 * reload.
 *
 * ============================================================================
 * Why this is a second calendar spec rather than more tests in the first
 * ============================================================================
 *
 * `calendar-reschedule.spec.ts` is about the two *paths* — the drag and the
 * menu — and runs on the suite's shared session, where its assertions are
 * counts of chips in cells. This one is about the *write*: it needs its own
 * account so that "the post I moved" is unambiguous, and it checks the database
 * rather than the grid, because a grid agreeing with React state is exactly
 * what B2.2 exists to stop being enough.
 *
 * ============================================================================
 * The fixture is the service role, and that is not a shortcut
 * ============================================================================
 *
 * Nothing can author a scheduled post as a user: there is no insert policy on
 * `scheduled_posts` at all, because the pipeline writes posts and a member may
 * only move one (D95). So the fixture has to be the service role — and that
 * keeps it out of the thing under test, since the move itself runs as the
 * signed-in user, under RLS, through the same action the drag uses.
 */

import { type Browser, expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import {
  countPostMoves,
  createConfirmedUser,
  newRunId,
  readScheduledPostSlot,
  seedScheduledPosts,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'a persistence journey has no viewport in it')

/** A title from `@mirrorline/mock`'s week. Must never appear in the studio. */
const DEMO_TITLE = 'Why your best people go quiet'

/**
 * A signed-in page on a calendar of this test's own.
 *
 * Not the shared session, for the reason `goals-persist.spec.ts` gives: these
 * tests move posts, and on one shared workspace the second test could not tell
 * its own move from the first test's.
 */
async function signedInCalendar(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'calendar')
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
  // and the posts need a workspace to belong to.
  const seeded = await seedScheduledPosts(config, { userId: user.id, runId })

  return { page, context, user, runId, seeded }
}

test('the calendar shows this workspace’s posts, never the demo’s', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInCalendar(browser, config)
  expect(seeded, 'the calendar fixture should have seeded').not.toBeNull()
  if (seeded === null) return

  await page.goto('/app/calendar')

  // Its own post, by the title the fixture tagged with this run's id.
  await expect(page.getByRole('button', { name: new RegExp(seeded.firstTitle) })).toBeVisible()

  // And none of the week the fixtures used to draw. This is the assertion that
  // would have caught the studio still reading `@mirrorline/mock`.
  await expect(page.getByText(DEMO_TITLE)).toHaveCount(0)

  await context.close()
})

test('a moved post is still moved after a reload, and the audit recorded it', async ({
  browser,
}) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInCalendar(browser, config)
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  const postId = seeded.postIds[0] ?? ''
  const before = await readScheduledPostSlot(config, postId)
  expect(before, 'the seeded post should be readable').not.toBeNull()
  if (before === null) return

  await page.goto('/app/calendar')

  // Select the fixture's first post, then move it with the menu — the no-drag
  // path, which is also the one WCAG 2.5.7 requires to exist.
  await page.getByRole('button', { name: new RegExp(seeded.firstTitle) }).click()
  await expect(page.getByRole('heading', { name: 'Move to…' })).toBeVisible()

  const move = page.getByRole('button', { name: /Move post|Already there/ })
  await expect(move).toBeDisabled()

  // The last day in the week, which is never the Monday the fixture seeded.
  await page.getByLabel('Day', { exact: true }).click()
  const days = page.getByRole('option')
  await expect(days.first()).toBeVisible()
  await days.nth((await days.count()) - 1).click()

  await expect(move).toBeEnabled()
  await move.click()

  // The confirmation claims a save, and the next two assertions are what make
  // that claim checkable.
  await expect(page.getByRole('status').filter({ hasText: /Moved to/ })).toContainText(
    'Saved to your schedule',
    { timeout: 20_000 },
  )

  // In the database, read with the service role so RLS cannot mask a failure.
  await expect
    .poll(async () => (await readScheduledPostSlot(config, postId))?.date, { timeout: 20_000 })
    .not.toBe(before.date)

  // The trigger wrote the audit — not the action. `record_post_move()` fires on
  // the update, which is why no code path can move a post and forget (D95).
  expect(await countPostMoves(config, postId)).toBe(1)

  // And the part that was impossible before B2.2: it is still moved on a fresh
  // render, with the optimistic map gone.
  await page.reload()

  const after = await readScheduledPostSlot(config, postId)
  expect(after).not.toBeNull()

  const cell = page.locator(`[data-drop-cell="instagram|${after?.date ?? ''}"]`)
  await expect(cell.getByRole('button', { name: new RegExp(seeded.firstTitle) })).toHaveCount(1)

  await context.close()
})

test('moving a post to where it already is writes nothing', async ({ browser }) => {
  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context, seeded } = await signedInCalendar(browser, config)
  expect(seeded).not.toBeNull()
  if (seeded === null) return

  const postId = seeded.postIds[0] ?? ''

  await page.goto('/app/calendar')
  await page.getByRole('button', { name: new RegExp(seeded.firstTitle) }).click()
  await expect(page.getByRole('heading', { name: 'Move to…' })).toBeVisible()

  // The menu opens describing where the post is, so the button is disabled —
  // the UI's own refusal to confirm something that would not happen.
  await expect(page.getByRole('button', { name: 'Already there' })).toBeDisabled()

  // And nothing reached the audit, which is the claim that matters: a no-op
  // that still wrote a row would make the audit unreadable.
  expect(await countPostMoves(config, postId)).toBe(0)

  await context.close()
})

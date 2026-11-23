/**
 * The sales demo, start to finish, in one run.
 *
 * sign up → onboarding (3 steps) → home → upload → trends → remake →
 * calendar → results → agents.
 *
 * Every step asserts something a buyer would actually look at: a real number, a
 * status word, a gated button. The fixtures in @mirrorline/mock are fully
 * deterministic (no Date.now, no Math.random), so any flake here is a bug in
 * this file, not in the data.
 */

import { type Browser, expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { REMAKE_TREND_ID } from './helpers/routes'
import {
  createConfirmedUser,
  newRunId,
  type SupabaseTestConfig,
  supabaseConfig,
  testEmail,
  testPassword,
} from './helpers/test-accounts'

onlyProject('chromium', 'The demo is walked once, at the 1440x900 sales viewport.')

/** The walk crosses nine screens; one default timeout is not enough. */
const WALK_TIMEOUT_MS = 180_000

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

/**
 * A signed-in page on a workspace of this walk's own.
 *
 * ============================================================================
 * Why this is not the shared session, and why it was red six days in seven
 * ============================================================================
 *
 * This file's comments said "this walk is about a fresh account" while the
 * test took the bare `page` fixture — and every project in
 * `playwright.config.ts` defaults to `STUDIO_STORAGE_STATE`, so the walk ran
 * on the **shared studio account**. That account is not fresh:
 * `auth.setup.ts` seeds `scheduled_posts` into it, four posts a day for the
 * seven days of the current UTC week, because six other specs need a calendar
 * with something in it.
 *
 * So the batch-bar step below — "Nothing is scheduled for tomorrow yet." —
 * could only pass when *tomorrow* fell outside that seeded week, which is
 * true on exactly one day: **Sunday UTC**, where tomorrow is the Monday of a
 * week nothing has seeded. On the other six it read "Tomorrow: 3 posts
 * ready." and this spec was red.
 *
 * That is what happened to #17. The run that first went red had crossed
 * midnight UTC into Monday; the green runs earlier the same day were Sunday
 * UTC. It reproduced on a re-run alone on the database, which correctly
 * killed the concurrency theory (D76) — and it was never worker ordering
 * either, which was the next guess. **It was the clock**, and waiting an hour
 * would have turned any theory green.
 *
 * Its own account removes the variable rather than tolerating it: a workspace
 * nothing else writes to has an empty calendar on every day of the week.
 *
 * The cost is one admin-API account creation and one sign-in through the form,
 * in the slowest spec in the suite. Worth it — the alternative was relaxing
 * the assertion, and the bug it guards is a bar claiming *0 videos approved*
 * for a week with nothing in it (step 9).
 */
async function signedInPage(browser: Browser, config: SupabaseTestConfig) {
  const runId = newRunId()
  const email = testEmail(runId, 'demo')
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

/** The studio sidebar nav. Scoping to it keeps link names unambiguous. */
function studioNav(page: Page) {
  return page.getByRole('navigation', { name: 'Studio' })
}

/**
 * Click a sidebar item and return once that screen is the one we are on.
 *
 * The click used to be the whole of this, and the caller's next assertion
 * raced the navigation: when it lost, the failure read "heading not visible",
 * which points at the screen rather than at the arrival. `aria-current` is the
 * app's own statement about where the reader is — the same attribute the
 * sliding marker measures from — so waiting for it is waiting for the
 * navigation to have committed, with no timeout raised and no retry added.
 */
async function openFromSidebar(page: Page, label: string): Promise<void> {
  const item = studioNav(page).getByRole('link', { name: label, exact: true })
  await item.click()
  await expect(item).toHaveAttribute('aria-current', 'page')
}

function heading(page: Page, name: string | RegExp) {
  return page.getByRole('heading', { level: 1, name })
}

test('the whole demo path holds up', async ({ browser }) => {
  test.setTimeout(WALK_TIMEOUT_MS)

  const config = supabaseConfig()
  test.skip(config === null, 'No Supabase keys in apps/web/.env.local')
  if (config === null) return

  const { page, context } = await signedInPage(browser, config)

  /* --- 1. Already signed in --------------------------------------------- */

  /**
   * This journey used to begin by filling in the sign-up form, which worked
   * because the form checked nothing and walked into the studio. B1 made it
   * real, and two things follow:
   *
   * - **`/sign-up` now redirects a signed-in visitor away.** `signedInPage`
   *   above has just signed this walk's own account in, so arriving here lands
   *   in the studio rather than on the form.
   * - **Signing up for real cannot be part of this journey.** It sends a
   *   confirmation mail through a rate-limited sender (D79, D84), so repeating
   *   it every run would fail on the sender rather than on anything we wrote.
   *
   * The form has its own spec: `sign-up-ui.spec.ts` submits it signed out and
   * asserts the "check your email" screen, and the rights-checkbox enforcement
   * that used to live here moved there with it. **Nothing about
   * non-negotiable 1 stopped being tested** — it is tested where the form is.
   */
  await page.goto('/sign-up')
  await expect(page).toHaveURL(/\/app\//)

  await page.goto('/app/onboarding')

  /* --- 2. Onboarding step 1: brand, with the live preview ---------------- */

  await expect(heading(page, 'Your brand')).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Setup steps' }).getByRole('button', {
      name: /Step 1 of 3/,
    }),
  ).toHaveAttribute('aria-current', 'step')

  // `region`, not `complementary`: this was an `aside` inside `main`, which is
  // a landmark inside a landmark and an axe `moderate` — blocking since D75.
  // It is a labelled `section` now, which keeps the name this locator needs.
  const preview = page.getByRole('region', { name: 'Live preview', exact: true })
  // The frame sits on the viewer mat (DESIGN.md "Colors — Viewer"), so the
  // brand colour is on the inner card, not the outer div. Anchor on the one
  // element that carries it as an inline style.
  const previewCard = preview.locator('div[style*="background-color"]').first()

  // Deep teal is the default, straight from the brand kit fixture.
  await expect(previewCard).toHaveCSS('background-color', 'rgb(18, 84, 90)')
  await expect(preview).toContainText('Calm, direct, warm.')

  // The whole point of step 1: the preview repaints as the brand changes.
  // Driven by keyboard because the radio input itself is sr-only — the visible
  // pill is its label, so a synthetic click on the input is intercepted by the
  // swatch. Arrow keys are how the control is meant to be used anyway.
  const warmSand = page.getByRole('radio', { name: 'Warm sand' })
  await page.getByRole('radio', { name: 'Deep teal' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(warmSand).toBeChecked()
  await expect(previewCard).toHaveCSS('background-color', 'rgb(243, 233, 220)')

  await page.getByRole('button', { name: 'Continue' }).click()

  /* --- 3. Onboarding step 2: the rights checkbox gates Continue ---------- */

  await expect(heading(page, 'Connect your accounts')).toBeVisible()
  for (const platform of ['Instagram', 'TikTok', 'YouTube', 'LinkedIn']) {
    await expect(page.getByRole('heading', { level: 2, name: platform })).toBeVisible()
  }

  const continueOnStep2 = page.getByRole('button', { name: 'Continue' })
  await expect(continueOnStep2).toBeDisabled()

  const rightsOnStep2 = page.getByRole('checkbox', { name: RIGHTS_LABEL })
  await expect(rightsOnStep2).not.toBeChecked()
  await rightsOnStep2.check()

  await expect(continueOnStep2).toBeEnabled()
  await continueOnStep2.click()

  /* --- 4. Onboarding step 3: niche and goal ------------------------------ */

  await expect(heading(page, 'Your niche and goal')).toBeVisible()
  for (const nearby of ['Leadership', 'Productivity', 'Wellness']) {
    await expect(page.getByRole('button', { name: `Remove ${nearby}` })).toBeVisible()
  }

  // **The last step saves now, so it has to be completable.** "Open my studio"
  // was a link while onboarding was a prefilled demo that wrote nothing; it is
  // a submit button that writes the niche and the goal. The outcome is the one
  // field with no sample value — `goals.outcome_text` is the user's own words,
  // so prefilling it would forge them — which makes it the one field this
  // journey has to type.
  const openStudio = page.getByRole('button', { name: 'Open my studio' })
  await expect(openStudio).toBeDisabled()

  await page
    .getByLabel('What would success look like?')
    .fill('Ten qualified enquiries a month from people who already trust me')

  await expect(openStudio).toBeEnabled()
  await openStudio.click()

  /* --- 5. Home ----------------------------------------------------------- */

  // Generous on purpose: the submit is a server action making several
  // sequential round trips to a remote Postgres before it redirects. The
  // five-second default is a budget for a page transition, not for a write.
  await expect(page).toHaveURL(/\/app\/home$/, { timeout: 20_000 })
  await expect(heading(page, 'Good morning, Maya')).toBeVisible()
  await expect(
    page.getByText('3 posts are out, 3 more go today. 3 cuts need your eye.'),
  ).toBeVisible()

  // 16 §5 replaced the four activity tiles with the goal bar and the three
  // KPI cards. The assertion follows: what Home now promises is a goal and its
  // headline measurements, not a view count.
  const goal = page.getByRole('region', { name: 'Your goal', exact: true })
  await expect(goal).toContainText('Get more customers from short video')
  await expect(goal).toContainText('52 of 120 leads')
  await expect(goal).toContainText('Sends per 1,000 reach')
  await expect(goal).toContainText('Net new followers')
  // 15 §1: a target is a proposal with a stated basis, never a promise.
  await expect(goal).toContainText('Target 10 · 14-day baseline')

  /*
   * A fresh workspace has no alerts, so the region is absent (B2.4).
   *
   * **This assertion was stale and CI could not see it.** Until B2.4 the
   * board defaulted to `RAISED_ALERTS`, so this step read "Leads behind pace
   * for two weeks" and "Instagram needs reconnecting" — the *demo
   * workspace's* alerts, shown to every account. #11 fixed exactly that,
   * because a red bar reading "Instagram signed us out" on the front page of
   * a client who never connected Instagram does not merely misinform: it asks
   * them to go and fix something that was not broken.
   *
   * The spec kept asserting the fixtures and went red the moment #11 merged.
   * Nobody noticed because `demo-path.spec.ts` is in
   * `SESSION_DEPENDENT_SPECS`, and the keyless CI job skips it — so the one
   * check that walks the whole product did not run in CI between the list
   * being introduced and the keyed job arriving (D117).
   *
   * `readRaisedAlerts()` is the one read on Home; everything else on the
   * screen is still `SAMPLE_*`, which is why the steps below assert the
   * sample's own figures and are unaffected by this walk owning its account.
   *
   * `AlertsBoard` renders `null` for an empty list, so "absent" is the honest
   * assertion rather than an empty region. The alert *content* is covered by
   * `results-persist.spec.ts`, which seeds rows and asserts the demo's alert
   * does not reach a real workspace.
   */
  await expect(page.getByRole('region', { name: 'Alerts', exact: true })).toHaveCount(0)

  // "Needs you" is the morning to-do: 2 cuts to review, 1 post to approve,
  // 1 cut blocked by Compliance.
  const needsYou = page.getByRole('region', { name: 'Needs you', exact: true })
  await expect(needsYou).toContainText('4 items')
  await expect(needsYou.getByText('Blocked')).toBeVisible()

  await needsYou.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(needsYou).toContainText('3 items')
  await expect(page.getByRole('status').filter({ hasText: 'Approved' })).toBeVisible()

  await expect(
    page.getByRole('region', { name: 'Agents and results', exact: true }),
  ).toContainText('2.1× average views')

  /* --- 6. Upload and multiply ------------------------------------------- */

  await openFromSidebar(page, 'Upload')
  await expect(heading(page, 'One video, 12 posts')).toBeVisible()

  const summary = page.getByRole('status').filter({ hasText: 'cuts ready' })
  await expect(summary).toContainText('12 cuts ready')
  await expect(summary).toContainText('9 passed')
  await expect(summary).toContainText('2 need your eye')
  await expect(summary).toContainText('1 blocked')

  // The Multiplier's own pipeline prints the same 9 / 2 / 1 split.
  const pipeline = page.getByRole('region', { name: 'Done in 3 min 41 s', exact: true })
  await expect(pipeline.getByRole('listitem').filter({ hasText: 'Compliance check' })).toContainText(
    '9 · 2 · 1',
  )

  const cuts = page.getByRole('region', { name: 'Cuts', exact: true })
  await expect(cuts.getByRole('article')).toHaveCount(12)
  await expect(cuts.getByText('Background music from a venue; replace the audio')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Schedule 9 passed cuts' })).toBeVisible()

  /* --- 7. Niche Scan ----------------------------------------------------- */

  await openFromSidebar(page, 'Niche Scan')
  await expect(heading(page, 'Niche Scan')).toBeVisible()

  /*
   * 12 §Niche Scan: the benchmark that makes formats comparable across
   * accounts of different sizes.
   *
   * Asserted against the report panel rather than a card. It used to read
   * "views per follower in this niche" off `TrendCard`, which a workspace
   * with no scan no longer draws — but the benchmark itself did not move, it
   * is just stated where the research is now shown.
   */
  await expect(page.getByText('Examples, ranked by views per follower')).toBeVisible()

  /*
   * Non-negotiable 7, on the surface most likely to be screenshotted and sent
   * to a prospect. With no scan the panel shows the sample report, and an
   * unlabelled sample here is the exact mistake this walk should catch.
   */
  await expect(page.getByText('Sample data').first()).toBeVisible()

  await expect(page.getByRole('region', { name: 'How remakes work', exact: true })).toContainText(
    'We remake the format, never the footage.',
  )

  /*
   * A fresh workspace has not been scanned, so there are no formats — and
   * that is the assertion now (V1).
   *
   * This step used to read "8 formats match these filters", eight "Remake for
   * my brand" links, "The 3-word reframe" and "+340%". Every one of those was
   * `@mirrorline/mock`, drawn to every workspace including one that had never
   * been scanned. The niche report landing above them made it worse rather
   * than merely stale: a panel carrying a visible "Sample data" label sitting
   * on top of unlabelled cards says plainly that the cards are real.
   *
   * So the cards read this workspace's own `trends` rows now, and a demo
   * account that has run no scan correctly has none. The empty state is the
   * thing worth asserting, and the counter is deliberately absent — "0
   * formats match these filters" would blame the filters for work we have
   * not done.
   */
  await expect(page.getByText('No scan yet')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'formats match' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Remake for my brand/ })).toHaveCount(0)

  /* --- 8. Remake studio ------------------------------------------------- */

  /*
   * Reached by URL rather than by clicking a card.
   *
   * The remake studio is still fixture-backed — its script, compliance
   * verdict and preview are written by the script and hook agent (V2), which
   * is not built. There is therefore no card to click through from, and the
   * card's control says so rather than linking into a 404.
   *
   * The screen itself is unchanged and worth keeping covered, so the walk
   * continues from its route. `routes.ts` lists the same id.
   */
  await page.goto(`/app/remake/${REMAKE_TREND_ID}`)

  await expect(page).toHaveURL(new RegExp(`/app/remake/${REMAKE_TREND_ID}$`))
  await expect(heading(page, 'Remake: The 3-word reframe')).toBeVisible()

  const compliance = page.getByRole('region', { name: 'Compliance agent', exact: true })
  await expect(compliance.getByText('Passed', { exact: true })).toBeVisible()
  // STITCH_REVIEW item 4: the limit is named, never dressed up as "safe".
  await expect(compliance).toContainText('New wording · 12% similar (limit 30%)')
  await expect(compliance).not.toContainText('safe <')
  await expect(compliance).toContainText('No original footage used')
  await expect(compliance).toContainText('AI scene labelled on screen and on the platform')

  await expect(page.getByRole('region', { name: '3 · Preview', exact: true })).toContainText('Hooks to A/B test')

  /* --- 9. Calendar and batch approval ----------------------------------- */

  await openFromSidebar(page, 'Calendar')

  /*
   * Patterns rather than text, since B2.2.
   *
   * This step used to read "Week of 9 November", "9 posts" and "Tue 10" —
   * `@mirrorline/mock`'s week, which never moved. The calendar now reads this
   * workspace's `scheduled_posts` for the week the client is actually in, so
   * the date, the count and the day name are all data. The seeded week comes
   * from `auth.setup.ts`.
   *
   * What is still asserted is everything that is a promise rather than a
   * number: there is a week heading with a date in it, the bar names a count
   * and says all of them need an eye, approving says the Publisher will post
   * that many on a named day, and the button goes away afterwards.
   */
  await expect(heading(page, /^Week of \d{1,2} [A-Z][a-z]+$/)).toBeVisible()

  const batchBar = page.getByRole('region', { name: "Tomorrow's approvals", exact: true })

  /*
   * This workspace has nothing scheduled, and the bar must say so.
   *
   * **A real bug lived here.** The bar read "Tomorrow is approved. The
   * Publisher will post 0 videos on ." — a claim that work was approved when
   * none exists, a zero presented as a result, and an unfinished sentence,
   * because with no posts there is no day to name. `demo-path` would have
   * caught it the day it appeared, except the keyless CI job skips this spec.
   *
   * The approval flow itself is not dropped: `calendar-persist.spec.ts` seeds
   * posts and drives approve-all against them, which is where that assertion
   * belongs anyway — it needs rows, and this walk is about a fresh account.
   *
   * **And it now genuinely is one.** This step is the reason `signedInPage`
   * exists: on the shared session it was asserting an empty calendar against
   * a workspace `auth.setup.ts` deliberately fills, and passed only on
   * Sundays UTC. The header above has the full account.
   */
  await expect(batchBar).toContainText('Nothing is scheduled for tomorrow yet.')
  await expect(batchBar).not.toContainText('approved')
  await expect(
    batchBar.getByRole('button', { name: /^Approve all \d+ for tomorrow$/ }),
  ).toHaveCount(0)

  /* --- 10. Results ------------------------------------------------------ */

  await openFromSidebar(page, 'Results')
  await expect(heading(page, 'Overview')).toBeVisible()

  // 15 §5: the seven tabs, as links rather than a widget, so each has a URL.
  const resultsNav = page.getByRole('navigation', { name: 'Results sections' })
  for (const tab of [
    'Overview',
    'Funnel',
    'Content',
    'Accounts',
    'Goals and KPIs',
    'Ledger',
    'Agent insights',
  ]) {
    await expect(resultsNav.getByRole('link', { name: tab, exact: true })).toBeVisible()
  }

  await resultsNav.getByRole('link', { name: 'Funnel', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/results\?tab=funnel$/)

  const funnel = page.getByRole('region', { name: 'Views to bookings', exact: true })
  for (const stage of ['Views', 'Profile visits', 'Link clicks', 'Leads', 'Bookings']) {
    await expect(funnel).toContainText(stage)
  }
  await expect(funnel).toContainText('48,300')

  // 15 §5 tab 4: an account nobody has connected shows a connect prompt, never
  // a row of zeroes. This is the honesty rule that is easiest to break.
  await resultsNav.getByRole('link', { name: 'Accounts', exact: true }).click()
  await expect(page.getByText('We have no measurements for LinkedIn')).toBeVisible()

  // 15 §5 tab 6: the ledger names the column it has no data for rather than
  // filling it with zeroes.
  await resultsNav.getByRole('link', { name: 'Ledger', exact: true }).click()
  await expect(page.getByRole('region', { name: 'The weekly ledger', exact: true })).toContainText(
    'There is no sales column',
  )

  /* --- 11. Agents ------------------------------------------------------- */

  await openFromSidebar(page, 'Agents')
  await expect(heading(page, 'Seven agents, one loop')).toBeVisible()

  await expect(page.getByRole('article')).toHaveCount(7)
  for (const name of [
    'Trend Scout',
    'Remake Producer',
    'Multiplier',
    'Compliance',
    'Client Concierge',
    'Publisher',
    'Performance Analyst',
  ]) {
    await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible()
  }

  await expect(page.getByText('Your AI team · spend this month $43 of $180 in caps')).toBeVisible()

  // Non-negotiable 6, visible: Compliance cannot be switched off. It is locked
  // with aria-disabled rather than `disabled`, so it stays in the tab order and
  // a keyboard user can still reach the sentence that explains why.
  const complianceSwitch = page.getByRole('switch', { name: 'Compliance' })
  await expect(complianceSwitch).toBeChecked()
  await expect(complianceSwitch).toHaveAttribute('aria-disabled', 'true')
  // Still reachable by keyboard, which is the point of aria-disabled here.
  await complianceSwitch.focus()
  await expect(complianceSwitch).toBeFocused()
  // And still unswitchable: the handler returns early.
  await complianceSwitch.click({ force: true })
  await expect(complianceSwitch).toBeChecked()
  await expect(
    page.getByText(
      "Compliance can't be turned off. Every video passes it before it can be scheduled.",
    ),
  ).toBeVisible()

  await context.close()
})

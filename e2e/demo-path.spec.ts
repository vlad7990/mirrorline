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

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { REMAKE_TREND_ID } from './helpers/routes'

onlyProject('chromium', 'The demo is walked once, at the 1440x900 sales viewport.')

/** The walk crosses nine screens; one default timeout is not enough. */
const WALK_TIMEOUT_MS = 180_000

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

/** The studio sidebar nav. Scoping to it keeps link names unambiguous. */
function studioNav(page: Page) {
  return page.getByRole('navigation', { name: 'Studio' })
}

async function openFromSidebar(page: Page, label: string): Promise<void> {
  await studioNav(page).getByRole('link', { name: label, exact: true }).click()
}

function heading(page: Page, name: string) {
  return page.getByRole('heading', { level: 1, name })
}

test('the whole demo path holds up', async ({ page }) => {
  test.setTimeout(WALK_TIMEOUT_MS)

  /* --- 1. Sign up -------------------------------------------------------- */

  await page.goto('/sign-up')
  await expect(heading(page, 'Set up your studio')).toBeVisible()

  await page.getByLabel('Your name').fill('Maya Torres')
  await page.getByLabel('Work email').fill('maya@mayatorres.example')
  await page.getByLabel('Workspace name').fill('Maya Torres Coaching')
  await page.getByLabel('Password', { exact: true }).fill('a short sentence works well')

  const rightsOnSignUp = page.getByRole('checkbox', { name: RIGHTS_LABEL })
  await expect(rightsOnSignUp).not.toBeChecked()

  // Non-negotiable 1 is enforced on the way in, not just described.
  await page.getByRole('button', { name: 'Create your workspace' }).click()
  // Next.js ships its own role="alert" route announcer, so filter by the copy.
  await expect(
    page.getByRole('alert').filter({ hasText: 'We can only work from material you own' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/sign-up$/)

  await rightsOnSignUp.check()
  await page.getByRole('button', { name: 'Create your workspace' }).click()
  await expect(page).toHaveURL(/\/app\/onboarding/)

  /* --- 2. Onboarding step 1: brand, with the live preview ---------------- */

  await expect(heading(page, 'Your brand')).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Setup steps' }).getByRole('button', {
      name: /Step 1 of 3/,
    }),
  ).toHaveAttribute('aria-current', 'step')

  const preview = page.getByRole('complementary', { name: 'Live preview', exact: true })
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

  await page.getByRole('link', { name: 'Open my studio' }).click()

  /* --- 5. Home ----------------------------------------------------------- */

  await expect(page).toHaveURL(/\/app\/home$/)
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

  // 15 §5: a *trend* alert appears only after two periods off track, and says
  // so. A disconnection does not wait — nothing is publishing, so there is
  // nothing to wait and see about, and the two sentences differ on the page.
  const alerts = page.getByRole('region', { name: 'Alerts', exact: true })
  await expect(alerts).toContainText('Leads behind pace for two weeks')
  await expect(alerts).toContainText('we raise this after two, not after one')
  await expect(alerts).toContainText('Instagram needs reconnecting')
  await expect(alerts).toContainText('We raise this the same day')

  // "Needs you" is the morning to-do: 2 cuts to review, 1 post to approve,
  // 1 cut blocked by Compliance.
  const needsYou = page.getByRole('region', { name: 'Needs you', exact: true })
  await expect(needsYou).toContainText('4 items')
  await expect(needsYou.getByText('Blocked')).toBeVisible()

  await needsYou.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(needsYou).toContainText('3 items')
  await expect(page.getByRole('status').filter({ hasText: 'Approved' })).toBeVisible()

  await expect(
    page.getByRole('complementary', { name: 'Agents and results', exact: true }),
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

  // 12 §Niche Scan: the benchmark that makes formats comparable across
  // accounts of different sizes, beside the fit score.
  await expect(page.getByText('views per follower in this niche').first()).toBeVisible()

  await expect(page.getByRole('region', { name: 'How remakes work', exact: true })).toContainText(
    'We remake the format, never the footage.',
  )

  // The visible live region and the card count have to agree.
  await expect(page.getByRole('status').filter({ hasText: 'formats match' })).toHaveText(
    '8 formats match these filters',
  )

  const remakeLinks = page.getByRole('link', { name: /^Remake for my brand/ })
  await expect(remakeLinks).toHaveCount(8)
  await expect(page.getByRole('heading', { level: 2, name: 'The 3-word reframe' })).toBeVisible()
  await expect(page.getByText('+340%')).toBeVisible()

  await remakeLinks.first().click()

  /* --- 8. Remake studio ------------------------------------------------- */

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
  await expect(heading(page, 'Week of 9 November')).toBeVisible()

  const batchBar = page.getByRole('region', { name: "Tomorrow's approvals", exact: true })
  await expect(batchBar).toContainText('Tomorrow: 9 posts ready. All 9 need your eye.')

  const approveAll = batchBar.getByRole('button', { name: 'Approve all 9 for tomorrow' })
  await approveAll.click()

  await expect(batchBar).toContainText(
    'Tomorrow is approved. The Publisher will post 9 videos on Tue 10.',
  )
  await expect(approveAll).toBeHidden()

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
})

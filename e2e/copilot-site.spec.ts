/**
 * The website co-pilot, driven the way a visitor drives it.
 *
 * `copilot-api.spec.ts` already proves the endpoint answers. What only a
 * browser can show is the conditions 18 §3.3 puts on the surface itself, each
 * of which is invisible to a unit test and to a screenshot:
 *
 * - it is not there at all until the cookie banner has been answered;
 * - it says AI on the launcher and in the panel header;
 * - the transcript dies with the tab, and nothing is stored;
 * - a refusal arrives as an answer and a person, not as a failure.
 *
 * Chromium only. The panel's layout at 390px is a screenshot's job, and
 * running these again at a second viewport would double the suite to re-prove
 * behaviour that has no viewport in it.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'the co-pilot’s rules are behavioural; 390px is a screenshot')

const LAUNCHER = 'Ask about Mirrorline — AI assistant'
const GUARANTEE_QUESTION = 'Will I get 10,000 followers?'

async function dismissBanner(page: Page) {
  // Decline, deliberately: the stricter of the two answers must still open
  // the co-pilot, or the gate would be rewarding consent rather than waiting
  // for a decision.
  await page.getByRole('button', { name: 'Essential only' }).click()
}

function launcher(page: Page) {
  return page.getByRole('button', { name: LAUNCHER })
}

function panel(page: Page) {
  return page.getByRole('dialog', { name: /Ask about Mirrorline/ })
}

async function openPanel(page: Page) {
  await launcher(page).click()
  await expect(panel(page)).toBeVisible()
}

async function ask(page: Page, question: string) {
  await panel(page).getByLabel('Your question').fill(question)
  await panel(page).getByRole('button', { name: 'Ask', exact: true }).click()
}

test.describe('the launcher waits for the consent banner', () => {
  test('is absent while the banner is up, and arrives when it is answered', async ({ page }) => {
    await page.goto('/')

    // §3.3: "a second floating thing over a consent prompt is a dark
    // pattern". The banner is up on a first visit, so nothing else may be.
    await expect(page.getByRole('dialog', { name: 'We are not tracking you' })).toBeVisible()
    await expect(launcher(page)).toHaveCount(0)

    await dismissBanner(page)
    await expect(launcher(page)).toBeVisible()
  })

  test('stays available on the next page, because the choice is remembered', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)

    await page.goto('/pricing')
    await expect(launcher(page)).toBeVisible()
  })
})

test.describe('what it says about itself', () => {
  test('is labelled AI on the launcher and in the panel header', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)

    // On the button's face, not in a tooltip.
    await expect(launcher(page)).toContainText('AI')

    await openPanel(page)
    await expect(panel(page).getByRole('heading', { level: 2 })).toContainText('AI')
  })

  test('names sample mode, which it reads from the server', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)

    // There is no key on a preview, so `/api/copilot/status` says `sample`
    // and the panel says so too. The client cannot work this out for itself:
    // the key never reaches a bundle (§4).
    await expect(panel(page)).toContainText('Sample answers')
  })
})

test.describe('answers', () => {
  test('an answer from our own pages arrives with a citation you can follow', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)
    await ask(page, 'What does the Growth plan include every month?')

    await expect(panel(page)).toContainText('From our own pages', { timeout: 15_000 })
    await expect(panel(page).getByText('Where this came from')).toBeVisible()

    // §2.2: a citation is somewhere you can go and check, not a footnote.
    const citation = panel(page).getByRole('link').first()
    const href = await citation.getAttribute('href')
    expect(href).toMatch(/^\//)

    await citation.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  test('a question we must refuse comes back as an answer and a person', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)
    await ask(page, GUARANTEE_QUESTION)

    // §3.2: the refusals are the product. This renders as an answer — with no
    // follower number in it — plus the handoff, and nothing about it is
    // presented as a failure.
    await expect(panel(page)).toContainText('Nobody can honestly promise you a follower count', {
      timeout: 15_000,
    })
    await expect(panel(page).getByRole('link', { name: 'Talk to a person' })).toBeVisible()
    await expect(panel(page)).not.toContainText('I could not reach the answer service')
  })
})

test.describe('what it keeps', () => {
  test('the transcript dies with the tab, and the question is stored nowhere', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)
    await ask(page, GUARANTEE_QUESTION)
    await expect(panel(page)).toContainText('Nobody can honestly promise', { timeout: 15_000 })

    // §3.3: "Questions are not logged with identifiers; the transcript lives
    // in the tab and dies with it." So the question is in no store at all.
    const stored = await page.evaluate(() => {
      const dump = (storage: Storage) =>
        Object.keys(storage)
          .map((key) => `${key}=${storage.getItem(key) ?? ''}`)
          .join('\n')
      return { local: dump(window.localStorage), session: dump(window.sessionStorage) }
    })

    expect(stored.local).not.toContain('followers')
    expect(stored.session).not.toContain('followers')
    expect(stored.local).not.toContain('copilot')
    expect(stored.session).not.toContain('copilot')
    expect(await page.context().cookies()).toEqual([])

    await page.reload()
    await openPanel(page)
    // A fresh panel: the empty state, not the last conversation.
    await expect(panel(page)).toContainText('Ask about the plans')
    await expect(panel(page)).not.toContainText('Nobody can honestly promise')
  })

  test('closing the panel keeps the answer, because closing is not leaving', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)
    await ask(page, GUARANTEE_QUESTION)
    await expect(panel(page)).toContainText('Nobody can honestly promise', { timeout: 15_000 })

    await panel(page).getByRole('button', { name: 'Close the assistant' }).click()
    await expect(panel(page)).toHaveCount(0)

    await openPanel(page)
    await expect(panel(page)).toContainText('Nobody can honestly promise')
  })
})

test.describe('accessibility', () => {
  test('the open panel, answer and all, has no serious axe violations', async ({ page }) => {
    // a11y.spec.ts sweeps routes, and this surface is not one: it exists only
    // after a consent choice, a click and an answer. Without this the newest
    // interactive thing on the site would be the only thing axe never saw.
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)
    await ask(page, 'What does the Growth plan include every month?')
    await expect(panel(page)).toContainText('From our own pages', { timeout: 15_000 })

    const results = await new AxeBuilder({ page }).include('.copilot-panel').analyze()
    const blocking = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `[${violation.impact}] ${violation.id} — ${violation.help}`)

    expect(blocking, blocking.join('\n')).toEqual([])
  })
})

test.describe('keyboard and focus', () => {
  test('Escape closes the panel and focus returns to the launcher', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)

    // Opening puts focus in the input, so the first keystroke goes where the
    // visitor is looking.
    await expect(panel(page).getByLabel('Your question')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(panel(page)).toHaveCount(0)
    await expect(launcher(page)).toBeFocused()
  })
})

test.describe('under prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the panel has no entrance, and the answer simply appears', async ({ page }) => {
    await page.goto('/')
    await dismissBanner(page)
    await openPanel(page)

    // The entrance lives in a `no-preference` block, so here there is no
    // animation at all rather than a faster one.
    const animation = await panel(page).evaluate(
      (element) => getComputedStyle(element).animationName,
    )
    expect(animation).toBe('none')

    await ask(page, 'What does the Growth plan include every month?')
    await expect(panel(page)).toContainText('From our own pages', { timeout: 15_000 })
  })
})

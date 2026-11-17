/**
 * The website co-pilot, driven the way a visitor drives it.
 *
 * `copilot-api.spec.ts` already proves the endpoint answers. What only a
 * browser can show is the conditions 18 §3.3 puts on the surface itself, each
 * of which is invisible to a unit test and to a screenshot:
 *
 * - it is there from the first paint, before any cookie choice (D74 — this
 *   used to be the opposite, and the tests below are the record of that);
 * - it says AI on the launcher and in the panel header;
 * - it greets once a visit, three seconds in, and never on a legal page;
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

const LAUNCHER = 'Ask Milo about Mirrorline — AI assistant'
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
  return page.getByRole('dialog', { name: /Ask Milo about Mirrorline/ })
}

async function openPanel(page: Page) {
  await launcher(page).click()
  await expect(panel(page)).toBeVisible()
}

async function ask(page: Page, question: string) {
  await panel(page).getByLabel('Your question').fill(question)
  await panel(page).getByRole('button', { name: 'Ask', exact: true }).click()
}

/**
 * Milo is always there (D74), which reverses what §3.3 asked for.
 *
 * These are the assertions that would have failed under the old rule, pointed
 * at what was wrong with it: the launcher used to be absent from the first
 * screen of every first visit.
 */
test.describe('the launcher is always there', () => {
  test('is on the page before any cookie choice is made', async ({ page }) => {
    await page.goto('/')

    // The banner is up — and so is Milo, above it rather than instead of it.
    await expect(page.getByRole('dialog', { name: 'We are not tracking you' })).toBeVisible()
    await expect(launcher(page)).toBeVisible()
  })

  test('is in the server’s own HTML, not painted in by an effect', async ({ request }) => {
    // A fetch of the document itself. The old gate read a stored choice in an
    // effect, which meant the launcher could not exist until React had run.
    // "From the first paint" has to mean the markup.
    const html = await (await request.get('/')).text()
    expect(html).toContain('data-milo-launcher')
    expect(html).toContain('Ask Milo about Mirrorline — AI assistant')
  })

  test('is still there after a reload, and after a choice either way', async ({ page }) => {
    await page.goto('/')
    await expect(launcher(page)).toBeVisible()

    await page.reload()
    await expect(launcher(page)).toBeVisible()

    // Decline, deliberately: the stricter answer must not remove him either.
    await dismissBanner(page)
    await expect(launcher(page)).toBeVisible()

    await page.reload()
    await expect(launcher(page)).toBeVisible()
  })

  test('is on a legal page too, where only the greeting stays away', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(launcher(page)).toBeVisible()
    await page.waitForTimeout(4_500)
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0)
  })

  test('rides above the cookie banner rather than under it', async ({ page }) => {
    await page.goto('/')
    const banner = page.getByRole('dialog', { name: 'We are not tracking you' })
    await expect(banner).toBeVisible()

    const dock = await page.locator('[data-milo-dock]').boundingBox()
    const bar = await banner.boundingBox()
    expect(dock).not.toBeNull()
    expect(bar).not.toBeNull()

    // Clear of its top edge, not merely painted over it: a mascot sitting on
    // the consent buttons is the dark pattern §3.3 worried about, and
    // z-index alone would produce exactly that.
    expect(dock!.y + dock!.height).toBeLessThanOrEqual(bar!.y + 1)
  })
})

test.describe('the greeting', () => {
  test('arrives once, and not again on the next page of the same visit', async ({ page }) => {
    await page.goto('/')

    // Nothing at first: the bubble is three seconds out, and a greeting that
    // is already there when the page paints is a banner, not a hello.
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0)
    await expect(page.locator('[data-milo-greeting]')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('[data-milo-greeting]')).toContainText('ask me anything about')

    // Six seconds, then it withdraws on its own.
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0, { timeout: 12_000 })

    // The second page of the same visit gets no second hello.
    await page.goto('/pricing')
    await expect(launcher(page)).toBeVisible()
    await page.waitForTimeout(5_000)
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0)
  })

  test('can be dismissed, and stays dismissed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-milo-greeting]')).toBeVisible({ timeout: 8_000 })

    await page.getByRole('button', { name: /Dismiss Milo/ }).click()
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0)

    // And it does not return for the rest of the time it was given.
    await page.waitForTimeout(2_500)
    await expect(page.locator('[data-milo-greeting]')).toHaveCount(0)
  })

  test('is a new visit in a new tab, so he says hello again', async ({ browser }) => {
    // The lifetime rule in one test: a greeting is per visit, and a fresh
    // context is a fresh visit. If this ever starts failing, the flag has
    // been moved to `localStorage` and Milo has gone quiet for good.
    for (const _visit of [1, 2]) {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto('/')
      await expect(page.locator('[data-milo-greeting]')).toBeVisible({ timeout: 8_000 })
      await context.close()
    }
  })
})

test.describe('the size, and the room around him', () => {
  const CASES = [
    { width: 1440, face: 112, gap: 24, label: true },
    { width: 390, face: 72, gap: 16, label: false },
  ] as const

  for (const { width, face, gap, label } of CASES) {
    test(`is ${face}px at ${width}px, ${gap}px from the edge`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      // Answered first, so the banner's height is not part of the offset
      // being measured here.
      await dismissBanner(page)

      const box = await page.locator('.milo-launcher-face').boundingBox()
      expect(box).not.toBeNull()
      expect(Math.round(box!.width)).toBe(face)

      const dock = await page.locator('[data-milo-dock]').boundingBox()
      expect(Math.round(width - (dock!.x + dock!.width))).toBe(gap)

      // The words are a desktop affordance. At 390 the accessible name is the
      // only label, which is why it carries the whole sentence.
      const words = page.locator('.milo-launcher-label')
      if (label) await expect(words).toBeVisible()
      else await expect(words).toBeHidden()
    })
  }

  test('steps up off a primary CTA at 390px rather than sitting on it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pricing')
    await dismissBanner(page)

    // The plan buttons are full-width here, so scrolling one to the foot of
    // the screen puts it exactly where Milo is anchored.
    const cta = page.locator('[data-primary-cta]').first()
    await cta.scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(500)

    const dock = await page.locator('[data-milo-dock]').boundingBox()
    const button = await cta.boundingBox()
    expect(dock).not.toBeNull()
    expect(button).not.toBeNull()

    const overlaps =
      dock!.x < button!.x + button!.width &&
      dock!.x + dock!.width > button!.x &&
      dock!.y < button!.y + button!.height &&
      dock!.y + dock!.height > button!.y
    expect(overlaps).toBe(false)
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

/**
 * Navigation must always end on the route that was clicked last.
 *
 * Two mechanisms in this app sit between a click and the screen it opens, and
 * both are decoration that must never be able to take the navigation over:
 *
 * 1. `components/marketing/view-transitions.tsx` holds a frozen screenshot of
 *    the outgoing page while the next one renders. The reader is looking at a
 *    picture; the live DOM underneath has already moved on.
 * 2. `components/shell/sliding-indicator.tsx` slides a marker between studio
 *    nav items. It is `aria-hidden` and `pointer-events: none`, and the link
 *    takes its active styling the instant the route changes.
 *
 * The question these tests answer is the one a real user asks by accident:
 * if I click one thing and then immediately click another, where do I end up?
 * The answer has to be "the second one", every time, on both halves of the
 * app. A race that resolves the other way is a user stranded on a page they
 * did not ask for, and no amount of test hardening would make that acceptable.
 *
 * Why the clicks are 70ms apart and not awaited to completion: a view
 * transition here runs 180ms out plus 280ms in, so 70ms lands the second
 * click squarely inside the first transition — the exact window the frozen
 * snapshot covers. `locator.click()` resolves once the event is dispatched,
 * not once the navigation settles, so the second click really does interrupt
 * the first.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'a navigation race is a property of the router, not of the viewport')

/** Inside the 180ms-out + 280ms-in window of a marketing view transition. */
const INTERRUPT_DELAY_MS = 70

/**
 * Click `first`, then `second` while the first navigation is still in flight.
 *
 * Deliberately not `Promise.all`: that would dispatch both in the same task,
 * which no hand can do. This is a fast human.
 */
async function clickBothFast(first: Locator, second: Locator): Promise<void> {
  await first.click()
  await new Promise((resolve) => setTimeout(resolve, INTERRUPT_DELAY_MS))
  await second.click()
}

function studioNav(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Studio' })
}

test('two fast clicks in the studio nav land on the second one', async ({ page }) => {
  await page.goto('/app/home')
  // The nav is the subject of the test, so wait for it rather than for the
  // page: an h1 can be on screen before the sidebar has hydrated.
  await expect(studioNav(page).getByRole('link', { name: 'Calendar', exact: true })).toBeVisible()

  await clickBothFast(
    studioNav(page).getByRole('link', { name: 'Calendar', exact: true }),
    studioNav(page).getByRole('link', { name: 'Results', exact: true }),
  )

  // Both halves matter. The URL alone would pass while the screen showed the
  // calendar, and the heading alone would pass with the address bar lying.
  await expect(page).toHaveURL(/\/app\/results$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

  // And the nav agrees about where we are, which is what the sliding marker
  // is measuring from. A marker parked on Calendar is the same lie as a
  // wrong heading.
  await expect(studioNav(page).getByRole('link', { name: 'Results', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('two fast clicks in the site nav land on the second one, mid-transition', async ({ page }) => {
  await page.goto('/')

  // The drawer's nav carries the same label, and at 1440px it is the hidden
  // one. `visible` picks the desktop row without hard-coding a breakpoint.
  const mainNav = page.locator('nav[aria-label="Main"]').locator('visible=true')
  const pricing = mainNav.getByRole('link', { name: 'Pricing', exact: true })
  const compare = mainNav.getByRole('link', { name: 'Compare', exact: true })
  await expect(pricing).toBeVisible()
  await expect(compare).toBeVisible()

  await clickBothFast(pricing, compare)

  await expect(page).toHaveURL(/\/compare$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The other ways')
})

/**
 * The longest a transition may take end to end before we call it stalled.
 *
 * `view-transitions.tsx` gives up after 1000ms and the animation itself is
 * 180ms out plus 280ms in, so a transition released by its own navigation
 * finishes in roughly 500–700ms and one released by the stall timeout cannot
 * finish in under 1460ms. 1200ms sits in that gap: loose enough that a slow
 * RSC response under seven parallel workers is not a failure, tight enough
 * that it cannot be reached by waiting out the timeout.
 */
const TRANSITION_CEILING_MS = 1_200

/**
 * At or past this, a transition's update callback was resolved by
 * `view-transitions.tsx`'s 1000ms stall guard rather than by a navigation.
 *
 * Measured, so it is not a guess: a released transition's callback settles in
 * 28–152ms on a production build. 900ms leaves six times that much headroom
 * and still cannot be reached except by waiting out the timeout.
 */
const ORPHANED_MS = 900

/** What one view transition's update callback did, and where. */
interface TransitionRecord {
  /** The pathname the page was on when the transition started. */
  readonly from: string
  /** The pathname in the address bar when its update promise resolved. */
  readonly at: string
  /** Milliseconds from start to that resolution. */
  readonly ms: number
}

/**
 * Record what every view transition's update callback resolved on.
 *
 * The first version of this measured `transition.finished` instead, and it
 * passed against the known-broken component — a useless test, and worth
 * recording why. `finished` reports the *animation*, and the browser skips a
 * transition the moment a second one starts, so the interesting cases all
 * look like a prompt little rejection. Both bugs in D46 live in the **update
 * callback's promise**: the component resolves the wrong one, or waits on one
 * that has nothing left to wait for. So that promise is what gets wrapped,
 * and the pathname at the moment it settles is the signal, because a
 * transition that resolved on a page the reader has already clicked past is
 * precisely the defect.
 *
 * `document.getAnimations()` cannot answer any of this either: during the
 * frozen part, before the callback resolves, no pseudo-element animation has
 * started, so the page looks idle while it is in fact held.
 */
async function recordTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: TransitionRecord[] = []
    ;(window as unknown as { __transitions: TransitionRecord[] }).__transitions = store

    const start = document.startViewTransition?.bind(document)
    if (!start) return

    document.startViewTransition = ((callback: () => void | Promise<void>) => {
      const from = window.location.pathname
      const startedAt = performance.now()
      return start(() =>
        Promise.resolve(callback()).then(() => {
          store.push({ from, at: window.location.pathname, ms: performance.now() - startedAt })
        }),
      )
    }) as typeof document.startViewTransition
  })
}

function transitions(page: Page): Promise<TransitionRecord[]> {
  return page.evaluate(
    () => (window as unknown as { __transitions: TransitionRecord[] }).__transitions,
  )
}

test('a transition is released by its own navigation, not by the stall timeout', async ({
  page,
}) => {
  await recordTransitions(page)
  await page.goto('/')

  const mainNav = page.locator('nav[aria-label="Main"]').locator('visible=true')
  await mainNav.getByRole('link', { name: 'Pricing', exact: true }).click()

  await expect(page).toHaveURL(/\/pricing$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One flat price a month')

  // Chromium supports the API, so a transition really ran. A runner without
  // it records nothing — the component falls back to a plain navigation,
  // which is correct by construction and has nothing to assert.
  await expect.poll(async () => (await transitions(page)).length).toBe(1)

  const [only] = await transitions(page)
  expect(only.from).toBe('/')
  // Released by its own arrival, which is the whole contract.
  expect(only.at).toBe('/pricing')
  // And not by the 1000ms stall guard: the second bug in D46 had a transition
  // wait for a pathname that was already current, holding a picture of the
  // page the reader had just left for the full timeout.
  expect(only.ms).toBeLessThan(TRANSITION_CEILING_MS)
})

test('an interrupted transition is superseded, never released by the wrong page', async ({
  page,
}) => {
  await recordTransitions(page)
  await page.goto('/')

  const mainNav = page.locator('nav[aria-label="Main"]').locator('visible=true')
  await expect(mainNav.getByRole('link', { name: 'Compare', exact: true })).toBeVisible()

  // Both clicks in one task, which no hand can do — and that is the point.
  //
  // `clickBothFast` above is the realistic version and it is the one that
  // proves the router behaves; it cannot prove anything about *interleaving*,
  // because it does not interleave. Measured: Pricing commits about 150ms
  // after its click, and Playwright's actionability checks push the second
  // click past that, so the two navigations never overlap and the transition
  // bookkeeping is never put under any pressure at all. Dispatching both from
  // inside the page is the only way to land the second click while the first
  // navigation is genuinely in the air.
  await page.evaluate(() => {
    const nav = Array.from(document.querySelectorAll('nav[aria-label="Main"]')).find(
      (candidate) => (candidate as HTMLElement).offsetParent !== null,
    )
    const link = (text: string) =>
      Array.from(nav?.querySelectorAll('a') ?? []).find(
        (anchor) => anchor.textContent?.trim() === text,
      )
    link('Pricing')?.click()
    link('Compare')?.click()
  })

  // Last click still wins, which is the rule that matters most here.
  await expect(page).toHaveURL(/\/compare$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The other ways')

  await expect.poll(async () => (await transitions(page)).length).toBe(2)
  const [superseded, survivor] = await transitions(page)

  // Both started from the home page, because both clicks happened there.
  expect(superseded.from).toBe('/')
  expect(survivor.from).toBe('/')

  // Neither transition was orphaned, and this is the assertion that catches
  // the first bug in D46. Unfixed, the second registration overwrote the
  // first without releasing it, so the first had nothing left to resolve it
  // and sat out the whole 1000ms stall timeout.
  //
  // The *pathname* each one resolved on is deliberately not asserted here.
  // Whether the release lands before or after the two navigations commit
  // depends on which frame the browser chooses to run the deferred callbacks
  // in, and pinning that pins something this component does not control: the
  // same correct build produced both orders across three runs. Being
  // released promptly is the contract; being released at one particular
  // instant is not.
  for (const record of [superseded, survivor]) {
    expect(record.ms).toBeLessThan(ORPHANED_MS)
  }

  // The survivor is still the one that waited for the page we are on.
  expect(survivor.at).toBe('/compare')
})

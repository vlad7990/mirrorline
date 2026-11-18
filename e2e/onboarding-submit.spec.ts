/**
 * Stepping the wizard must not navigate — and the last step must save.
 *
 * ============================================================================
 * The bug this exists to catch
 * ============================================================================
 *
 * `demo-path.spec.ts` already walks this submit, and for two days it passed and
 * failed on the same commit on nothing but network luck. The diagnosis that
 * stuck — "the server action never settles" — was wrong. The action was never
 * *called*: no POST left the browser at all, which is why no server error was
 * ever printed and why the database, timed at 109ms, was never the suspect it
 * looked like.
 *
 * `step-context.tsx` mirrored the step into `?step=` with `router.replace`,
 * which is a **navigation**. The rest follows from Next's action queue
 * (`next/dist/client/components/app-router-instance.js`):
 *
 * - every non-restore action is dispatched by `setState(deferredPromise)`, and
 *   `useActionQueue` does `use(state)` on it, so a navigation in flight
 *   suspends the whole router;
 * - a second navigation dispatched before the first commits marks the first
 *   `discarded`, and `handleResult` returns early for a discarded action — it
 *   neither resolves that promise nor advances the queue — while the navigate
 *   branch leaves `actionQueue.last` pointing at the dead node;
 * - the form's server action is not a navigation, so it is appended behind that
 *   dead node and never runs.
 *
 * Two quick Continues and a Submit was the whole recipe. Whether it broke came
 * down to whether the second click beat the first RSC round trip home, and that
 * round trip goes through `middleware.ts`, which verifies the token with
 * Supabase over the network — remote, variable latency, deciding it. Hence a
 * commit that passed one day and failed the next, and hence a raised timeout
 * only hiding it.
 *
 * ============================================================================
 * Why the guard counts requests instead of racing them
 * ============================================================================
 *
 * The obvious test — hold the navigation open and submit underneath it — is not
 * reliably red. Next can serve a static route's RSC payload from its prefetch
 * cache, in which case no navigation is pending and there is nothing to wedge;
 * measured over six runs it stayed green on the broken code. A test that passes
 * before the fix guards nothing, and `demo-path.spec.ts` is already the proof
 * that racing real latency is a coin toss.
 *
 * What *is* deterministic is the cause rather than the symptom: on the broken
 * code stepping twice issued exactly **two** step-bearing RSC requests, three
 * runs out of three; on the fixed code it issues **none**, because
 * `history.replaceState` writes the URL without dispatching a navigation. So
 * that is the assertion. It is narrow on purpose — only requests carrying both
 * `_rsc=` and `step=` count, which nothing but mirroring the step can produce,
 * so an unrelated prefetch added later will not trip it.
 *
 * The submit is asserted too, because the navigation count is the mechanism and
 * the save is the thing that matters: if the queue ever wedges by some other
 * route, this still goes red.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject(
  'chromium',
  'a write behaves the same at both viewports; responsive.spec.ts owns the layout',
)

/** The submit is a real round trip to a remote Postgres before it redirects. */
const SUBMIT_TIMEOUT_MS = 30_000

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

test('stepping the wizard issues no navigation, and the last step saves', async ({ page }) => {
  /**
   * Requests that could only have come from mirroring the step: an RSC fetch
   * carrying `step=`. A prefetch of some other route, or of this one without a
   * step, is none of this test's business.
   */
  const stepNavigations: string[] = []

  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/app/onboarding') && url.includes('_rsc=') && url.includes('step=')) {
      stepNavigations.push(url)
    }
  })

  await page.goto('/app/onboarding')
  await expect(page.getByRole('heading', { level: 1, name: 'Your brand' })).toBeVisible()

  /* --- Two steps, back to back ------------------------------------------ */

  // Nothing is awaited between these three lines on purpose: clicks this close
  // together are what used to overlap two navigations and stall the router.
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox', { name: RIGHTS_LABEL }).check()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Your niche and goal' })).toBeVisible()

  /* --- The step reached the URL, without a navigation ------------------- */

  // Both halves matter. The URL has to carry the step, because
  // `helpers/routes.ts` deep-links `?step=2` and `?step=3` and a reload must
  // come back to the panel the reader was on — so this is not fixed by simply
  // not writing the URL. It has to be written *without* navigating.
  await expect(page).toHaveURL(/\/app\/onboarding\?step=3$/)
  expect(
    stepNavigations,
    'mirroring the step must not dispatch a router navigation — see the note at the top',
  ).toEqual([])

  /* --- And the save actually leaves the browser ------------------------- */

  await page
    .getByLabel('What would success look like?')
    .fill('Ten qualified enquiries a month from people who already trust me')

  const openStudio = page.getByRole('button', { name: 'Open my studio' })
  await expect(openStudio).toBeEnabled()
  await openStudio.click()

  // The redirect `saveOnboarding` returns. When the queue was wedged this never
  // arrived: the button simply stayed on "Saving your setup…".
  await expect(page).toHaveURL(/\/app\/home$/, { timeout: SUBMIT_TIMEOUT_MS })
})

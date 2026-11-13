/**
 * The upload screen's two modes.
 *
 * The engine only runs where uv and ffmpeg are, which is a developer's
 * machine and not a deployment. That makes the interesting assertion an
 * environment-dependent one, and an environment-dependent test is a coin
 * toss: it would pass on CI for the wrong reason and fail on a laptop that
 * happens to have the binaries.
 *
 * So both modes are driven by stubbing `/api/engine/status`. The test says
 * what the screen does with each answer, and says it the same way everywhere.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'the two modes are the same at any viewport')

const UPLOAD = '/app/upload?state=ready'
const LIVE_HEADING = 'Run the engine on your own video'

async function stubEngine(page: Page, available: boolean) {
  await page.route('**/api/engine/status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        available,
        reason: available ? 'everything is here.' : 'uv is not on PATH.',
      }),
    }),
  )
}

test('with no engine, the screen keeps its demo states and offers no upload', async ({ page }) => {
  await stubEngine(page, false)
  await page.goto(UPLOAD)

  // The panel is absent rather than disabled: a disabled control still
  // advertises something this machine cannot do.
  await expect(page.getByRole('heading', { name: LIVE_HEADING })).toHaveCount(0)

  // And the demo path is untouched, which is what a Vercel preview shows.
  await expect(page.getByRole('region', { name: 'Cuts' })).toBeVisible()
})

test('with an engine, the panel appears', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto(UPLOAD)

  await expect(page.getByRole('heading', { name: LIVE_HEADING })).toBeVisible()
})

test('a run cannot start until there is a file and a rights confirmation', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto(UPLOAD)

  // CLAUDE.md non-negotiable 1: only client-owned material. The API refuses
  // without a confirmation, and the form refuses before the API has to.
  const start = page.getByRole('button', { name: 'Make cuts' })
  await expect(start).toBeDisabled()

  await page.getByLabel('Who owns it').fill('Maya Torres Coaching')
  await expect(start).toBeDisabled()

  await page.getByRole('checkbox', { name: /I own this footage/ }).check()
  // Still disabled: there is no file yet. Both halves are required.
  await expect(start).toBeDisabled()
})

/* -------------------------------------------------------------------------- */
/* The public upload control                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The public upload control borrows OpusClip's and Vizard's "the input is the
 * product" device (docs/design/COMPETITOR_REFERENCES.md §2.1). Its rules
 * differ from the studio panel's in one way that matters: it must never
 * vanish. The studio can hide a control this machine cannot honour; a landing
 * page that loses its main action on every deployment cannot.
 *
 * It sat *inside* the hero until 2026-11-12 (D22) and now has its own band
 * immediately below it (D34). These tests are named for the control rather
 * than for the hero, because the control is the thing whose behaviour they
 * pin — and because a test named after a layout outlives the layout.
 */
test('the upload keeps a way in when there is no engine', async ({ page }) => {
  await stubEngine(page, false)
  await page.goto('/')

  // The field is still there — it is the shape of the page, not a feature flag.
  await expect(page.getByText('Drop a talk, podcast or webinar')).toBeVisible()

  // But it does not pretend a run can start here. It offers the pilot
  // instead. Both paths share the handoff's "Show me my posts" label, so the
  // tell is the line under the field rather than the button.
  await expect(page.getByText(/We run the first cuts with you on a pilot call/)).toBeVisible()
  await expect(page.getByText(/The run starts the moment you confirm/)).toHaveCount(0)
})

test('the upload runs the engine where there is one, behind the rights gate', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  // CLAUDE.md non-negotiable 1 again, on the public page this time: no file
  // and no confirmation means no run, and the form says so before the API
  // has to.
  const cut = page.getByRole('button', { name: 'Show me my posts' })
  await expect(cut).toBeVisible()
  await expect(cut).toBeDisabled()
  // The live path says a run can start now; the pilot path offers a call
  // instead. The wording changed in D39 — it used to say "on this machine",
  // which was true of a checkout and meaningless to a visitor — but the
  // distinction the assertion protects is the same one.
  await expect(page.getByText(/The run starts the moment you confirm/)).toBeVisible()

  // The rights gate stays out of the way until there is something to confirm.
  await expect(page.getByLabel('Who owns this footage?')).toHaveCount(0)
})

/**
 * The placeholder says "Drop a talk, podcast or webinar", so a drop has to
 * work. It did not until 2026-11-12 (D31): the field invited a gesture it
 * ignored, and the browser's own default for a dropped file is to navigate
 * to it, which throws the page away mid-visit.
 *
 * Driven through a synthetic DataTransfer because Playwright cannot drag a
 * file in from the real desktop. That still exercises what was broken: the
 * dragover default being prevented, and the dropped file reaching state.
 */
async function dropFile(page: Page, name: string, type: string) {
  const handle = await page.evaluateHandle(
    ([fileName, fileType]) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['x'], fileName as string, { type: fileType as string }))
      return transfer
    },
    [name, type],
  )

  const pill = page.getByText('Drop a talk, podcast or webinar')
  await pill.dispatchEvent('dragenter', { dataTransfer: handle })
  await pill.dispatchEvent('dragover', { dataTransfer: handle })
  await pill.dispatchEvent('drop', { dataTransfer: handle })
}

test('the upload accepts a dropped video, as its own placeholder promises', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  await dropFile(page, 'episode-47.mp4', 'video/mp4')

  // The field shows the file, which is the only visible proof it landed.
  await expect(page.getByText('episode-47.mp4')).toBeVisible()
  // And the rights gate appears, exactly as it does for a picked file:
  // dropping is a way in, not a way around non-negotiable 1.
  await expect(page.getByLabel('Who owns this footage?')).toBeVisible()
})

test('the upload says so when a dropped file is not a video it can open', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  await dropFile(page, 'notes.pdf', 'application/pdf')

  // A refused drop that does nothing visible is the same defect as a drop
  // that does nothing at all, only quieter.
  await expect(page.getByText(/not a video we can open/)).toBeVisible()
  // And it must not have been accepted anyway.
  await expect(page.getByLabel('Who owns this footage?')).toHaveCount(0)
})

test('the upload never offers to fetch someone else’s video', async ({ page }) => {
  await stubEngine(page, true)
  await page.goto('/')

  // Both reference sites take a YouTube URL. We cannot: non-negotiable 1
  // allows only client-owned material. This asserts the absence, because the
  // absence is the product decision — if a link field ever appears here, it
  // is a breach and not a feature.
  await expect(page.locator('input[type="url"]')).toHaveCount(0)
  await expect(page.getByPlaceholder(/paste.*link/i)).toHaveCount(0)
  // The handoff's own placeholder, which we must never ship.
  await expect(page.getByText(/Paste a YouTube/i)).toHaveCount(0)
  // And the constraint stated positively, under the field.
  await expect(page.getByText(/only material you own/)).toBeVisible()
})

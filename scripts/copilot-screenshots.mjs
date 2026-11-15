/**
 * Screenshots of the website co-pilot, at both reference viewports.
 *
 * `e2e/screenshots.spec.ts` sweeps routes, and the co-pilot is not one: the
 * launcher exists only after the cookie banner has been answered (18 §3.3),
 * and the panel only after a click and an answer. Those states would
 * therefore never appear in the reference set — so this drives them and
 * writes into the same `docs/screens-built` tree.
 *
 * Run it against a production server, the way the suite does:
 *
 *   pnpm --filter @mirrorline/web build && pnpm --filter @mirrorline/web start
 *   node scripts/copilot-screenshots.mjs
 *
 * `BASE_URL` points it somewhere else — a preview, for instance.
 */

import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve(process.cwd(), 'docs', 'screens-built', 'copilot')
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
]

const ANSWER_TIMEOUT_MS = 20_000
/** Long enough for the panel's entrance to finish, short enough to be cheap. */
const SETTLE_MS = 400

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}--${viewport.name}.png`) })

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

  // 1. The banner is up, so there is no launcher. This is what a first-time
  //    visitor sees, and it is the state §3.3 is about.
  await shot('banner-no-launcher')

  await page.getByRole('button', { name: 'Essential only' }).click()
  const launcher = page.getByRole('button', { name: /Ask about Mirrorline/ })
  await launcher.waitFor()
  await shot('launcher')

  // 2. The panel before anything has been asked.
  await launcher.click()
  const panel = page.getByRole('dialog', { name: /Ask about Mirrorline/ })
  await panel.waitFor()
  await page.waitForTimeout(SETTLE_MS)
  await shot('panel-empty')

  // 3. An answer from our own pages, with the citation under it.
  await panel.getByLabel('Your question').fill('What does the Growth plan include every month?')
  await panel.getByRole('button', { name: 'Ask', exact: true }).click()
  await panel.getByText('Where this came from').waitFor({ timeout: ANSWER_TIMEOUT_MS })
  await shot('panel-answer')

  // 4. A refusal, which is an answer and a person rather than an error.
  await panel.getByLabel('Your question').fill('Will I get 10,000 followers?')
  await panel.getByRole('button', { name: 'Ask', exact: true }).click()
  await panel.getByRole('link', { name: 'Talk to a person' }).waitFor({ timeout: ANSWER_TIMEOUT_MS })
  await page.waitForTimeout(SETTLE_MS)
  await shot('panel-refusal')

  await context.close()
  console.log(`captured ${viewport.name}px`)
}

await browser.close()
console.log(`screenshots in ${path.relative(process.cwd(), OUT)}`)

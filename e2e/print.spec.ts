/**
 * What actually lands on the page when somebody presses "Print or save as PDF"
 * (V1, D120).
 *
 * ============================================================================
 * Why this is an e2e test and not a unit test
 * ============================================================================
 *
 * The whole feature *is* a stylesheet. There is no function to call: the
 * behaviour exists only once a browser has parsed `globals.css`, matched
 * `@media print`, and resolved `visibility` down the tree. A unit test could
 * assert that `data-print-region` is in the markup, which is the half that
 * never breaks.
 *
 * `emulateMedia({ media: 'print' })` is the real check, and it is cheap.
 *
 * ============================================================================
 * The regression being guarded
 * ============================================================================
 *
 * The ledger has had a "Print or save as PDF" button since 13 November and
 * **there were no print rules in the repository at all** until D120 — so for
 * ten days it produced a PDF of the entire studio: sidebar, nav, co-pilot,
 * filter bar, and the document somewhere inside. It did produce *a* PDF, which
 * is exactly why nobody noticed.
 *
 * The failure mode is therefore silent, and the fix is one attribute somebody
 * could delete while tidying. So: assert the chrome is gone, not merely that
 * the report is present.
 */

import { expect, test } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'paper has no viewport')

test('the niche report prints without the studio around it', async ({ page }) => {
  await page.goto('/app/trends')

  const printButton = page.getByRole('button', { name: 'Print or save as PDF' })
  const sidebar = page.getByRole('navigation', { name: 'Studio' })
  const report = page.getByRole('region', { name: /What is working/ })

  // On screen: all three are there.
  await expect(printButton).toBeVisible()
  await expect(sidebar).toBeVisible()
  await expect(report).toBeVisible()

  await page.emulateMedia({ media: 'print' })

  // On paper: the research, and nothing that belongs to the application.
  await expect(report).toBeVisible()
  await expect(sidebar).toBeHidden()
  // A control printed onto the document it produced is the detail that makes
  // a report look unfinished to whoever it was sent to.
  await expect(printButton).toBeHidden()

  // The scan form is the other thing a prospect should never receive.
  await expect(page.getByRole('button', { name: 'Run a scan' })).toBeHidden()
})

test('a printed example keeps the link it cites', async ({ page }) => {
  await page.goto('/app/trends')
  await page.emulateMedia({ media: 'print' })

  const firstExample = page.getByRole('link', { name: /Open the post/ }).first()
  await expect(firstExample).toBeVisible()

  /*
   * The URL is printed after the link text, and this is the one print rule
   * that is not cosmetic.
   *
   * Every example is a **link out** — we hold the pointer and never the work
   * (D115, non-negotiable 1) — and `12 §1` requires a `source_note` per row so
   * that an audit of our sources is answerable from the data. A printed copy
   * that dropped the href would keep the claim and lose the evidence, which is
   * the exact failure D115 corrected in the schema.
   *
   * Read from the generated content rather than from the DOM, because
   * `::after` is not a node.
   */
  const printed = await firstExample.evaluate(
    (node) => globalThis.getComputedStyle(node, '::after').content,
  )

  expect(printed).toContain('http')
})

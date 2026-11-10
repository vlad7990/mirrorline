/**
 * axe-core over every route, in light and in dark.
 *
 * Only `serious` and `critical` violations fail the run — those are the ones
 * that actually stop somebody using the screen. Everything axe found is still
 * printed, with the rule id, the impact and the selector, so a failure can be
 * fixed without re-running anything.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { ROUTES } from './helpers/routes'
import { THEMES, gotoWithTheme, type ThemeName } from './helpers/theme'

onlyProject('chromium', 'One pass at the desktop viewport; responsive.spec.ts owns 390px.')

/** The impacts that fail the build. */
const BLOCKING_IMPACTS: readonly string[] = ['serious', 'critical']

interface Finding {
  readonly id: string
  readonly impact: string
  readonly help: string
  readonly selectors: readonly string[]
}

function describeFinding(finding: Finding): string {
  return `  [${finding.impact}] ${finding.id} — ${finding.help}\n    ${finding.selectors.join('\n    ')}`
}

async function auditRoute(page: Page, path: string, theme: ThemeName): Promise<void> {
  await gotoWithTheme(page, path, theme)

  const results = await new AxeBuilder({ page }).analyze()

  const findings: readonly Finding[] = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    selectors: violation.nodes.map((node) => node.target.join(' ')),
  }))

  if (findings.length > 0) {
    // Printed whether or not the route fails: the report needs the full list.
    console.log(`axe · ${path} · ${theme}\n${findings.map(describeFinding).join('\n')}`)
  }

  const blocking = findings.filter((finding) => BLOCKING_IMPACTS.includes(finding.impact))

  expect(
    blocking,
    blocking.length === 0
      ? ''
      : `serious or critical accessibility violations on ${path} (${theme}):\n${blocking
          .map(describeFinding)
          .join('\n')}`,
  ).toEqual([])
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no serious axe violations in ${theme}`, async ({
      page,
    }) => {
      await auditRoute(page, route.path, theme)
    })
  }
}

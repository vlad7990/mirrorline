/**
 * axe-core over every route, in light and in dark.
 *
 * **`moderate` fails the run too, as of D75.** The gate used to pass
 * everything below `serious`, on the reasoning that those are the violations
 * which actually stop somebody using a screen. What that produced was a gate
 * with a floor under it: `heading-order` is filed `moderate`, so when
 * `/legal/privacy` and `/legal/terms` shipped an `h1 → h3` the suite went
 * green and **Lighthouse caught it instead**, as accessibility 98. A gate a
 * second tool can embarrass is not a gate.
 *
 * `minor` still only prints. The line is where axe itself draws it:
 * `moderate` and above describe something a user meets; `minor` is largely
 * advice about markup that already works.
 *
 * Everything axe finds is printed either way, with the rule id, the impact and
 * the selector, so a failure can be fixed without re-running anything.
 */

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'
import { prepareSessionFor, ROUTES } from './helpers/routes'
import { THEMES, gotoWithTheme, type ThemeName } from './helpers/theme'

onlyProject('chromium', 'One pass at the desktop viewport; responsive.spec.ts owns 390px.')

/** The impacts that fail the build. `minor` prints and does not block. */
const BLOCKING_IMPACTS: readonly string[] = ['moderate', 'serious', 'critical']

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
      : `moderate or worse accessibility violations on ${path} (${theme}):\n${blocking
          .map(describeFinding)
          .join('\n')}`,
  ).toEqual([])
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) has no axe violations above minor in ${theme}`, async ({
      page,
    }) => {
      await prepareSessionFor(page, route)
      await auditRoute(page, route.path, theme)
    })
  }
}

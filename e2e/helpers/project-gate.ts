/**
 * Which Playwright project a spec belongs to.
 *
 * playwright.config.ts defines three projects — `chromium` (1440x900),
 * `mobile` (390x844) and `screenshots` (which depends on `mobile`). Without a
 * gate, every spec would run in all three and the functional suite would be
 * executed three times at two viewports. Each spec calls `onlyProject(...)`
 * once at the top instead, which keeps the config untouched.
 */

import { test } from '@playwright/test'

export type ProjectName = 'chromium' | 'mobile' | 'screenshots'

/**
 * Skip every test in the calling file unless it is running in `name`.
 * Declared as a beforeEach because the project name is only knowable per test.
 */
export function onlyProject(name: ProjectName, reason: string): void {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== name, reason)
  })
}

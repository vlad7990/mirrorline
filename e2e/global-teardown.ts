import {
  deleteTestAccounts,
  readRunId,
  supabaseConfig,
  TEST_ACCOUNT_PREFIX,
} from './helpers/test-accounts'

/**
 * Sweep every test account out of the shared preview database.
 *
 * D76 put all previews on one project, so anything this suite leaves behind
 * accumulates where real work happens. The sweep takes **this run's accounts,
 * plus any `e2e+` account older than two hours** — a crashed run never reaches
 * its own cleanup, so age is what eventually collects it, while anything
 * younger might still belong to a run happening right now.
 *
 * Runs after every project, including on failure — which is the case that
 * matters, because a failing run is exactly the one that left rows behind.
 *
 * **It never throws.** A cleanup that fails the suite turns "the tests passed
 * but the tidy-up did not" into "the tests failed", and the next person to see
 * that reads it as a product bug. It says what it did and gets out of the way.
 */
export default async function globalTeardown(): Promise<void> {
  const config = supabaseConfig()

  if (config === null) {
    console.log('[e2e teardown] no Supabase keys, nothing to sweep')
    return
  }

  try {
    const { users, workspaces, kept } = await deleteTestAccounts(config, readRunId())

    const keptNote =
      kept > 0 ? `, left ${kept} alone (another run's, under two hours old)` : ''

    console.log(
      `[e2e teardown] removed ${users} account(s) matching "${TEST_ACCOUNT_PREFIX}" and ${workspaces} workspace(s)${keptNote}`,
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown failure'
    console.log(`[e2e teardown] sweep did not finish: ${message}`)
  }
}

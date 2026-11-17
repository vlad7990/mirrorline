import { deleteTestAccounts, supabaseConfig, TEST_ACCOUNT_PREFIX } from './helpers/test-accounts'

/**
 * Sweep every test account out of the shared preview database.
 *
 * D76 put all previews on one project, so anything this suite leaves behind
 * accumulates where real work happens. The sweep is by **prefix, not by run
 * id**: a crashed run never reaches its own cleanup, and a teardown that only
 * tidies after itself slowly fills the database it was meant to protect.
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
    const { users, workspaces } = await deleteTestAccounts(config)

    console.log(
      `[e2e teardown] removed ${users} account(s) matching "${TEST_ACCOUNT_PREFIX}" and ${workspaces} workspace(s)`,
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown failure'
    console.log(`[e2e teardown] sweep did not finish: ${message}`)
  }
}

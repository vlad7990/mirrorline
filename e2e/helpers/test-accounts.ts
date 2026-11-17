/**
 * The accounts the end-to-end suite signs in as, and how they are cleaned up.
 *
 * ============================================================================
 * Why the suite needs accounts at all now
 * ============================================================================
 *
 * `/app/*` is behind a session (B1). `helpers/routes.ts` lists 21 studio and
 * onboarding routes, and the shared specs — routes, responsive, a11y,
 * screenshots — iterate all of them. Without a session every one of those
 * redirects to `/sign-in`, so this was never one spec's problem.
 *
 * ============================================================================
 * Every account is tagged, and the teardown sweeps the tag
 * ============================================================================
 *
 * D76 put every preview on **one shared database**, so whatever this suite
 * creates sits beside everything else. Accounts are therefore named
 * `e2e+<runId>-<label>@<domain>` and the teardown deletes **every** address
 * beginning `e2e+` — not only this run's. A crashed run leaves rows behind,
 * and a sweep that tidies only after itself is a sweep that slowly fills the
 * database.
 *
 * **Workspaces go before users.** Deleting the auth user cascades to
 * `profiles` and so to `memberships` — which would leave the workspace
 * orphaned: readable by nobody, deletable through no policy, and resident for
 * good.
 *
 * ============================================================================
 * The domain, which is not yet verified
 * ============================================================================
 *
 * The **admin** API accepts any syntactically valid address, so the accounts
 * this file creates are fine whatever the domain. The **public** sign-up
 * endpoint is fussier: it rejects `@example.com` outright
 * (`Email address … is invalid`), and the one spec that exercises it could not
 * be used to survey alternatives, because the project's built-in sender was
 * rate-limited at the time. D84 records both findings.
 *
 * `E2E_SIGNUP_DOMAIN` overrides the default. That default is a plausible
 * domain nobody here owns, which is deliberate: `.dev` requires registration,
 * so a typo cannot quietly deliver mail to a stranger.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ENV_RELATIVE_PATH = join('apps', 'web', '.env.local')

/**
 * Find `apps/web/.env.local` by walking up from the working directory.
 *
 * **Not `import.meta.url`**, which is what the first version used: Playwright
 * loads its config and helpers as CommonJS, and `import.meta` outside a module
 * is a syntax error — the config failed to load at all, before any test ran.
 * `__dirname` would work but ties this to where the file sits in the tree.
 *
 * Walking up from `process.cwd()` holds whether the suite is started from the
 * repo root or a workspace directory, and stops at the first match.
 */
function findEnvLocal(): string | null {
  let directory = process.cwd()

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(directory, ENV_RELATIVE_PATH)
    if (existsSync(candidate)) return candidate

    const parent = resolve(directory, '..')
    if (parent === directory) break
    directory = parent
  }

  return null
}

/**
 * `KEY=value` out of `apps/web/.env.local`.
 *
 * Playwright's own process does not read it — Next does, for the server under
 * test — and the admin calls here happen in the test process. The same small
 * parser as `vitest.live.setup.ts`, duplicated rather than shared because the
 * two run under different loaders with no common build step, and a shared
 * module would be the only thing either imported across that line.
 *
 * **An exported value wins**, so a shell can point the suite elsewhere.
 */
function readEnvLocal(): Readonly<Record<string, string>> {
  const parsed: Record<string, string> = {}
  const envPath = findEnvLocal()

  if (envPath === null) return parsed

  try {
    for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
      const line = rawLine.trim()
      if (line.length === 0 || line.startsWith('#')) continue

      const at = line.indexOf('=')
      if (at <= 0) continue

      parsed[line.slice(0, at).trim()] = line
        .slice(at + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, '$2')
    }
  } catch {
    // Absent is not an error here. `supabaseConfig()` returns null and the
    // caller reports it in a sentence, which is more use than a file-read stack.
  }

  return parsed
}

export interface SupabaseTestConfig {
  readonly url: string
  readonly anonKey: string
  readonly secretKey: string
}

/** Null when the suite has no credentials, so a caller can skip rather than throw. */
export function supabaseConfig(): SupabaseTestConfig | null {
  const file = readEnvLocal()
  const read = (name: string): string => (process.env[name] ?? file[name] ?? '').trim()

  const url = read('SUPABASE_URL') || read('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = read('NEXT_PUBLIC_SUPABASE_ANON_KEY') || read('SUPABASE_ANON_KEY')
  const secretKey = read('SUPABASE_SERVICE_ROLE_KEY')

  if (url === '' || anonKey === '' || secretKey === '') return null

  return { url: url.replace(/\/$/, ''), anonKey, secretKey }
}

/** Where the signed-in state is written, for the projects that depend on setup. */
export const STUDIO_STORAGE_STATE = '.playwright/auth/studio.json'

/** Every test address starts with this. The teardown sweeps on it. */
export const TEST_ACCOUNT_PREFIX = 'e2e+'

export const SIGNUP_DOMAIN = process.env.E2E_SIGNUP_DOMAIN ?? 'mirrorline-test.dev'

/** One id per run, so parallel runs on the shared database cannot collide. */
export function newRunId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function testEmail(runId: string, label = 'studio'): string {
  return `${TEST_ACCOUNT_PREFIX}${runId}-${label}@${SIGNUP_DOMAIN}`
}

/** Clears the form's 12-character minimum, and differs every run. */
export function testPassword(runId: string): string {
  return `e2e-${runId}-${Math.random().toString(36).slice(2, 10)}`
}

interface AdminUser {
  readonly id: string
  readonly email: string
}

function adminHeaders(config: SupabaseTestConfig): Record<string, string> {
  // `apikey` only. `sb_secret_…` is not a JWT and must never travel as a
  // bearer token — `apps/web/lib/supabase/rest.ts` carries the full reasoning.
  return { apikey: config.secretKey, 'Content-Type': 'application/json' }
}

/**
 * A confirmed account, created without sending any mail.
 *
 * `email_confirm: true` is what keeps this off the rate-limited sender. The
 * metadata is the shape `signUpWithPassword` attaches, so the profile trigger
 * and the workspace bootstrap see what they would after a real sign-up.
 */
export async function createConfirmedUser(
  config: SupabaseTestConfig,
  email: string,
  password: string,
  workspaceName: string,
): Promise<AdminUser> {
  const response = await fetch(`${config.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(config),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'End to end',
        workspace_name: workspaceName,
        audience: 'business',
        stage: 'existing',
        goal_type: 'bookings',
      },
    }),
  })

  const body = (await response.json()) as { id?: unknown; msg?: unknown }

  if (!response.ok || typeof body.id !== 'string') {
    const detail = typeof body.msg === 'string' ? body.msg : `HTTP ${response.status}`
    throw new Error(`could not create the e2e account: ${detail}`)
  }

  return { id: body.id, email }
}

/** Every tagged account currently in the project, across all runs. */
async function listTestUsers(config: SupabaseTestConfig): Promise<readonly AdminUser[]> {
  const found: AdminUser[] = []

  // The admin list is paged, and a neglected database can hold a few pages.
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`${config.url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: adminHeaders(config),
    })

    if (!response.ok) break

    const body = (await response.json()) as {
      users?: readonly { id?: unknown; email?: unknown }[]
    }
    const users = body.users ?? []

    for (const user of users) {
      if (
        typeof user.id === 'string' &&
        typeof user.email === 'string' &&
        user.email.startsWith(TEST_ACCOUNT_PREFIX)
      ) {
        found.push({ id: user.id, email: user.email })
      }
    }

    if (users.length === 0) break
  }

  return found
}

/** Delete every tagged account and the workspaces they own. Workspaces first. */
export async function deleteTestAccounts(config: SupabaseTestConfig): Promise<{
  users: number
  workspaces: number
}> {
  const users = await listTestUsers(config)
  let workspaceCount = 0

  for (const user of users) {
    const memberships = await fetch(
      `${config.url}/rest/v1/memberships?user_id=eq.${user.id}&select=workspace_id`,
      { headers: adminHeaders(config) },
    )

    const rows = memberships.ok
      ? ((await memberships.json()) as readonly { workspace_id?: unknown }[])
      : []

    for (const row of rows) {
      if (typeof row.workspace_id !== 'string') continue

      const deleted = await fetch(`${config.url}/rest/v1/workspaces?id=eq.${row.workspace_id}`, {
        method: 'DELETE',
        headers: adminHeaders(config),
      })

      if (deleted.ok) workspaceCount += 1
    }

    await fetch(`${config.url}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: adminHeaders(config),
    }).catch(() => null)
  }

  return { users: users.length, workspaces: workspaceCount }
}

/**
 * The cookies `auth.setup.ts` saved, so a session can be put *back*.
 *
 * Needed because `screenshots.spec.ts` captures every screen inside **one**
 * test, sequentially. Clearing cookies for `/sign-in` there does not isolate
 * that screen — it signs the page out for every screen captured afterwards,
 * which is how four screenshot tests failed with studio pages rendering as
 * sign-in redirects. Restoring is the other half of clearing.
 */
export function readStoredCookies(): readonly {
  name: string
  value: string
  domain: string
  path: string
}[] {
  try {
    const state = JSON.parse(readFileSync(STUDIO_STORAGE_STATE, 'utf8')) as {
      cookies?: readonly { name?: unknown; value?: unknown; domain?: unknown; path?: unknown }[]
    }

    return (state.cookies ?? []).flatMap((cookie) =>
      typeof cookie.name === 'string' &&
      typeof cookie.value === 'string' &&
      typeof cookie.domain === 'string' &&
      typeof cookie.path === 'string'
        ? [{ name: cookie.name, value: cookie.value, domain: cookie.domain, path: cookie.path }]
        : [],
    )
  } catch {
    // No state file: the caller is running without the setup project, and
    // `prepareSessionFor` simply has nothing to restore.
    return []
  }
}

export interface SignUpProbe {
  readonly status: number
  readonly isRateLimited: boolean
  readonly reason: string
}

/**
 * Ask the public sign-up endpoint what it thinks, so a spec can tell "the
 * sender is spent" apart from "this is broken".
 *
 * The UI shows one deliberately opaque sentence for every unexpected failure,
 * which is right for a person and useless for a test. This is how the sign-up
 * spec decides whether to skip (rate limit, not our code) or fail (anything
 * else). Called **only on the failure path**, where the quota has gone anyway.
 */
export async function probeSignUp(
  config: SupabaseTestConfig,
  email: string,
  password: string,
): Promise<SignUpProbe> {
  const response = await fetch(`${config.url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const body = (await response.json().catch(() => ({}))) as {
    msg?: unknown
    error_description?: unknown
    error_code?: unknown
  }

  const reason =
    (typeof body.msg === 'string' ? body.msg : undefined) ??
    (typeof body.error_description === 'string' ? body.error_description : undefined) ??
    (typeof body.error_code === 'string' ? body.error_code : undefined) ??
    `HTTP ${response.status}`

  return {
    status: response.status,
    isRateLimited: response.status === 429 || /rate limit/i.test(reason),
    reason,
  }
}

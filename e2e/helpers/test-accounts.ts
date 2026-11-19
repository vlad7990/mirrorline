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
 * creates sits beside everything else. Accounts are named
 * `e2e+<runId>-<label>@<domain>`, and the teardown deletes **this run's
 * accounts, plus any `e2e+` account older than two hours**.
 *
 * Both halves matter. Sweeping only this run would let a crashed run's rows
 * accumulate for ever; sweeping *every* `e2e+` address would let two
 * concurrent runs delete each other's accounts mid-test, and that failure
 * surfaces as a random auth error — the worst kind to debug. The age rule is
 * the line between debris and somebody else's live fixtures.
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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

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

/**
 * The placeholder domain for accounts made through the **admin API**, which
 * sends no mail at all. `E2E_SIGNUP_DOMAIN` overrides it.
 *
 * `.invalid` is reserved by RFC 2606 and can never be registered or resolve,
 * so these addresses cannot reach a stranger even by accident. The previous
 * default was `mirrorline-test.dev` — a plausible domain nobody here owns,
 * chosen on the same reasoning but weaker in one way that mattered: `.dev` is
 * registrable, so "nobody owns it" was true on the day it was written rather
 * than true by construction.
 */
export const SIGNUP_DOMAIN = process.env.E2E_SIGNUP_DOMAIN ?? 'e2e.invalid'

/**
 * The one address the **UI sign-up form** may use, which does send real mail.
 *
 * Unset by default and there is no fallback on purpose: a default here would be
 * a guess about whose inbox receives a confirmation email, and the only safe
 * guess is none. `sign-up-ui.spec.ts` skips with a reason when this is absent.
 *
 * Set it to a plus-address on a mailbox you own — `you+mirrorline@example.com`.
 */
export const SIGNUP_UI_EMAIL = process.env.E2E_SIGNUP_EMAIL ?? null

/**
 * A per-run address derived from `E2E_SIGNUP_EMAIL`, or `null` when unset.
 *
 * **Why not use the configured address as given.** It is one fixed address, so
 * a second run would hit "a user with this email already exists" and the test
 * would fail on its own leftovers. Plus-addressing gives every run its own
 * address that still lands in the same inbox.
 *
 * Any existing tag is dropped first: `you+mirrorline@example.com` becomes
 * `you+e2e-<runId>-signup@example.com`, not a second `+` the stricter
 * providers reject. The `e2e-<runId>-` shape is what lets
 * `shouldDeleteTestAccount` recognise and sweep these too.
 */
export function signupUiEmail(runId: string, label = 'signup'): string | null {
  if (SIGNUP_UI_EMAIL === null) return null

  const [local, domain] = SIGNUP_UI_EMAIL.split('@')
  if (!local || !domain) return null

  const base = local.split('+')[0]
  return `${base}+e2e-${runId}-${label}@${domain}`
}

/**
 * One id per run, so parallel runs on the shared database cannot collide.
 *
 * **The first eight characters are `Date.now()` in base 36**, which is what
 * lets the teardown work out how old an account is from its address alone.
 * That matters because the sweep must never delete a *live* account belonging
 * to somebody else's run on the shared preview database (D76).
 */
export function newRunId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

const RUN_ID_TIMESTAMP_LENGTH = 8

/** Where this run leaves its id for the teardown, which runs in a separate process. */
const RUN_ID_FILE = '.playwright/auth/run-id.txt'

export function writeRunId(runId: string): void {
  mkdirSync(dirname(RUN_ID_FILE), { recursive: true })
  writeFileSync(RUN_ID_FILE, runId, 'utf8')
}

export function readRunId(): string | null {
  try {
    const value = readFileSync(RUN_ID_FILE, 'utf8').trim()
    return value.length > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * When a run id was minted, or `null` if it does not parse.
 *
 * **The shape check is load-bearing, and a test is why it exists.** The first
 * version only tried `parseInt(…, 36)`, which happily accepts any word made of
 * `0-9a-z` — `"not"`, out of `e2e+not-a-run-id@…`, parses to a small number,
 * reads as a timestamp from 1970, and would have been deleted as ancient. The
 * id must look like one `newRunId` produced, and the timestamp must be after
 * this project existed.
 */
const EARLIEST_PLAUSIBLE_MS = Date.UTC(2020, 0, 1)
const RUN_ID_PATTERN = /^[0-9a-z]{12}$/

function runIdMintedAt(runId: string): number | null {
  if (!RUN_ID_PATTERN.test(runId)) return null

  const stamp = Number.parseInt(runId.slice(0, RUN_ID_TIMESTAMP_LENGTH), 36)
  if (!Number.isFinite(stamp) || stamp < EARLIEST_PLAUSIBLE_MS) return null

  return stamp
}

/** Two hours. Longer than any run, short enough that debris does not accumulate. */
export const STALE_ACCOUNT_AGE_MS = 2 * 60 * 60 * 1000

/**
 * Should the sweep delete this address?
 *
 * **Only two reasons**, and the distinction is the whole point:
 *
 * - it belongs to **this** run, or
 * - it is **older than two hours**, so no live run can still be using it.
 *
 * An `e2e+` account from somebody else's run started ten minutes ago is left
 * alone. The previous version deleted every `e2e+` address it found, which on
 * a shared database (D76) meant two concurrent runs could delete each other's
 * accounts mid-test — the failure would look like a random auth error, which
 * is the worst kind to debug.
 *
 * An address whose id does not parse is treated as **not** stale: the sweep
 * refuses to guess about something it does not recognise.
 */
/**
 * The run id inside a test address, or `null` if this is not one of ours.
 *
 * **Two shapes, because there are two ways an account gets made.** Admin-API
 * accounts own their whole local part and start with the tag. The UI sign-up
 * account lives on a real mailbox somebody owns (`E2E_SIGNUP_EMAIL`), so its
 * local part begins with a stranger's name and carries the tag in a plus
 * suffix instead. Matching only the first shape would leave every UI sign-up
 * account behind — on a real inbox, which is the worst place to accumulate
 * them.
 */
function runIdFromTestEmail(email: string): string | null {
  const local = email.split('@')[0] ?? ''

  // `e2e+<runId>-<label>@…`
  if (local.startsWith(TEST_ACCOUNT_PREFIX)) {
    return local.slice(TEST_ACCOUNT_PREFIX.length).split('-')[0] ?? ''
  }

  // `<base>+e2e-<runId>-signup@…`
  return local.match(/\+e2e-([^-@]+)-/)?.[1] ?? null
}

export function shouldDeleteTestAccount(
  email: string,
  currentRunId: string | null,
  now: number,
): boolean {
  const runId = runIdFromTestEmail(email)
  if (runId === null) return false

  if (currentRunId !== null && runId === currentRunId) return true

  const mintedAt = runIdMintedAt(runId)
  if (mintedAt === null) return false

  return now - mintedAt > STALE_ACCOUNT_AGE_MS
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

/**
 * The workspace a given user owns, read with the service role.
 *
 * Service role on purpose: this is used to check what is **actually in the
 * database** before and after a deletion, and reading it as the user would
 * make an empty answer ambiguous — RLS returning nothing looks identical to
 * the rows being gone. The point of the check is to tell those two apart.
 */
export async function findOwnedWorkspaceId(
  config: SupabaseTestConfig,
  userId: string,
): Promise<string | null> {
  const response = await fetch(
    `${config.url}/rest/v1/memberships?user_id=eq.${userId}&role=eq.owner&select=workspace_id&limit=1`,
    { headers: adminHeaders(config) },
  )

  if (!response.ok) return null

  const rows = (await response.json()) as readonly { workspace_id?: unknown }[]
  const id = rows[0]?.workspace_id

  return typeof id === 'string' ? id : null
}

/** The tables a workspace cascades through, for proving a deletion was total. */
const WORKSPACE_CHILD_TABLES = [
  'memberships',
  'goals',
  'social_accounts',
  'ledger_weekly',
  'alerts',
  'trends',
  // B2.2. Listed here because the calendar fixture puts rows in it, and the
  // sweep's only claim on them is the `on delete cascade` from `workspaces` — a
  // claim `workspace-delete.spec.ts` should be checking rather than trusting.
  // `post_moves` cannot be listed: it reaches the workspace through
  // `scheduled_post_id` and has no `workspace_id` to filter on.
  'scheduled_posts',
] as const

/**
 * How many rows still reference this workspace, table by table, service role.
 *
 * Returned as a map rather than a total so a failure names the table that kept
 * its rows. A single number would say "something survived" and leave the next
 * person to find out what.
 */
export async function workspaceRowCounts(
  config: SupabaseTestConfig,
  workspaceId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  const workspace = await fetch(
    `${config.url}/rest/v1/workspaces?id=eq.${workspaceId}&select=id`,
    { headers: adminHeaders(config) },
  )
  counts.workspaces = workspace.ok ? ((await workspace.json()) as unknown[]).length : -1

  for (const table of WORKSPACE_CHILD_TABLES) {
    const response = await fetch(
      `${config.url}/rest/v1/${table}?workspace_id=eq.${workspaceId}&select=id`,
      { headers: adminHeaders(config) },
    )
    counts[table] = response.ok ? ((await response.json()) as unknown[]).length : -1
  }

  return counts
}

/**
 * Give a workspace one objective and one key result, with the service role.
 *
 * **Fixture, not product behaviour.** Nothing writes objectives or key results
 * yet — the Performance Analyst proposes them, and that agent is not built. So
 * a test that wants to edit a target has to put one there first, and doing it
 * with the service role keeps the fixture out of the thing being tested: the
 * UI edit that follows runs as the user, under RLS, exactly as a client's
 * would.
 *
 * `leads` is deliberate: `GoalsBoard` finds its headline bar by that KPI key,
 * so seeding it exercises the outcome bar as well as the key-result row.
 */
export async function seedGoalCascade(
  config: SupabaseTestConfig,
  options: { readonly target: number; readonly userId: string },
): Promise<{ readonly keyResultId: string } | null> {
  const headers = { ...adminHeaders(config), Prefer: 'return=representation' }

  // **Scoped to this user's workspace.** Selecting the first primary goal in
  // the project would seed whichever workspace happened to be created first,
  // and every test here would then assert against somebody else's rows.
  const workspaceId = await findOwnedWorkspaceId(config, options.userId)
  if (workspaceId === null) return null

  const goals = (await (
    await fetch(
      `${config.url}/rest/v1/goals?select=id&is_primary=eq.true&workspace_id=eq.${workspaceId}&limit=1`,
      { headers: adminHeaders(config) },
    )
  ).json()) as readonly { id?: unknown }[]

  const goalId = goals[0]?.id
  if (typeof goalId !== 'string') return null

  const objectives = (await (
    await fetch(`${config.url}/rest/v1/objectives`, {
      method: 'POST',
      headers,
      body: JSON.stringify([{ goal_id: goalId, text: 'Publish daily and answer every comment' }]),
    })
  ).json()) as readonly { id?: unknown }[]

  const objectiveId = objectives[0]?.id
  if (typeof objectiveId !== 'string') return null

  const keyResults = (await (
    await fetch(`${config.url}/rest/v1/key_results`, {
      method: 'POST',
      headers,
      body: JSON.stringify([
        {
          objective_id: objectiveId,
          kpi_key: 'leads',
          baseline: 10,
          target: options.target,
          basis: '14-day baseline + niche benchmarks',
          due: '2027-01-06',
        },
      ]),
    })
  ).json()) as readonly { id?: unknown }[]

  const keyResultId = keyResults[0]?.id
  return typeof keyResultId === 'string' ? { keyResultId } : null
}

/* -------------------------------------------------------------------------- */
/* The calendar's fixture (B2.2)                                              */
/* -------------------------------------------------------------------------- */

/**
 * Monday of the week a UTC instant falls in, `YYYY-MM-DD`.
 *
 * UTC on both sides on purpose. `seedScheduledPosts` pins the workspace's zone
 * to UTC, so this and `weekStartFor` in the app agree about which week is being
 * drawn — otherwise a run a few hours either side of midnight could seed the
 * week next to the one on screen and fail with an empty grid.
 */
function utcWeekStart(now: Date): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  // `getUTCDay()` calls Sunday 0, so a Sunday has to come back six days rather
  // than being treated as the start of the week it ends.
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * One day's posts, repeated across all seven.
 *
 * **Every day identical, on purpose.** The specs that walk this calendar read
 * "tomorrow" — the batch bar counts tomorrow's approvals, and the grid
 * highlights it — and *tomorrow is a different weekday on every run*. A fixture
 * with a shape (busy Monday, quiet Friday) would make the batch bar's count
 * depend on which day the suite happened to run, and a spec asserting a number
 * would be green from Monday to Thursday and red at the weekend. A flat week
 * costs four rows a day and removes the whole class.
 *
 * The shape the specs do need:
 *
 *  - **three platform rows**, so "a post cannot be dragged onto another
 *    platform row" has a foreign row to try;
 *  - **two times on the Instagram row**, so the "Move to…" menu has more than
 *    one slot to offer and the slot-menu test has something to compare;
 *  - **one post with AI scenes**, so the label non-negotiable 4 forces on is on
 *    screen somewhere.
 */
const CALENDAR_DAY = [
  { platform: 'instagram', time24: '07:30', label: 'Morning post' },
  { platform: 'instagram', time24: '14:15', label: 'Afternoon post' },
  { platform: 'tiktok', time24: '12:15', label: 'Midday TikTok' },
  { platform: 'youtube', time24: '17:00', label: 'Evening Shorts' },
] as const

const DAYS_IN_WEEK = 7

/** The one post that carries AI scenes: Wednesday's afternoon Instagram. */
const AI_SCENES_AT = { dayOffset: 2, index: 1 } as const

export interface SeededCalendar {
  readonly workspaceId: string
  readonly weekStart: string
  /** Ids in insertion order: Monday's four, then Tuesday's, and so on. */
  readonly postIds: readonly string[]
  /**
   * The title of Monday's first post — `Morning post <runId> d0`.
   *
   * The `d<offset>` suffix is load-bearing, not decoration. Every day carries
   * the same four labels, so a spec locating "Morning post <runId>" would match
   * seven chips and fail strict mode. The suffix makes exactly one of them
   * clickable, and it is the one this field names.
   */
  readonly firstTitle: string
}

/**
 * Put a week of posts on a workspace's calendar, with the service role.
 *
 * **Fixture, not product behaviour** — the same bargain `seedGoalCascade`
 * makes, and for a stronger reason here: there is no insert policy on
 * `scheduled_posts` at all, because the pipeline authors posts and a member may
 * only *move* one (D95). So a test cannot create a post as the user even in
 * principle, and doing it with the service role keeps the fixture out of the
 * thing under test: the move that follows runs as the user, under RLS, through
 * the same action a client's drag would.
 *
 * **Tagged with the run id**, in the title, so a row found later can be traced
 * to the run that made it.
 *
 * **Swept with the account.** `scheduled_posts.workspace_id` is
 * `on delete cascade`, and `deleteTestAccounts` deletes the owned workspaces
 * before the users — so these rows go when the account does, including for a
 * run that died before its teardown, which the two-hour rule collects.
 * `WORKSPACE_CHILD_TABLES` includes the table so that cascade is asserted
 * rather than assumed.
 */
export async function seedScheduledPosts(
  config: SupabaseTestConfig,
  options: { readonly userId: string; readonly runId: string; readonly now?: Date },
): Promise<SeededCalendar | null> {
  const workspaceId = await findOwnedWorkspaceId(config, options.userId)
  if (workspaceId === null) return null

  const headers = { ...adminHeaders(config), Prefer: 'return=representation' }

  // Pinned, so the app and this fixture agree on which week is "this" one. A
  // workspace created by `ensure_workspace_for_current_user` has no zone — only
  // onboarding captures one (D97) — and the app then falls back to the server's
  // UTC date. Setting it makes that agreement explicit instead of incidental.
  const zoned = await fetch(`${config.url}/rest/v1/workspaces?id=eq.${workspaceId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ timezone: 'UTC' }),
  })
  if (!zoned.ok) return null

  const weekStart = utcWeekStart(options.now ?? new Date())

  const rows = Array.from({ length: DAYS_IN_WEEK }).flatMap((_unused, dayOffset) =>
    CALENDAR_DAY.map((entry, index) => ({
      workspace_id: workspaceId,
      platform: entry.platform,
      // `d<offset>` so one chip can be located among seven identical days.
      title: `${entry.label} ${options.runId} d${dayOffset}`,
      // Every post needs review, so the batch bar has the same count whichever
      // weekday "tomorrow" turns out to be.
      status: 'needs-review',
      scheduled_date: addUtcDays(weekStart, dayOffset),
      scheduled_time24: entry.time24,
      has_ai_scenes: dayOffset === AI_SCENES_AT.dayOffset && index === AI_SCENES_AT.index,
    })),
  )

  const response = await fetch(`${config.url}/rest/v1/scheduled_posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  })

  if (!response.ok) return null

  const created = (await response.json()) as readonly { id?: unknown }[]
  const postIds = created.map((row) => row.id).filter((id): id is string => typeof id === 'string')

  // All or nothing. A partially seeded calendar is the state that produces a
  // confusing failure three specs later rather than here.
  if (postIds.length !== rows.length) return null

  return {
    workspaceId,
    weekStart,
    postIds,
    firstTitle: rows[0]?.title ?? '',
  }
}

/** Where a post sits now, service role, so RLS cannot mask a failure. */
export async function readScheduledPostSlot(
  config: SupabaseTestConfig,
  postId: string,
): Promise<{ readonly date: string; readonly time24: string } | null> {
  const response = await fetch(
    `${config.url}/rest/v1/scheduled_posts?id=eq.${postId}&select=scheduled_date,scheduled_time24`,
    { headers: adminHeaders(config) },
  )

  if (!response.ok) return null

  const rows = (await response.json()) as readonly {
    scheduled_date?: unknown
    scheduled_time24?: unknown
  }[]

  const row = rows[0]
  if (typeof row?.scheduled_date !== 'string' || typeof row.scheduled_time24 !== 'string') {
    return null
  }

  return { date: row.scheduled_date, time24: row.scheduled_time24 }
}

/**
 * How many audit rows a post has collected.
 *
 * The audit is written by `record_post_move()`, a trigger — so counting it is
 * how a test proves the application did not have to remember to (D95). Read
 * with the service role because `post_moves` has a select policy for members
 * and this assertion must not depend on one.
 */
export async function countPostMoves(
  config: SupabaseTestConfig,
  postId: string,
): Promise<number> {
  const response = await fetch(
    `${config.url}/rest/v1/post_moves?scheduled_post_id=eq.${postId}&select=id`,
    { headers: adminHeaders(config) },
  )

  if (!response.ok) return -1

  return ((await response.json()) as readonly unknown[]).length
}

/** The stored target, read with the service role so RLS cannot mask a failure. */
export async function readKeyResultTarget(
  config: SupabaseTestConfig,
  keyResultId: string,
): Promise<number | null> {
  const rows = (await (
    await fetch(`${config.url}/rest/v1/key_results?id=eq.${keyResultId}&select=target`, {
      headers: adminHeaders(config),
    })
  ).json()) as readonly { target?: unknown }[]

  const target = rows[0]?.target
  return target === undefined || target === null ? null : Number(target)
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
      // `runIdFromTestEmail`, not a prefix check: the UI sign-up account lives
      // on a real mailbox and carries its tag in a plus suffix, so a prefix
      // check here would hide it from the sweep that is about to decide
      // whether it is stale.
      if (
        typeof user.id === 'string' &&
        typeof user.email === 'string' &&
        runIdFromTestEmail(user.email) !== null
      ) {
        found.push({ id: user.id, email: user.email })
      }
    }

    if (users.length === 0) break
  }

  return found
}

/**
 * Delete this run's accounts and anything older than two hours, and the
 * workspaces they own. Workspaces first — see the note at the top of the file.
 */
export async function deleteTestAccounts(
  config: SupabaseTestConfig,
  currentRunId: string | null,
  now: number = Date.now(),
): Promise<{ users: number; workspaces: number; kept: number }> {
  const all = await listTestUsers(config)
  const users = all.filter((user) => shouldDeleteTestAccount(user.email, currentRunId, now))
  const kept = all.length - users.length
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

  return { users: users.length, workspaces: workspaceCount, kept }
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

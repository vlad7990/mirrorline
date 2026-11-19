/**
 * The policies, proved against a real Supabase instance. `pnpm test:rls-db`.
 *
 * `docs/plan/BACKEND_PHASE.md` §1: *"Written against a real Supabase instance
 * — local or a dedicated test project — because a mocked RLS test proves
 * nothing."* That sentence is why this file is not part of `pnpm test`: a
 * mocked version of it would be green and worthless, so there is no mocked
 * version. With no credentials it fails in `beforeAll` with a sentence saying
 * what to set.
 *
 * ============================================================================
 * Why every row is namespaced, and deleted
 * ============================================================================
 *
 * D76 put every preview on **one shared database**. Two branches can therefore
 * run this suite at the same moment, and a fixture at a fixed, well-known id
 * would have them fighting over it. So each run invents a `runId`, every row
 * it creates carries that id, and `afterAll` removes them.
 *
 * Nothing here reads or writes a row it did not create. The service-role
 * assertions check that *our* rows are visible rather than asserting a total,
 * because another run's rows may legitimately be present.
 *
 * ============================================================================
 * The cast
 * ============================================================================
 *
 * - **A** owns workspace A. The reader whose blindness to B is the point.
 * - **B** owns workspace B.
 * - **C** is a *member* of workspace B, not an owner — the one who must not be
 *   able to delete it.
 * - **D** owns workspace D and nothing else, so deleting it is deleting their
 *   last workspace and D's auth user should go with it (D80).
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { requireAnonSupabaseConfig, requireServerSupabaseConfig } from './env'
import {
  adminCreateUser,
  adminDeleteUser,
  adminUserExists,
  restDelete,
  restInsert,
  restRpc,
  restSelect,
  restUpdate,
  signIn,
  type RestCredentials,
  type RestResponse,
} from './rest'

interface Row {
  readonly id: string
}

const runId = globalThis.crypto.randomUUID().slice(0, 8)
/** Not a secret: it exists for the length of one run against a preview database. */
const password = `rls-${globalThis.crypto.randomUUID()}`

let url = ''
let serviceRole: RestCredentials
let anonymous: RestCredentials

/** Signed-in credentials: the anon key as `apikey`, the user's token as bearer. */
function asUser(accessToken: string): RestCredentials {
  return { url, apiKey: anonymous.apiKey, accessToken }
}

interface TestUser {
  readonly id: string
  readonly email: string
  readonly token: string
}

const users = new Map<string, TestUser>()
const workspaceIds = new Map<string, string>()
/** Children of workspace D, kept so the cascade can be asserted by id. */
const workspaceDChildren = { goalId: '', objectiveId: '', socialAccountId: '' }

/**
 * Fixtures through an accessor rather than an index.
 *
 * `beforeAll` builds all of them, so in a passing run these never throw. They
 * exist for the failing run: if setup died halfway, "fixture user c was never
 * created" names the problem, where `users.c!.token` would have thrown
 * `Cannot read properties of undefined` from whichever assertion happened to
 * run first.
 */
function user(letter: string): TestUser {
  const found = users.get(letter)
  if (found === undefined) throw new Error(`fixture user ${letter} was never created`)
  return found
}

function workspace(letter: string): string {
  const found = workspaceIds.get(letter)
  if (found === undefined) throw new Error(`fixture workspace ${letter} was never created`)
  return found
}

/**
 * The id of the row a call was supposed to return, or a sentence about what was
 * missing. Same reasoning as the accessors above — the length checks beside
 * these calls already cover the passing path, and this covers the other one
 * with something more use than a property access on `undefined`.
 */
function firstRowId(response: RestResponse<Row>, label: string): string {
  const row = response.rows[0]
  if (row === undefined) throw new Error(`expected one ${label} row and got none`)
  return row.id
}

async function createUser(letter: string): Promise<void> {
  const email = `rls-${runId}-${letter}@example.com`
  const created = await adminCreateUser(url, serviceRole.apiKey, email, password)
  const token = await signIn(url, anonymous.apiKey, email, password)
  users.set(letter, { id: created.id, email, token })
}

async function createWorkspace(letter: string, ownerLetter: string, role: string): Promise<string> {
  const inserted = await restInsert<Row>(serviceRole, 'workspaces', [
    { name: `RLS ${letter} ${runId}`, niche: 'testing', plan_name: 'pilot' },
  ])

  if (!inserted.ok || inserted.rows.length !== 1) {
    throw new Error(
      `could not create workspace ${letter}: HTTP ${inserted.status} ${inserted.errorMessage ?? ''}`,
    )
  }

  const workspaceId = firstRowId(inserted, `workspace ${letter}`)

  const membership = await restInsert(serviceRole, 'memberships', [
    { workspace_id: workspaceId, user_id: user(ownerLetter).id, role },
  ])

  if (!membership.ok) {
    throw new Error(
      `could not add ${ownerLetter} to workspace ${letter}: ${membership.errorMessage ?? membership.status}`,
    )
  }

  return workspaceId
}

/** A goal per workspace, so "A cannot read B's rows" has a row to not read. */
async function seedGoal(workspaceId: string): Promise<string> {
  const goal = await restInsert<Row>(serviceRole, 'goals', [
    {
      workspace_id: workspaceId,
      goal_type: 'leads',
      is_primary: true,
      outcome_text: `the outcome for ${runId}`,
      period: 'quarter',
    },
  ])

  if (!goal.ok || goal.rows.length !== 1) {
    throw new Error(`could not seed a goal: ${goal.errorMessage ?? goal.status}`)
  }

  return firstRowId(goal, 'goal')
}

/**
 * One scheduled post per workspace, for B2.2's move tests. Keyed by the
 * workspace letter, like `workspaceIds`.
 */
const scheduledPostIds = new Map<string, string>()

function scheduledPost(letter: string): string {
  const id = scheduledPostIds.get(letter)
  if (!id) throw new Error(`no scheduled post fixture for workspace ${letter}`)
  return id
}

beforeAll(async () => {
  // Throws a sentence naming the variable and the file. That is the whole of
  // the "no credentials" experience, by design.
  const server = requireServerSupabaseConfig()
  const anon = requireAnonSupabaseConfig()

  url = server.url
  // `accessToken: null` for both. The keys are `sb_secret_…` and
  // `sb_publishable_…`, which travel in `apikey`; a bearer token here would put
  // a server credential in the header meant for a user's session JWT. Only
  // `asUser()` sets a bearer, and what it sets is a real session token.
  serviceRole = { url, apiKey: server.serviceRoleKey, accessToken: null }
  anonymous = { url, apiKey: anon.anonKey, accessToken: null }

  await createUser('a')
  await createUser('b')
  await createUser('c')
  await createUser('d')

  workspaceIds.set('a', await createWorkspace('A', 'a', 'owner'))
  workspaceIds.set('b', await createWorkspace('B', 'b', 'owner'))
  workspaceIds.set('d', await createWorkspace('D', 'd', 'owner'))

  // C joins B's workspace as a plain member.
  const cMembership = await restInsert(serviceRole, 'memberships', [
    { workspace_id: workspace('b'), user_id: user('c').id, role: 'member' },
  ])
  if (!cMembership.ok) {
    throw new Error(`could not add C as a member: ${cMembership.errorMessage ?? cMembership.status}`)
  }

  await seedGoal(workspace('a'))
  await seedGoal(workspace('b'))

  // Workspace D gets a row in every shape the cascade has to reach.
  workspaceDChildren.goalId = await seedGoal(workspace('d'))

  const objective = await restInsert<Row>(serviceRole, 'objectives', [
    { goal_id: workspaceDChildren.goalId, text: `objective ${runId}`, position: 0 },
  ])
  workspaceDChildren.objectiveId = objective.rows[0]?.id ?? ''

  await restInsert(serviceRole, 'key_results', [
    {
      objective_id: workspaceDChildren.objectiveId,
      kpi_key: 'posts_published',
      baseline: 0,
      target: 10,
      basis: 'test fixture',
    },
  ])

  const socialAccount = await restInsert<Row>(serviceRole, 'social_accounts', [
    { workspace_id: workspace('d'), platform: 'instagram', handle: `@rls_${runId}` },
  ])
  workspaceDChildren.socialAccountId = socialAccount.rows[0]?.id ?? ''

  await restInsert(serviceRole, 'ledger_weekly', [
    { workspace_id: workspace('d'), week: '2026-11-16', posts: 3, views: 100 },
  ])

  await restInsert(serviceRole, 'trends', [
    {
      workspace_id: workspace('d'),
      format: `format ${runId}`,
      from_niche: 'testing',
      platform: 'tiktok',
    },
  ])

  // B2.2: one post on each of A's and B's calendars. Authored by the service
  // role because no policy lets a user create one — the pipeline will, and a
  // member may only *move* what is already there.
  for (const letter of ['a', 'b']) {
    const post = await restInsert<Row>(serviceRole, 'scheduled_posts', [
      {
        workspace_id: workspace(letter),
        platform: 'instagram',
        title: `post ${runId}`,
        scheduled_date: '2026-11-17',
        scheduled_time24: '09:00',
      },
    ])
    if (!post.ok) {
      throw new Error(
        `could not seed a scheduled post for ${letter}: ${post.errorMessage ?? post.status}`,
      )
    }
    scheduledPostIds.set(letter, post.rows[0]?.id ?? '')
  }
}, 60_000)

afterAll(async () => {
  // Tolerant on purpose: the deletion test removes workspace D and user D, so
  // some of this is already gone, and a teardown that threw would turn a
  // passing suite red.
  for (const workspaceId of workspaceIds.values()) {
    await fetch(`${url}/rest/v1/workspaces?id=eq.${workspaceId}`, {
      method: 'DELETE',
      headers: { apikey: serviceRole.apiKey },
    }).catch(() => null)
  }

  for (const created of users.values()) {
    await adminDeleteUser(url, serviceRole.apiKey, created.id).catch(() => null)
  }
}, 60_000)

describe('workspace A cannot read workspace B', () => {
  test('A sees its own workspace and only its own', async () => {
    // Act
    const response = await restSelect<Row>(asUser(user('a').token), 'workspaces?select=id')

    // Assert
    const ids = response.rows.map((row) => row.id)
    expect(ids).toContain(workspace('a'))
    expect(ids).not.toContain(workspace('b'))
    expect(ids).not.toContain(workspace('d'))
  })

  test("asking for B's workspace by id returns nothing rather than an error", async () => {
    // Arrange — the id is known, which is the realistic case: RLS has to make
    // a known id useless, not merely unguessable.
    const path = `workspaces?id=eq.${workspace('b')}&select=id`

    // Act
    const response = await restSelect(asUser(user('a').token), path)

    // Assert
    expect(response.status).toBe(200)
    expect(response.rows).toHaveLength(0)
  })

  test("A cannot read B's goals", async () => {
    // Act
    const all = await restSelect<{ workspace_id: string }>(
      asUser(user('a').token),
      'goals?select=id,workspace_id',
    )
    const targeted = await restSelect(
      asUser(user('a').token),
      `goals?workspace_id=eq.${workspace('b')}&select=id`,
    )

    // Assert
    expect(targeted.rows).toHaveLength(0)
    expect(all.rows.every((row) => row.workspace_id !== workspace('b'))).toBe(true)
  })

  test("A cannot rename B's workspace", async () => {
    // Act
    const response = await restUpdate(asUser(user('a').token), `workspaces?id=eq.${workspace('b')}`, {
      name: 'renamed by A',
    })

    // Assert — a hidden row is not an error; it is an update that changed
    // nothing, which is why the representation is what gets counted.
    expect(response.rows).toHaveLength(0)

    const check = await restSelect<{ name: string }>(
      serviceRole,
      `workspaces?id=eq.${workspace('b')}&select=name`,
    )
    expect(check.rows[0]?.name).toBe(`RLS B ${runId}`)
  })

  test("A cannot add itself to B's workspace", async () => {
    // Arrange — one insert is the whole access model, if it is allowed.
    const rows = [{ workspace_id: workspace('b'), user_id: user('a').id, role: 'member' }]

    // Act
    const response = await restInsert(asUser(user('a').token), 'memberships', rows)

    // Assert
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test("A cannot read B's membership rows", async () => {
    // Act
    const response = await restSelect(
      asUser(user('a').token),
      `memberships?workspace_id=eq.${workspace('b')}&select=id`,
    )

    // Assert
    expect(response.rows).toHaveLength(0)
  })
})

describe('anonymous reads nothing', () => {
  const tables = [
    'workspaces',
    'memberships',
    'profiles',
    'goals',
    'objectives',
    'key_results',
    'social_accounts',
    'metric_snapshots',
    'ledger_weekly',
    'alerts',
    'trends',
    'leads',
    'kpi_definitions',
  ] as const

  test.each(tables)('an anonymous reader gets no rows from %s', async (table) => {
    // Act
    const response = await restSelect(anonymous, `${table}?select=*&limit=5`)

    // Assert — either refused outright or allowed and empty. Both are "reads
    // nothing"; what must never happen is a row coming back.
    expect(response.rows).toHaveLength(0)
  })

  test('the anon key is accepted, so an empty result is RLS and not a rejection', async () => {
    // Arrange — "reads nothing" passes just as well when the key is refused,
    // and those are very different facts. A 200 means PostgREST accepted the
    // publishable key, resolved the `anon` role, and **the policies are what
    // emptied the result**. Without this assertion a broken credential would
    // look like working security.
    const response = await restSelect(anonymous, 'workspaces?select=id&limit=5')

    // Assert
    expect(response.status).toBe(200)
    expect(response.errorCode).toBeNull()
    expect(response.rows).toHaveLength(0)
  })

  test('an anonymous reader cannot insert a workspace', async () => {
    // Act
    const response = await restInsert(anonymous, 'workspaces', [{ name: `anon ${runId}` }])

    // Assert
    expect(response.ok).toBe(false)
  })
})

describe('the service role reads everything', () => {
  test('all three workspaces are visible to the service role', async () => {
    // Act
    const response = await restSelect<Row>(serviceRole, 'workspaces?select=id')

    // Assert — "ours are there", because the shared preview database may hold
    // another run's rows (D76).
    const ids = response.rows.map((row) => row.id)
    expect(ids).toContain(workspace('a'))
    expect(ids).toContain(workspace('b'))
    expect(ids).toContain(workspace('d'))
  })

  test('the service role reads leads, which no browser may touch', async () => {
    // Act
    const response = await restSelect(serviceRole, 'leads?select=id&limit=1')

    // Assert
    expect(response.status).toBe(200)
  })
})

describe('shared reference data', () => {
  test('a signed-in user reads the seeded KPI definitions', async () => {
    // Act
    const response = await restSelect(asUser(user('a').token), 'kpi_definitions?select=key')

    // Assert — §1: readable by any authenticated user. Zero here means
    // supabase/seed.sql was never applied, which is worth failing on.
    expect(response.rows.length).toBeGreaterThan(0)
  })

  test('a signed-in user cannot write a KPI definition', async () => {
    // Act
    const response = await restInsert(asUser(user('a').token), 'kpi_definitions', [
      {
        key: `made_up_${runId}`,
        name: 'Made up',
        unit: 'count',
        formula: 'none',
        source: 'none',
        tier: 'growth',
      },
    ])

    // Assert
    expect(response.ok).toBe(false)
  })
})

describe('a member authors the goal cascade, and nothing else', () => {
  test('C, a member of B, can add an objective to B’s goal', async () => {
    // Arrange
    const goals = await restSelect<Row>(
      asUser(user('c').token),
      `goals?workspace_id=eq.${workspace('b')}&select=id`,
    )
    expect(goals.rows).toHaveLength(1)

    // Act
    const response = await restInsert(asUser(user('c').token), 'objectives', [
      { goal_id: firstRowId(goals, "B's goal"), text: `added by C ${runId}`, position: 1 },
    ])

    // Assert
    expect(response.ok).toBe(true)
  })

  test("A cannot add an objective to B's goal", async () => {
    // Arrange — A cannot read the goal, so the id comes from the service role.
    const goals = await restSelect<Row>(
      serviceRole,
      `goals?workspace_id=eq.${workspace('b')}&select=id&limit=1`,
    )

    // Act
    const response = await restInsert(asUser(user('a').token), 'objectives', [
      { goal_id: firstRowId(goals, "B's goal"), text: `added by A ${runId}`, position: 2 },
    ])

    // Assert
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test('a member cannot write a measurement', async () => {
    // Act — 15 §8: the only honest author of a measurement is the thing that
    // took it.
    const response = await restInsert(asUser(user('b').token), 'ledger_weekly', [
      { workspace_id: workspace('b'), week: '2026-11-09', posts: 999, views: 999_999 },
    ])

    // Assert
    expect(response.ok).toBe(false)
  })
})

/**
 * B2.2 — a member may move a post and may do nothing else to it (D95).
 *
 * The column grant is the unusual part and the reason several of these exist:
 * RLS decides rows, so without `grant update (scheduled_date,
 * scheduled_time24)` the update policy would also permit a retitle or a
 * platform change. These tests are what make that claim true rather than
 * commented.
 */
describe('a member moves a post, and only moves it', () => {
  test('C, a member of B, reads B’s scheduled posts', async () => {
    // Act
    const posts = await restSelect<Row>(
      asUser(user('c').token),
      `scheduled_posts?workspace_id=eq.${workspace('b')}&select=id`,
    )

    // Assert
    expect(posts.ok).toBe(true)
    expect(posts.rows.map((row) => row.id)).toContain(scheduledPost('b'))
  })

  test("A cannot read B's scheduled posts", async () => {
    // Act
    const posts = await restSelect<Row>(
      asUser(user('a').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}&select=id`,
    )

    // Assert — RLS hides it, so this is an empty result and not an error.
    expect(posts.ok).toBe(true)
    expect(posts.rows).toHaveLength(0)
  })

  test('an anonymous reader sees no scheduled posts', async () => {
    // Act
    const posts = await restSelect<Row>(anonymous, 'scheduled_posts?select=id&limit=1')

    // Assert
    expect(posts.ok).toBe(true)
    expect(posts.rows).toHaveLength(0)
  })

  test('C moves B’s post, and the row comes back so the move is provable', async () => {
    // Act
    const moved = await restUpdate<Row>(
      asUser(user('c').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}`,
      { scheduled_date: '2026-11-19', scheduled_time24: '14:15' },
    )

    // Assert — one row matched. A zero-row "success" is the silent failure
    // B2.1's third inherited rule exists to catch.
    expect(moved.ok).toBe(true)
    expect(moved.rows).toHaveLength(1)
  })

  test('the move wrote exactly one audit row, naming who moved it', async () => {
    // Act
    const moves = await restSelect<{
      readonly moved_by: string | null
      readonly from_date: string
      readonly from_time24: string
      readonly to_date: string
      readonly to_time24: string
    }>(
      asUser(user('c').token),
      `post_moves?scheduled_post_id=eq.${scheduledPost('b')}` +
        '&select=moved_by,from_date,from_time24,to_date,to_time24',
    )

    // Assert — the trigger wrote it, so this is not a second write the
    // application could have forgotten.
    expect(moves.rows).toHaveLength(1)
    expect(moves.rows[0]).toMatchObject({
      moved_by: user('c').id,
      from_date: '2026-11-17',
      from_time24: '09:00',
      to_date: '2026-11-19',
      to_time24: '14:15',
    })
  })

  test("A cannot move B's post, and gets nothing rather than an error", async () => {
    // Act
    const moved = await restUpdate<Row>(
      asUser(user('a').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}`,
      { scheduled_date: '2026-12-25', scheduled_time24: '08:00' },
    )

    // Assert — zero rows is the shape the server action reads as not-found.
    expect(moved.ok).toBe(true)
    expect(moved.rows).toHaveLength(0)
  })

  test('a member cannot retitle a post — only the two schedule columns are granted', async () => {
    // Act
    const response = await restUpdate(
      asUser(user('c').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}`,
      { title: `renamed by C ${runId}` },
    )

    // Assert
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test('a member cannot move a post to another platform', async () => {
    // Act — `schedule-moves.ts`: across a row is a publishing decision, not a
    // scheduling one.
    const response = await restUpdate(
      asUser(user('c').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}`,
      { platform: 'tiktok' },
    )

    // Assert
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test('a member cannot create a scheduled post', async () => {
    // Act — there is no insert policy. The pipeline authors posts.
    const response = await restInsert(asUser(user('c').token), 'scheduled_posts', [
      {
        workspace_id: workspace('b'),
        platform: 'instagram',
        title: `invented by C ${runId}`,
        scheduled_date: '2026-11-20',
        scheduled_time24: '10:00',
      },
    ])

    // Assert
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test('a member cannot delete a scheduled post', async () => {
    // Act — no delete policy, so this matches nothing it is allowed to remove.
    const response = await restDelete<Row>(
      asUser(user('c').token),
      `scheduled_posts?id=eq.${scheduledPost('b')}`,
    )

    // Assert — and the post is still there afterwards, which is the claim that
    // actually matters.
    expect(response.rows).toHaveLength(0)

    const still = await restSelect<Row>(
      serviceRole,
      `scheduled_posts?id=eq.${scheduledPost('b')}&select=id`,
    )
    expect(still.rows).toHaveLength(1)
  })

  test('the audit is append-only: a member cannot rewrite or delete a move', async () => {
    // Arrange
    const moves = await restSelect<Row>(
      serviceRole,
      `post_moves?scheduled_post_id=eq.${scheduledPost('b')}&select=id&limit=1`,
    )
    const moveId = firstRowId(moves, "B's post move")

    // Act
    const updated = await restUpdate(asUser(user('c').token), `post_moves?id=eq.${moveId}`, {
      to_date: '2027-01-01',
    })
    const deleted = await restDelete<Row>(asUser(user('c').token), `post_moves?id=eq.${moveId}`)

    // Assert — no update or delete policy exists, so neither can touch it, and
    // the row survives both attempts.
    expect(updated.ok).toBe(false)
    expect(deleted.rows).toHaveLength(0)

    const survives = await restSelect<Row>(serviceRole, `post_moves?id=eq.${moveId}&select=id`)
    expect(survives.rows).toHaveLength(1)
  })

  test('a title change is not a move, so it writes no audit row', async () => {
    // Arrange — through the service role, which is the only thing that may
    // edit a title at all.
    const before = await restSelect<Row>(
      serviceRole,
      `post_moves?scheduled_post_id=eq.${scheduledPost('a')}&select=id`,
    )

    // Act
    const renamed = await restUpdate<Row>(
      serviceRole,
      `scheduled_posts?id=eq.${scheduledPost('a')}`,
      { title: `retitled ${runId}` },
    )

    // Assert — the trigger fires on every update and returns early unless the
    // date or the time actually changed. Otherwise the audit fills with noise
    // and stops being readable.
    expect(renamed.rows).toHaveLength(1)

    const after = await restSelect<Row>(
      serviceRole,
      `post_moves?scheduled_post_id=eq.${scheduledPost('a')}&select=id`,
    )
    expect(after.rows).toHaveLength(before.rows.length)
  })
})

/**
 * The audit D96 came out of: every table, every verb we rely on being
 * impossible.
 *
 * B2.2 found one table where an UPDATE with a grant and no policy answered
 * **200 with an empty array** — a silent success. The cause was Supabase's
 * default privileges, which every `create table` in this schema inherited, so
 * the bug could not have been specific to that table.
 *
 * **No fixtures, on purpose.** Each case filters on an id that matches nothing,
 * which is what makes the assertion sharp: Postgres checks the table privilege
 * before it looks for a row, so a refusal here is the *verb* being refused and
 * cannot be a row that happened to be hidden. Before
 * `20261119050000_grants_match_policies.sql` every one of these answered
 * `200 []`.
 */
describe('a verb we rely on being impossible refuses out loud (D96)', () => {
  const NO_SUCH_UUID = '00000000-0000-0000-0000-000000000000'

  interface RefusalCase {
    readonly table: string
    readonly verb: 'update' | 'delete'
    /** Matches nothing, so only the privilege can decide the answer. */
    readonly filter: string
    /** A real column, so the request reaches Postgres rather than failing to parse. */
    readonly patch?: Readonly<Record<string, unknown>>
  }

  // The three verbs absent here — workspaces.update, profiles.update and
  // alerts.update — each have a policy and are meant to work.
  const REFUSALS: readonly RefusalCase[] = [
    { table: 'profiles', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
    {
      table: 'memberships',
      verb: 'update',
      filter: `id=eq.${NO_SUCH_UUID}`,
      patch: { role: 'owner' },
    },
    { table: 'memberships', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
    { table: 'workspaces', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
    {
      table: 'social_accounts',
      verb: 'update',
      filter: `id=eq.${NO_SUCH_UUID}`,
      patch: { handle: `@audit_${runId}` },
    },
    { table: 'social_accounts', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
    {
      table: 'kpi_definitions',
      verb: 'update',
      filter: `key=eq.no_such_kpi_${runId}`,
      patch: { name: `audit ${runId}` },
    },
    { table: 'kpi_definitions', verb: 'delete', filter: `key=eq.no_such_kpi_${runId}` },
    { table: 'metric_snapshots', verb: 'update', filter: 'id=eq.0', patch: { value: 1 } },
    { table: 'metric_snapshots', verb: 'delete', filter: 'id=eq.0' },
    { table: 'ledger_weekly', verb: 'update', filter: 'id=eq.0', patch: { posts: 1 } },
    { table: 'ledger_weekly', verb: 'delete', filter: 'id=eq.0' },
    { table: 'alerts', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
    {
      table: 'leads',
      verb: 'update',
      filter: `id=eq.no-such-lead-${runId}`,
      patch: { niche: `audit ${runId}` },
    },
    { table: 'leads', verb: 'delete', filter: `id=eq.no-such-lead-${runId}` },
    {
      table: 'trends',
      verb: 'update',
      filter: `id=eq.${NO_SUCH_UUID}`,
      patch: { format: `audit ${runId}` },
    },
    { table: 'trends', verb: 'delete', filter: `id=eq.${NO_SUCH_UUID}` },
  ]

  test.each(REFUSALS)(
    'a signed-in user cannot $verb $table, and is told so rather than given an empty array',
    async ({ table, verb, filter, patch }) => {
      // Act
      const path = `${table}?${filter}`
      const response =
        verb === 'update'
          ? await restUpdate(asUser(user('a').token), path, patch ?? {})
          : await restDelete(asUser(user('a').token), path)

      // Assert — the grant is gone, so this never reaches a policy.
      expect(response.status).toBe(403)
      expect(response.errorCode).toBe('42501')
      expect(response.rows).toHaveLength(0)
    },
  )

  test('the same holds for anonymous, which is the role the public site holds', async () => {
    // Act — `leads` is the table the marketing site's own code is nearest to.
    const response = await restDelete(anonymous, `leads?id=eq.no-such-lead-${runId}`)

    // Assert — **401 here, 403 above, and the same refusal.** PostgREST maps
    // `42501` by whether the caller presented an identity: an anonymous request
    // gets 401, because "authenticate and try again" is the useful hint, and a
    // signed-in one gets 403, because it has authenticated and still may not.
    // The code is what the two have in common, so it is the real assertion.
    expect(response.errorCode).toBe('42501')
    expect(response.status).toBe(401)
    expect(response.rows).toHaveLength(0)
  })

  test('an owner can still rename their own workspace — the revokes did not overreach', async () => {
    // Act
    const renamed = await restUpdate<Row>(
      asUser(user('a').token),
      `workspaces?id=eq.${workspace('a')}`,
      { name: `Workspace A renamed ${runId}` },
    )

    // Assert — `workspaces_update_owner` still decides this one, by row.
    expect(renamed.ok).toBe(true)
    expect(renamed.rows).toHaveLength(1)
  })

  test('a member can still update a key result — the one direct client write', async () => {
    // Arrange — D's cascade, through the service role, to get an id to aim at.
    const keyResults = await restSelect<Row>(
      serviceRole,
      `key_results?objective_id=eq.${workspaceDChildren.objectiveId}&select=id`,
    )
    const keyResultId = firstRowId(keyResults, 'key result for the overreach check')

    // Act
    const updated = await restUpdate<Row>(
      asUser(user('d').token),
      `key_results?id=eq.${keyResultId}`,
      { target: 25 },
    )

    // Assert
    expect(updated.ok).toBe(true)
    expect(updated.rows).toHaveLength(1)
  })
})

/**
 * Last, because it destroys workspace D and user D. Vitest runs a file's tests
 * in order, so this block's fixtures are untouched by everything above.
 */
describe('deleting a workspace deletes it (D80)', () => {
  test('C, a member rather than an owner, cannot delete workspace B', async () => {
    // Act
    const response = await restRpc(asUser(user('c').token), 'delete_workspace', {
      p_workspace_id: workspace('b'),
    })

    // Assert — a refusal with a reason, not a silent no-op.
    expect(response.ok).toBe(false)
    expect(response.errorMessage ?? '').toContain('only an owner')

    const still = await restSelect(serviceRole, `workspaces?id=eq.${workspace('b')}&select=id`)
    expect(still.rows).toHaveLength(1)
  })

  test('an anonymous caller cannot delete a workspace', async () => {
    // Act
    const response = await restRpc(anonymous, 'delete_workspace', {
      p_workspace_id: workspace('b'),
    })

    // Assert
    expect(response.ok).toBe(false)
  })

  test('B, the owner, cannot delete workspace B while C is still a member', async () => {
    // `memberships.workspace_id` is `on delete cascade`, so before this rule
    // existed the owner's delete simply succeeded and **C's access vanished
    // with no notice** — their membership row went with the workspace, their
    // account survived, and nothing ever told them. Vlad's call for B1: refuse,
    // and say why.

    // Act
    const response = await restRpc(asUser(user('b').token), 'delete_workspace', {
      p_workspace_id: workspace('b'),
    })

    // Assert — a named code rather than prose matching, so the message can be
    // reworded without breaking the caller that has to recognise this case.
    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('45001')
    expect(response.errorMessage ?? '').toContain('other member')

    // Nothing was removed on the way to refusing.
    const stillThere = await restSelect(serviceRole, `workspaces?id=eq.${workspace('b')}&select=id`)
    expect(stillThere.rows).toHaveLength(1)

    const cStillMember = await restSelect(
      serviceRole,
      `memberships?workspace_id=eq.${workspace('b')}&user_id=eq.${user('c').id}&select=id`,
    )
    expect(cStillMember.rows, "C's membership was removed by a refused delete").toHaveLength(1)
  })

  test('D, the owner, deletes workspace D and every row goes with it', async () => {
    // Act
    const response = await restRpc(asUser(user('d').token), 'delete_workspace', {
      p_workspace_id: workspace('d'),
    })

    // Assert
    expect(response.ok).toBe(true)

    // The proof §8 asks for: zero rows across every table, read with the
    // service role so that RLS cannot be what makes them look absent.
    const checks: readonly { label: string; path: string }[] = [
      { label: 'workspaces', path: `workspaces?id=eq.${workspace('d')}&select=id` },
      { label: 'memberships', path: `memberships?workspace_id=eq.${workspace('d')}&select=id` },
      { label: 'goals', path: `goals?workspace_id=eq.${workspace('d')}&select=id` },
      { label: 'objectives', path: `objectives?goal_id=eq.${workspaceDChildren.goalId}&select=id` },
      {
        label: 'key_results',
        path: `key_results?objective_id=eq.${workspaceDChildren.objectiveId}&select=id`,
      },
      {
        label: 'social_accounts',
        path: `social_accounts?workspace_id=eq.${workspace('d')}&select=id`,
      },
      {
        label: 'metric_snapshots',
        path: `metric_snapshots?social_account_id=eq.${workspaceDChildren.socialAccountId}&select=id`,
      },
      { label: 'ledger_weekly', path: `ledger_weekly?workspace_id=eq.${workspace('d')}&select=id` },
      { label: 'alerts', path: `alerts?workspace_id=eq.${workspace('d')}&select=id` },
      { label: 'trends', path: `trends?workspace_id=eq.${workspace('d')}&select=id` },
    ]

    for (const check of checks) {
      const remaining = await restSelect(serviceRole, check.path)
      expect(remaining.rows, `${check.label} still has rows after deletion`).toHaveLength(0)
    }
  }, 30_000)

  test("D's auth user is gone, because that was their last workspace", async () => {
    // Act
    const exists = await adminUserExists(url, serviceRole.apiKey, user('d').id)

    // Assert — a profile with no workspace is a login into nothing.
    expect(exists).toBe(false)
  })

  test("A's account survives, because A still has a workspace", async () => {
    // Act
    const exists = await adminUserExists(url, serviceRole.apiKey, user('a').id)

    // Assert
    expect(exists).toBe(true)
  })
})

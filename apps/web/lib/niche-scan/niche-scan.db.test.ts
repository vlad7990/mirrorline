/**
 * V1 — what the Niche Scan's schema promises, proved against a real instance
 * (`20261122160000_niche_scan.sql`, BACKEND_PHASE.md §2.5, D113/D115).
 *
 * `pnpm test:rls-db`. Against the shared preview database (D76), like
 * `rls.db.test.ts` — and for the same reason §1 of the plan gives: a mocked
 * policy test proves nothing, because the thing under test *is* Postgres.
 *
 * ## Every block here fails without the migration
 *
 * D91's first lesson, kept structural. The two that matter most are not the
 * policies:
 *
 * 1. **No column can hold media.** The migration claims this in a comment, and
 *    a comment is not a constraint. This asserts it against the live column
 *    list, so the day somebody adds `thumbnail_path` the suite goes red rather
 *    than the claim going quietly stale. Non-negotiable 1 is the whole reason
 *    this project exists in its current form.
 * 2. **The url is a link, not a path.** D115 kept the url after the original
 *    migration dropped it on an over-reading of non-negotiable 1. The risk it
 *    reintroduces is not the link — it is somebody later storing a filename or
 *    a storage key in a column everyone reads as "a pointer to a public post".
 *    The check constraint is what stops that, so the check constraint is
 *    tested.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { requireAnonSupabaseConfig, requireServerSupabaseConfig } from '../supabase/env'
import {
  adminCreateUser,
  adminDeleteUser,
  restInsert,
  restSelect,
  signIn,
  type RestCredentials,
  type RestResponse,
} from '../supabase/rest'

interface Row {
  readonly id: string
}

const runId = globalThis.crypto.randomUUID().slice(0, 8)
/** Not a secret: it lives for one run against a preview database. */
const password = `scan-${globalThis.crypto.randomUUID()}`

let url = ''
let serviceRole: RestCredentials
let anonymous: RestCredentials

/** Signed-in credentials: the anon key as `apikey`, the user's token as bearer. */
function asUser(accessToken: string): RestCredentials {
  return { url, apiKey: anonymous.apiKey, accessToken }
}

interface Fixture {
  readonly userId: string
  readonly email: string
  readonly token: string
  readonly workspaceId: string
  readonly reportId: string
}

/**
 * Two workspaces, because one proves nothing about isolation.
 *
 * `mine` reads its own rows; `theirs` exists only so that "a member sees their
 * workspace's reports" cannot pass by seeing *every* report.
 */
let mine: Fixture
let theirs: Fixture

function firstRowId(response: RestResponse<Row>, label: string): string {
  if (!response.ok) {
    throw new Error(
      `could not create ${label}: HTTP ${response.status} ${response.errorMessage ?? ''}`,
    )
  }
  const row = response.rows[0]
  if (row === undefined) throw new Error(`expected one ${label} row and got none`)
  return row.id
}

async function createFixture(letter: string): Promise<Fixture> {
  const email = `scan-${runId}-${letter}@example.com`
  const created = await adminCreateUser(url, serviceRole.apiKey, email, password)
  const token = await signIn(url, anonymous.apiKey, email, password)

  const workspaceId = firstRowId(
    await restInsert<Row>(serviceRole, 'workspaces', [
      { name: `Scan ${letter} ${runId}`, niche: 'testing', plan_name: 'pilot' },
    ]),
    `workspace ${letter}`,
  )

  const membership = await restInsert(serviceRole, 'memberships', [
    { workspace_id: workspaceId, user_id: created.id, role: 'owner' },
  ])
  if (!membership.ok) {
    throw new Error(
      `could not add ${letter} to their workspace: ${membership.errorMessage ?? membership.status}`,
    )
  }

  const reportId = firstRowId(
    await restInsert<Row>(serviceRole, 'niche_reports', [
      { workspace_id: workspaceId, niche: `testing ${letter}`, status: 'complete' },
    ]),
    `niche report ${letter}`,
  )

  // One row in each of the other two tables, so the media-column check has
  // something to enumerate in every table rather than only in the one the
  // fixture happened to need. Seeded here rather than left to an earlier
  // `describe`: a test that only works when another block has already run is a
  // test that breaks the day somebody reorders the file.
  const trend = await restInsert(serviceRole, 'trends', [
    {
      workspace_id: workspaceId,
      report_id: reportId,
      format: 'seed row',
      from_niche: `testing ${letter}`,
      platform: 'instagram',
      url: 'https://example.com/p/seed',
      source_note: 'fixture, not a real source',
    },
  ])
  if (!trend.ok) {
    throw new Error(`could not seed a trend for ${letter}: ${trend.errorMessage ?? trend.status}`)
  }

  const run = await restInsert(serviceRole, 'agent_runs', [
    {
      workspace_id: workspaceId,
      agent: 'trend_scout',
      model: 'claude-sonnet-5',
      status: 'refused',
      reason: 'fixture seed, no call made',
    },
  ])
  if (!run.ok) {
    throw new Error(`could not seed an agent run for ${letter}: ${run.errorMessage ?? run.status}`)
  }

  return { userId: created.id, email, token, workspaceId, reportId }
}

beforeAll(async () => {
  const server = requireServerSupabaseConfig()
  const anon = requireAnonSupabaseConfig()

  url = server.url
  // `accessToken: null` is how `rest.ts` says "no user identity": the service
  // role and an anonymous visitor both send only an apiKey.
  serviceRole = { url: server.url, apiKey: server.serviceRoleKey, accessToken: null }
  anonymous = { url: anon.url, apiKey: anon.anonKey, accessToken: null }

  mine = await createFixture('a')
  theirs = await createFixture('b')
})

afterAll(async () => {
  // The workspace cascade takes the reports, trends and agent_runs with it, so
  // only the users need naming. Teardown runs pass or fail: D76 put every
  // preview on one database, and rows left here pile up where real work
  // happens.
  for (const fixture of [mine, theirs]) {
    if (!fixture) continue
    await fetch(`${url}/rest/v1/workspaces?id=eq.${fixture.workspaceId}`, {
      method: 'DELETE',
      headers: { apikey: serviceRole.apiKey, Authorization: `Bearer ${serviceRole.apiKey}` },
    })
    await adminDeleteUser(url, serviceRole.apiKey, fixture.userId)
  }
})

describe('no column can hold media', () => {
  /**
   * The words that would mean somebody is keeping a file.
   *
   * Deliberately broad and deliberately a denylist of *names*, not of types: a
   * `text` column called `thumbnail_url` is the realistic way this rule gets
   * broken, and no type system catches it. `url` and `source_note` are the two
   * sanctioned pointers and are excluded by exact name.
   */
  const MEDIA_WORDS = [
    'media',
    'video',
    'audio',
    'thumbnail',
    'image',
    'blob',
    'file',
    'storage',
    'object_path',
    'bucket',
    'frame',
    'clip',
  ]

  const SANCTIONED = new Set(['url', 'source_note', 'account_size_bucket'])

  test.each(['niche_reports', 'agent_runs', 'trends'])(
    '%s has no column named for a file',
    async (table) => {
      // Read a seeded row rather than information_schema, which PostgREST does
      // not expose: one row is enough to enumerate the column names.
      const response = await restSelect<Record<string, unknown>>(
        serviceRole,
        `${table}?workspace_id=eq.${mine.workspaceId}&select=*&limit=1`,
      )
      expect(response.ok, response.errorMessage ?? `HTTP ${response.status}`).toBe(true)

      const seeded = response.rows[0]
      // An empty table is a gap, not a pass — say so rather than asserting
      // nothing against no keys.
      expect(
        seeded,
        `${table} had no row to read columns from; the fixture should have seeded one`,
      ).toBeDefined()

      const offending = Object.keys(seeded ?? {}).filter(
        (column) => !SANCTIONED.has(column) && MEDIA_WORDS.some((word) => column.includes(word)),
      )

      expect(
        offending,
        `${table} gained a column named for media: ${offending.join(', ')}. ` +
          "Non-negotiable 1 forbids storing other creators' videos or audio, and " +
          '12 §1 is "links only, no media". If this is deliberate it needs a decision.',
      ).toEqual([])
    },
  )
})

describe('the url is a pointer, and the schema holds that', () => {
  const exampleUrl = 'https://www.tiktok.com/@example/video/0000000000'

  test('an https link is accepted, with the fields 12 §1 asks for', async () => {
    const response = await restInsert<Row>(serviceRole, 'trends', [
      {
        workspace_id: mine.workspaceId,
        report_id: mine.reportId,
        format: 'myth vs fact',
        from_niche: 'testing',
        platform: 'tiktok',
        url: exampleUrl,
        posted_at: '2026-11-03',
        views: 48_000,
        views_per_follower: 9.6,
        account_size_bucket: '1k_10k',
        hook_type: 'contrarian claim',
        length_seconds: 22,
        cta_type: 'dm_keyword',
        growth_velocity: 1.4,
        source_note: 'TikTok Creative Center, top ads by industry',
      },
    ])

    expect(response.ok, response.errorMessage ?? `HTTP ${response.status}`).toBe(true)
  })

  test('a storage path is refused, because that is how this column gets abused', async () => {
    const response = await restInsert(serviceRole, 'trends', [
      {
        workspace_id: mine.workspaceId,
        format: 'myth vs fact',
        from_niche: 'testing',
        platform: 'tiktok',
        url: 'uploads/workspace-a/scraped-video.mp4',
        source_note: 'should never be written',
      },
    ])

    expect(response.ok).toBe(false)
    // 23514 is a check-constraint violation. Asserting the code rather than the
    // message so a Postgres wording change does not fail the suite.
    expect(response.errorCode).toBe('23514')
  })

  test('an invented account-size bucket is refused', async () => {
    const response = await restInsert(serviceRole, 'trends', [
      {
        workspace_id: mine.workspaceId,
        format: 'three mistakes',
        from_niche: 'testing',
        platform: 'youtube',
        account_size_bucket: 'enormous',
      },
    ])

    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('23514')
  })
})

describe("a workspace reads its own research and nobody else's", () => {
  test('a member sees their own report', async () => {
    const response = await restSelect<Row>(
      asUser(mine.token),
      `niche_reports?id=eq.${mine.reportId}&select=id`,
    )

    expect(response.ok).toBe(true)
    expect(response.rows).toHaveLength(1)
  })

  test("a member cannot see a second workspace's report", async () => {
    const response = await restSelect<Row>(
      asUser(mine.token),
      `niche_reports?id=eq.${theirs.reportId}&select=id`,
    )

    // A policy filters rather than refuses, so the honest assertion is "no
    // rows", not "an error". An error here would mean something else broke.
    expect(response.ok).toBe(true)
    expect(response.rows).toHaveLength(0)
  })

  test('an anonymous visitor sees no reports at all', async () => {
    const response = await restSelect(anonymous, 'niche_reports?select=id&limit=5')

    expect(response.rows).toHaveLength(0)
  })
})

describe('the spend log is written by jobs, not by browsers', () => {
  test("a member can read their own workspace's runs", async () => {
    const seeded = await restInsert(serviceRole, 'agent_runs', [
      {
        workspace_id: mine.workspaceId,
        agent: 'trend_scout',
        model: 'claude-sonnet-5',
        status: 'refused',
        reason: 'cap reached',
      },
    ])
    expect(seeded.ok, seeded.errorMessage ?? `HTTP ${seeded.status}`).toBe(true)

    const response = await restSelect<Row>(
      asUser(mine.token),
      `agent_runs?workspace_id=eq.${mine.workspaceId}&select=id`,
    )

    expect(response.ok).toBe(true)
    // 18 §6 puts spend on the Agents screen: a cap the person paying cannot
    // see is a cap they have to trust.
    expect(response.rows.length).toBeGreaterThan(0)
  })

  test('a signed-in user cannot write a cost', async () => {
    const response = await restInsert(asUser(mine.token), 'agent_runs', [
      {
        workspace_id: mine.workspaceId,
        agent: 'trend_scout',
        model: 'claude-sonnet-5',
        status: 'ok',
        usd: 0,
      },
    ])

    expect(response.ok).toBe(false)
    // 42501 is a permission refusal: D96's revoke, not a policy filter. A
    // cost a user could type is not a measurement.
    expect(response.errorCode).toBe('42501')
  })

  test('a signed-in user cannot write research either', async () => {
    const response = await restInsert(asUser(mine.token), 'niche_reports', [
      { workspace_id: mine.workspaceId, niche: 'invented', status: 'complete' },
    ])

    expect(response.ok).toBe(false)
    expect(response.errorCode).toBe('42501')
  })

  test('a refused run costs nothing and is still a row', async () => {
    const response = await restSelect<{ status: string; usd: string }>(
      serviceRole,
      `agent_runs?workspace_id=eq.${mine.workspaceId}&status=eq.refused&select=status,usd`,
    )

    expect(response.ok).toBe(true)
    expect(response.rows.length).toBeGreaterThan(0)
    // A cap that works must not look like a feature nobody used.
    for (const row of response.rows) {
      expect(Number(row.usd)).toBe(0)
    }
  })
})

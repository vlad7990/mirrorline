/**
 * The scan eval — five fixed cases against the real model (D134). `pnpm eval:scan`.
 *
 * ============================================================================
 * Why this exists
 * ============================================================================
 *
 * **Of three live production scans, one produced a report.** Nobody found that
 * out from a test; they found it out from a client-facing report that said
 * "Nothing was saved." The hermetic suite proves the parser, the schema and the
 * budgets, and it cannot prove the only thing that was actually broken: whether
 * a real research run, on a real niche, with a real profile, ends in a report.
 *
 * So this is the regression guard Vlad asked for, and the rule that comes with
 * it: **run it before merging any change to the scan or the script agents, and
 * record the result in the pull request.** A change to `research.ts`,
 * `write-leg.ts`, `notes.ts`, `scan.ts`, `first-videos.ts`, `fact-check.ts` or
 * `report.ts` is a change to the thing this measures.
 *
 * ============================================================================
 * What it measures, per case
 * ============================================================================
 *
 * Success rate, wall clock, searches and **cost**, each read from the rows the
 * run actually wrote rather than from what we meant to spend. `usd` and
 * `web_searches` are the migration's column names — reading them as `cost_usd`
 * and `searches` returns *nothing* and prints a confident `$0`, which briefly
 * looked like a broken spend cap once (see `scan.live.test.ts`).
 *
 * It also records what the runs said, because a failure's shape is the
 * diagnosis: a scan that failed in research is a different bug from one that
 * researched fine and could not write the report twice.
 *
 * ============================================================================
 * It costs real money, and it says how much
 * ============================================================================
 *
 * Five scans at roughly a dollar each. It is `*.live.test.ts` so the hermetic
 * suite can never reach it, it never runs in CI, and running it is a deliberate
 * act. Every case prints its own bill and the summary prints the total.
 *
 * ============================================================================
 * Running one case three times, which is what D needs
 * ============================================================================
 *
 * D132 may only merge after **three consecutive successful preview runs of the
 * dog-trainer profile**. That is this, filtered and repeated:
 *
 *     SCAN_EVAL_CASE=dog-trainers SCAN_EVAL_REPEATS=3 pnpm eval:scan
 *
 * Each repeat is its own workspace and its own report, so three repeats are
 * three independent runs rather than one run measured three times.
 */

import { afterAll, beforeAll, expect, test } from 'vitest'

import { hasAnthropicKey } from '../agents/anthropic-client'
import { requireServerSupabaseConfig } from '../supabase/env'
import { restDelete, restInsert, restSelect, type RestCredentials } from '../supabase/rest'

import { runNicheScan } from './scan'

/**
 * The five cases.
 *
 * Fixed, so the numbers are comparable between runs — an eval whose inputs move
 * measures the inputs. They are five *shapes* rather than five dog trainers:
 *
 * 1. **dog-trainers** — tonight's real profile. The named case, and the one D132
 *    has to pass three times. Dense, visible short-video scene.
 * 2. **physio** — a licensed trade with a strict method boundary, which is the
 *    profile field most likely to make a format unusable.
 * 3. **b2b-bookkeeping** — a niche with very little public short video. Rule 11
 *    says a thin report is a finding, so a *pass* here means an honest
 *    guidance-only report rather than an empty one.
 * 4. **wedding-photography** — the opposite extreme: saturated, visual, and full
 *    of accounts coasting on raw views, which is what the views-per-follower
 *    ranking exists to resist.
 * 5. **no-profile** — the same niche as case 1 with an **empty profile**. The
 *    script agent is not called at all, so a pass is a report with no videos and
 *    the note that says why. It is here because an empty profile is what a brand
 *    new workspace has.
 */
interface EvalCase {
  readonly key: string
  readonly niche: string
  readonly brandName: string | null
  readonly serviceArea: string | null
  readonly method: string | null
  readonly avoid: readonly string[]
  readonly services: readonly { readonly name: string; readonly price: string | null }[]
  readonly handles: Readonly<Record<string, string>>
  /** Do we expect "Your first N videos" to have anything in it? */
  readonly expectsVideos: boolean
}

const CASES: readonly EvalCase[] = [
  {
    key: 'dog-trainers',
    niche: 'independent dog trainers',
    brandName: 'Maya Torres Coaching',
    serviceArea: 'Austin, Texas',
    method: 'positive reinforcement, force-free, no prong, choke or e-collars',
    avoid: ['prong collars', 'e-collars', 'dominance theory'],
    services: [
      { name: 'Private reactive-dog sessions, $150 per session', price: null },
      { name: 'Reactive Rover 6-week package, $750', price: null },
      { name: 'Puppy foundations, $90 per session', price: null },
    ],
    handles: { instagram: '@mayatorrescoaching' },
    expectsVideos: true,
  },
  {
    key: 'physio',
    niche: 'sports physiotherapists',
    brandName: 'Kerr Physio',
    serviceArea: 'Glasgow',
    method: 'graded loading and education, never passive-only treatment',
    avoid: ['dry needling', 'claims that a joint can be put back in place'],
    services: [
      { name: 'Running assessment', price: '£85' },
      { name: 'Return-to-sport block', price: '£420 for 6 sessions' },
    ],
    handles: { instagram: '@kerrphysio' },
    expectsVideos: true,
  },
  {
    key: 'b2b-bookkeeping',
    niche: 'bookkeepers for small construction firms',
    brandName: 'Ledger & Line',
    serviceArea: 'online only, UK',
    method: 'fixed monthly fee, no hourly billing',
    avoid: ['promises about tax refunds'],
    services: [{ name: 'Monthly bookkeeping', price: 'from £240 a month' }],
    handles: {},
    expectsVideos: true,
  },
  {
    key: 'wedding-photography',
    niche: 'wedding photographers',
    brandName: 'Alder & Oak Photography',
    serviceArea: 'Portland, Oregon',
    method: 'documentary, no posed group shots beyond the family set',
    avoid: ['drone footage', 'heavy presets'],
    services: [
      { name: 'Full day coverage', price: '$4,200' },
      { name: 'Elopement half day', price: '$1,800' },
    ],
    handles: { instagram: '@alderandoakphoto' },
    expectsVideos: true,
  },
  {
    key: 'no-profile',
    niche: 'independent dog trainers',
    brandName: null,
    serviceArea: null,
    method: null,
    avoid: [],
    services: [],
    handles: {},
    // No facts, so every draft would fail the fact check and the agent is not
    // called. A report with no videos and an honest note is the right outcome.
    expectsVideos: false,
  },
]

/**
 * How often the scan has to end in a report for the suite to pass.
 *
 * 0.8 — four of five. Not 1.0, because one case is deliberately a thin niche and
 * a live model occasionally has a bad run, and a guard that cries wolf gets
 * switched off. Not lower, because two failures in three is the state this whole
 * change exists to leave behind.
 *
 * **The named case is asserted separately and absolutely.** A run where
 * `dog-trainers` fails is a failed run whatever the other four did: it is the
 * profile the product was reviewed on.
 */
const MIN_SUCCESS_RATE = 0.8

/** A scan is research plus two write attempts plus the script agent. */
const CASE_TIMEOUT_MS = 16 * 60 * 1000

const SELECTED = process.env.SCAN_EVAL_CASE ?? ''
const REPEATS = Math.max(1, Number.parseInt(process.env.SCAN_EVAL_REPEATS ?? '1', 10) || 1)

const selected = SELECTED === '' ? CASES : CASES.filter((entry) => entry.key === SELECTED)

const runId = globalThis.crypto.randomUUID().slice(0, 8)

interface Row {
  readonly id: string
}

interface RunRow {
  readonly agent: string
  readonly status: string
  readonly web_searches: number | null
  readonly usd: number | string | null
  readonly reason: string | null
}

interface ReportRow {
  readonly id: string
  readonly status: string
  readonly top_formats: readonly unknown[] | null
  readonly first_videos: readonly unknown[] | null
}

interface DraftRow {
  readonly status: string
}

interface Measurement {
  readonly key: string
  readonly attempt: number
  readonly ok: boolean
  readonly outcome: string
  readonly seconds: number
  readonly searches: number
  readonly usd: number
  readonly formats: number
  readonly videos: number
  readonly withheld: number
  readonly reasons: readonly string[]
}

let serviceRole: RestCredentials
const created: string[] = []
const measurements: Measurement[] = []

beforeAll(() => {
  if (selected.length === 0) {
    throw new Error(
      `SCAN_EVAL_CASE="${SELECTED}" matches no case. Known: ${CASES.map((entry) => entry.key).join(', ')}`,
    )
  }
  if (!hasAnthropicKey(process.env)) {
    throw new Error(
      'The scan eval calls the real model and needs ANTHROPIC_API_KEY in apps/web/.env.local (or exported).',
    )
  }

  const server = requireServerSupabaseConfig()
  // `accessToken: null` is how `rest.ts` says "no user identity" — the service
  // role sends only an apiKey.
  serviceRole = { url: server.url, apiKey: server.serviceRoleKey, accessToken: null }
})

afterAll(async () => {
  // One delete per workspace; the report, its examples, its drafts and its runs
  // go with it. D76 put every preview on one project, so leaving rows behind
  // would pile them up where real work happens.
  for (const workspaceId of created) {
    await restDelete(serviceRole, `workspaces?id=eq.${workspaceId}`)
  }

  if (measurements.length === 0) return

  const passed = measurements.filter((entry) => entry.ok)
  const rate = passed.length / measurements.length
  const totalUsd = measurements.reduce((sum, entry) => sum + entry.usd, 0)
  const totalSeconds = measurements.reduce((sum, entry) => sum + entry.seconds, 0)

  const rows = measurements
    .map(
      (entry) =>
        `  ${entry.ok ? 'PASS' : 'FAIL'}  ${entry.key}#${entry.attempt}  ` +
        `${entry.seconds}s  ${entry.searches} search(es)  $${entry.usd.toFixed(3)}  ` +
        `formats=${entry.formats} videos=${entry.videos} withheld=${entry.withheld}` +
        (entry.ok ? '' : `\n        why: ${entry.outcome}`) +
        (entry.reasons.length > 0 ? `\n        runs: ${entry.reasons.join(' | ')}` : ''),
    )
    .join('\n')

  console.log(
    `\n[scan-eval] ${passed.length}/${measurements.length} succeeded ` +
      `(${(rate * 100).toFixed(0)}%) · ${totalSeconds}s total · $${totalUsd.toFixed(2)} total\n${rows}\n`,
  )
})

async function measure(entry: EvalCase, attempt: number): Promise<Measurement> {
  const workspace = await restInsert<Row>(serviceRole, 'workspaces', [
    { name: `Scan eval ${entry.key} ${runId}#${attempt}`, niche: entry.niche, plan_name: 'pilot' },
  ])
  const workspaceId = workspace.rows[0]?.id
  if (!workspace.ok || workspaceId === undefined) {
    throw new Error(
      `could not create the workspace for ${entry.key}: HTTP ${workspace.status} ${workspace.errorMessage ?? ''}`,
    )
  }
  created.push(workspaceId)

  // The profile is what makes the fit scores and the videos about *this*
  // business. Inserted with the service role, because `client_profiles` revokes
  // insert from `authenticated` — the write is normally a definer function.
  if (entry.brandName !== null || entry.serviceArea !== null || entry.services.length > 0) {
    const profile = await restInsert(serviceRole, 'client_profiles', [
      {
        workspace_id: workspaceId,
        brand_name: entry.brandName,
        service_area: entry.serviceArea,
        method: entry.method,
        avoid: entry.avoid,
        services: entry.services,
        handles: entry.handles,
      },
    ])
    if (!profile.ok) {
      throw new Error(
        `could not write the profile for ${entry.key}: HTTP ${profile.status} ${profile.errorMessage ?? ''}`,
      )
    }
  }

  const startedAt = Date.now()
  const outcome = await runNicheScan({ workspaceId, niche: entry.niche })
  const seconds = Math.round((Date.now() - startedAt) / 1000)

  // Said out loud before any assertion: the per-leg lines are already in the
  // output above this, and this is the line that ties them to a case.
  console.log(`[scan-eval] ${entry.key}#${attempt}: ${seconds}s · ${JSON.stringify(outcome)}`)

  const runs = await restSelect<RunRow>(
    serviceRole,
    `agent_runs?workspace_id=eq.${workspaceId}&select=agent,status,web_searches,usd,reason`,
  )
  const runRows = runs.ok ? runs.rows : []

  const searches = runRows.reduce((sum, row) => sum + (row.web_searches ?? 0), 0)
  const usd = runRows.reduce((sum, row) => sum + Number(row.usd ?? 0), 0)
  const reasons = runRows.map(
    (row) => `${row.agent}:${row.status}${row.reason ? ` (${row.reason})` : ''}`,
  )

  const reports = await restSelect<ReportRow>(
    serviceRole,
    `niche_reports?workspace_id=eq.${workspaceId}&select=id,status,top_formats,first_videos`,
  )
  const report = reports.ok ? reports.rows[0] : undefined

  const drafts = await restSelect<DraftRow>(
    serviceRole,
    `drafts?workspace_id=eq.${workspaceId}&select=status`,
  )
  const withheld = (drafts.ok ? drafts.rows : []).filter(
    (row) => row.status === 'rejected' || row.status === 'blocked',
  ).length

  return {
    key: entry.key,
    attempt,
    // A pass is a report that exists and has research in it. The videos are
    // asserted per case rather than counted here, because the `no-profile` case
    // legitimately has none.
    ok: outcome.status === 'complete' && (report?.top_formats?.length ?? 0) > 0,
    outcome: outcome.status === 'complete' ? 'complete' : `${outcome.status}: ${outcome.message}`,
    seconds,
    searches,
    usd,
    formats: report?.top_formats?.length ?? 0,
    videos: report?.first_videos?.length ?? 0,
    withheld,
    reasons,
  }
}

for (const entry of selected) {
  for (let attempt = 1; attempt <= REPEATS; attempt += 1) {
    test(
      `${entry.key}#${attempt} — "${entry.niche}" ends in a report`,
      async () => {
        const measurement = await measure(entry, attempt)
        measurements.push(measurement)

        // Per-case, so a failure names the case rather than a percentage. The
        // summary in `afterAll` is what carries the rate into the PR.
        expect(measurement.outcome, `${entry.key}#${attempt} did not produce a report`).toBe(
          'complete',
        )
        expect(measurement.formats).toBeGreaterThan(0)

        if (entry.expectsVideos) {
          // §V2's output. A profile with facts should end in something to film —
          // and after D133 the fact check no longer refuses the client's own
          // prices, so an empty list here is a real regression.
          expect(measurement.videos).toBeGreaterThan(0)
        } else {
          // No facts, so the agent is never called. Zero is correct, and a
          // non-zero count would mean a script stood on a fact nobody gave us.
          expect(measurement.videos).toBe(0)
        }
      },
      CASE_TIMEOUT_MS,
    )
  }
}

test('the suite as a whole clears the success rate', () => {
  // Runs last, reading what the cases above recorded. Vitest runs tests in
  // declaration order within a file, and `fileParallelism: false` keeps it so.
  const passed = measurements.filter((entry) => entry.ok).length
  const rate = measurements.length === 0 ? 0 : passed / measurements.length

  const named = measurements.filter((entry) => entry.key === 'dog-trainers')
  if (named.length > 0) {
    // Absolute, and separate from the rate: this is the profile the product was
    // reviewed on, so a run where it fails is a failed run whatever else passed.
    expect(
      named.every((entry) => entry.ok),
      'the dog-trainers case must pass — it is the profile the review was done on',
    ).toBe(true)
  }

  expect(rate, `${passed}/${measurements.length} cases produced a report`).toBeGreaterThanOrEqual(
    MIN_SUCCESS_RATE,
  )
})

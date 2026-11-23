/**
 * The Niche Scan against the real model, end to end. `pnpm test:live`.
 *
 * Opt-in, costs money, never runs in CI — the reasons are in
 * `vitest.live.config.ts`, and they are why this file is `*.live.test.ts`
 * rather than part of the hermetic suite.
 *
 * ## Why this test exists at all
 *
 * Everything else about the scan is proved without the model. `report.test.ts`
 * proves the parser, `niche-scan.db.test.ts` proves the schema, and
 * `server-only.test.ts` proves the key has exactly one door. What none of them
 * can prove is the **shape of the request** — that `claude-sonnet-5` accepts
 * `output_config.format` alongside a `web_search_20260209` tool, that
 * `countTokens` tolerates a server tool in `tools`, that structured output and
 * web search coexist, and that what comes back actually parses.
 *
 * Those are claims about somebody else's API, and the only honest way to check
 * them is to make the call. A mocked response would assert that our mock
 * matches our code, which is the thing that was never in doubt.
 *
 * ## It writes to preview, and it cleans up
 *
 * The scan persists — that is most of what it does — so this needs a real
 * workspace to hang rows off. It makes one, uses it, and deletes it, which
 * cascades to the report, its examples and the run. D76 put every preview on
 * one project, so leaving rows behind would pile them up where real work
 * happens.
 *
 * ## The niche is a real one, on purpose
 *
 * "independent dog trainers" rather than "test niche". A scan asked to research
 * a nonsense subject returns nothing and proves nothing: the parser would drop
 * every example for want of a link and the test would pass on an empty report.
 * It also has to be a niche a reader can *judge* — the point of the first live
 * call is to find out whether the output is any good, and that is not a thing
 * an assertion can tell you. Dog training has a dense, visible short-video
 * scene (myth-busting, before-and-after, one-cue-one-clip), so a wrong answer
 * looks wrong.
 */

import { afterAll, beforeAll, expect, test } from 'vitest'

import { hasAnthropicKey } from '../agents/anthropic-client'
import { requireServerSupabaseConfig } from '../supabase/env'
import { restDelete, restInsert, restSelect, type RestCredentials } from '../supabase/rest'
import { runNicheScan, SCAN_MODEL } from './scan'

/** The niche under research. See the file header for why it is a real one. */
const NICHE = 'independent dog trainers'

/**
 * A scan is a research run: a token count, up to twelve searches, and a long
 * structured answer at `high` effort. The live config's 120s is sized for a
 * co-pilot question and is not enough for this.
 */
const SCAN_TIMEOUT_MS = 16 * 60 * 1000

const runId = globalThis.crypto.randomUUID().slice(0, 8)

let serviceRole: RestCredentials
let workspaceId = ''

interface Row {
  readonly id: string
}

beforeAll(async () => {
  if (!hasAnthropicKey(process.env)) {
    throw new Error(
      'This suite calls the real model and needs ANTHROPIC_API_KEY in apps/web/.env.local (or exported).',
    )
  }

  const server = requireServerSupabaseConfig()
  // `accessToken: null` is how `rest.ts` says "no user identity" — the service
  // role sends only an apiKey.
  serviceRole = { url: server.url, apiKey: server.serviceRoleKey, accessToken: null }

  const created = await restInsert<Row>(serviceRole, 'workspaces', [
    { name: `Live scan ${runId}`, niche: NICHE, plan_name: 'pilot' },
  ])
  if (!created.ok || created.rows[0] === undefined) {
    throw new Error(
      `could not create the workspace: HTTP ${created.status} ${created.errorMessage ?? ''}`,
    )
  }
  workspaceId = created.rows[0].id
})

afterAll(async () => {
  if (workspaceId === '') return
  // One delete; the report, its examples and the run go with it.
  await restDelete(serviceRole, `workspaces?id=eq.${workspaceId}`)
})

interface ReportRow {
  readonly id: string
  readonly niche: string
  readonly status: string
  readonly model: string | null
  readonly top_formats: readonly { readonly name: string; readonly beats: readonly string[] }[]
  readonly top_hooks: readonly string[]
  readonly topics: readonly string[]
  readonly lengths: readonly { readonly seconds: number }[]
  readonly posting_patterns: readonly string[]
  readonly sources_used: readonly string[] | null
}

interface TrendRow {
  readonly url: string
  readonly platform: string
  readonly format: string
  readonly views_per_follower: number | null
  readonly views: number | null
  readonly source_note: string
  readonly beats: readonly string[] | null
}

/**
 * The column names are the migration's, not the record's.
 *
 * `recordRun` maps `searches` → `web_searches` and the computed cost → `usd`.
 * Reading this row as `searches`/`cost_usd` returns *nothing* rather than
 * erroring — PostgREST simply does not send absent columns — and a `?? 0`
 * fallback then prints a confident `0 searches · $0` for a run that did 28
 * searches. Which it did, and which briefly looked like a broken spend cap.
 */
interface RunRow {
  readonly status: string
  readonly model: string | null
  readonly input_tokens: number | null
  readonly output_tokens: number | null
  readonly cache_read_tokens: number | null
  readonly cache_creation_tokens: number | null
  readonly web_searches: number | null
  readonly usd: number | string | null
  readonly reason: string | null
}

test(
  'a real scan researches the niche, and every example is a link with a source note',
  async () => {
    const outcome = await runNicheScan({ workspaceId, niche: NICHE })

    // Said out loud before any assertion: a refusal or a failure carries the
    // reason, and reading it is the whole point of running this by hand.
    console.log(`[scan] outcome: ${JSON.stringify(outcome)}`)

    const runs = await restSelect<RunRow>(
      serviceRole,
      `agent_runs?workspace_id=eq.${workspaceId}`,
    )
    for (const run of runs.ok ? runs.rows : []) {
      console.log(
        `[scan] run: ${run.status} · ${run.model ?? 'no model'} · ` +
          `in ${run.input_tokens ?? 0} out ${run.output_tokens ?? 0} · ` +
          `cache read ${run.cache_read_tokens ?? 0} write ${run.cache_creation_tokens ?? 0} · ` +
          `${run.web_searches ?? 0} search(es) · $${run.usd ?? 0}` +
          `${run.reason ? ` · ${run.reason}` : ''}`,
      )
    }

    // The ledger must have recorded *something*. A run that cost money and
    // logged $0 would mean the cap is guarding nothing — the one failure here
    // that is worse than the scan not working.
    const okRun = (runs.ok ? runs.rows : []).find((run) => run.status === 'ok')
    if (okRun) {
      expect(Number(okRun.usd ?? 0), 'a successful run was logged at $0').toBeGreaterThan(0)
      expect(okRun.web_searches ?? 0, 'a web-searching run logged no searches').toBeGreaterThan(0)
    }

    expect(outcome.status, `the scan did not complete: ${JSON.stringify(outcome)}`).toBe('complete')
    if (outcome.status !== 'complete') return

    // A live run must not be the sample. If this is true the key was not seen
    // and the rest of the assertions would be checking `canned.ts`.
    expect(outcome.isSample, 'a live run returned the sample report').toBe(false)

    const reports = await restSelect<ReportRow>(
      serviceRole,
      `niche_reports?id=eq.${outcome.reportId}`,
    )
    expect(reports.ok, `could not read the report: ${reports.errorMessage ?? ''}`).toBe(true)
    const report = reports.rows[0]
    expect(report, 'the report row is missing').toBeDefined()
    if (!report) return

    console.log(`[scan] report ${report.id} · ${report.status} · ${report.model}`)
    console.log(`[scan] formats: ${report.top_formats.map((f) => f.name).join(' | ')}`)
    console.log(`[scan] hooks: ${report.top_hooks.join(' | ')}`)
    console.log(`[scan] topics: ${report.topics.join(' | ')}`)
    console.log(`[scan] lengths: ${report.lengths.map((l) => `${l.seconds}s`).join(', ')}`)
    console.log(`[scan] posting: ${report.posting_patterns.join(' | ')}`)
    console.log(`[scan] sources: ${(report.sources_used ?? []).join(' | ')}`)

    expect(report.status).toBe('complete')
    expect(report.model).toBe(SCAN_MODEL)
    expect(report.niche).toBe(NICHE)

    // `12 §1` asks for three to six formats. Fewer than three is a thin read of
    // the niche rather than a parser fault, and worth failing on: a report with
    // one format is not a report.
    expect(report.top_formats.length).toBeGreaterThanOrEqual(3)
    expect(report.top_hooks.length).toBeGreaterThan(0)
    expect(report.topics.length).toBeGreaterThan(0)

    // Every format carries its beats, because the beats are what the Remake
    // Producer actually rebuilds.
    for (const format of report.top_formats) {
      expect(format.beats.length, `"${format.name}" came back with no beats`).toBeGreaterThan(0)
    }

    const trends = await restSelect<TrendRow>(
      serviceRole,
      `trends?report_id=eq.${outcome.reportId}`,
    )
    expect(trends.ok, `could not read the examples: ${trends.errorMessage ?? ''}`).toBe(true)
    expect(trends.rows.length, 'the scan saved no examples').toBeGreaterThan(0)

    for (const trend of trends.rows) {
      console.log(
        `[scan] ${trend.platform} · ${trend.format} · ` +
          `v/f ${trend.views_per_follower ?? '—'} · ${trend.url}`,
      )
    }

    // ======================================================================
    // The non-negotiables, checked against what actually landed
    // ======================================================================
    //
    // The prompt asks for these and the parser enforces them, but this is the
    // only place where the subject of the assertion is a real model's real
    // answer. A prompt is a request and a parser is a rule; this is the audit.
    for (const trend of trends.rows) {
      // Rule 1: a link to a post, never a media file.
      expect(trend.url, `not an https link: ${trend.url}`).toMatch(/^https:\/\//)
      expect(trend.url, `looks like a media file: ${trend.url}`).not.toMatch(
        /\.(mp4|mov|m4a|mp3|jpg|jpeg|png|webp|gif)(\?|#|$)/i,
      )
      // Rule 3: every example names where we looked.
      expect(trend.source_note.trim().length, `no source note on ${trend.url}`).toBeGreaterThan(0)
    }

    // ======================================================================
    // Views per follower: present and positive, or absent — never invented
    // ======================================================================
    //
    // This assertion started out as "at least one example must carry a figure",
    // and the first real run failed it with every figure absent. The test was
    // wrong, not the run: rule 5 of the system prompt says *"If you are unsure
    // of a number, omit the field. A missing value is honest; an invented one is
    // not."* The model followed it. Demanding a figure here would have been
    // demanding the one thing the prompt forbids.
    //
    // What is checkable is that nothing fabricated slipped through: where a
    // figure exists it must be a positive number. The *ordering* is
    // `rankExamples`' job and is proved in `report.test.ts` — asserting it here
    // would mean asserting the order PostgREST happened to return rows in,
    // which is not a promise it makes, and a test resting on unspecified row
    // order is a flake waiting for a slower day (D117).
    //
    // **The product consequence is logged rather than asserted:** a report whose
    // examples carry no views-per-follower figure cannot be *ranked* by one, and
    // the screen must not imply otherwise.
    const ratios = trends.rows
      .map((trend) => trend.views_per_follower)
      .filter((value): value is number => typeof value === 'number')

    console.log(
      `[scan] ${ratios.length} of ${trends.rows.length} example(s) carried a views-per-follower figure`,
    )

    for (const ratio of ratios) {
      expect(ratio, 'a views-per-follower figure was not positive').toBeGreaterThan(0)
    }
  },
  SCAN_TIMEOUT_MS,
)

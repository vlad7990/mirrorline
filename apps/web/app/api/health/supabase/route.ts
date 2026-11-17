/**
 * Does the server actually reach Supabase? B1's first step, as a route.
 *
 * `docs/plan/BACKEND_PHASE.md` §7 says the keys go in `apps/web/.env.local`
 * and the Vercel project, and that they are never printed. So the way to find
 * out whether they work is to use them and report what happened — which is
 * this handler.
 *
 * ============================================================================
 * What it will not tell you
 * ============================================================================
 *
 * No key, no token, no row content. Every credential travels in an outbound
 * request header and nothing comes back out: the response carries variable
 * names, status codes and row counts. `lib/supabase/env.ts` has a test
 * asserting its report cannot contain a key, and this route adds nothing to
 * that report.
 *
 * ============================================================================
 * Why it refuses to answer in production
 * ============================================================================
 *
 * The response says which credentials are configured. That is close to
 * harmless and it is still a free fact about our deployment, so the route is
 * 404 in a production deployment. There is no production deployment today
 * (non-negotiable 11) and this is the guard that keeps the route honest when
 * there is one.
 *
 * ============================================================================
 * The four checks, and why the anon one asserts a refusal
 * ============================================================================
 *
 * 1. **auth** — GoTrue answers. Proves the URL is a Supabase project.
 * 2. **rest:service-role** — a seeded table is readable with the service-role
 *    key. Proves the key is right *and* that the first migration is applied.
 * 3. **rest:anon** — the same table read with the anon key returns **no rows**.
 *    An anonymous reader seeing data is the failure this whole step exists to
 *    prevent, so the check passes on an empty result and fails on a populated
 *    one. §8: "Anonymous reads nothing."
 * 4. **migrations:b1** — `memberships` exists. Proves B1's migrations are
 *    applied rather than merely written, which is the thing most likely to be
 *    assumed.
 */

import { NextResponse } from 'next/server'

import { anonSupabaseConfig, describeSupabaseEnv, serverSupabaseConfig } from '@/lib/supabase/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Long enough for a cold project to wake, short enough not to hang a check. */
const TIMEOUT_MS = 8000

interface Check {
  readonly name: string
  readonly ok: boolean
  /** Status codes and counts. Never a key, a token or a row. */
  readonly detail: string
}

function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

async function getJson(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<{ status: number; body: unknown; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      // A non-JSON body is not an error here; the status is what is being
      // checked, and quoting the body risks quoting something sensitive.
      body = null
    }

    return { status: response.status, body, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown fetch failure'
    return { status: 0, body: null, error: message }
  }
}

function rowCount(body: unknown): number | null {
  return Array.isArray(body) ? body.length : null
}

async function checkAuth(url: string, apiKey: string): Promise<Check> {
  const { status, error } = await getJson(`${url}/auth/v1/health`, { apikey: apiKey })

  if (error !== null) {
    return { name: 'auth', ok: false, detail: `could not connect: ${error}` }
  }

  return {
    name: 'auth',
    ok: status === 200,
    detail: `HTTP ${status}${status === 200 ? '' : ' — GoTrue did not answer 200'}`,
  }
}

async function checkServiceRoleRead(url: string, key: string): Promise<Check> {
  const { status, body, error } = await getJson(
    `${url}/rest/v1/kpi_definitions?select=key&limit=1`,
    { apikey: key, Authorization: `Bearer ${key}` },
  )

  if (error !== null) {
    return { name: 'rest:service-role', ok: false, detail: `could not connect: ${error}` }
  }

  // 404 from PostgREST here means the table is absent, which means the
  // 13 November migration has not been applied — a different problem from a
  // bad key, and worth saying so rather than reporting "failed".
  if (status === 404) {
    return {
      name: 'rest:service-role',
      ok: false,
      detail: 'HTTP 404 — kpi_definitions is missing, so 20261113120000 is not applied',
    }
  }

  if (status !== 200) {
    return { name: 'rest:service-role', ok: false, detail: `HTTP ${status}` }
  }

  const rows = rowCount(body) ?? 0

  // Zero rows is a connected database with no seed. Not a failure of the key,
  // and saying which of the two it is saves the next person a guess.
  const seedNote = rows === 0 ? ' — connected, but supabase/seed.sql is not applied' : ''

  return { name: 'rest:service-role', ok: true, detail: `HTTP 200, ${rows} row(s)${seedNote}` }
}

async function checkAnonIsRefused(url: string, anonKey: string): Promise<Check> {
  const { status, body, error } = await getJson(
    `${url}/rest/v1/kpi_definitions?select=key&limit=1`,
    { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  )

  if (error !== null) {
    return { name: 'rest:anon', ok: false, detail: `could not connect: ${error}` }
  }

  // 401 or 403 is a pass: refused is refused. 200 with rows is the failure.
  if (status === 401 || status === 403) {
    return { name: 'rest:anon', ok: true, detail: `HTTP ${status} — refused, as it should be` }
  }

  if (status !== 200) {
    return { name: 'rest:anon', ok: false, detail: `HTTP ${status}` }
  }

  const rows = rowCount(body) ?? 0

  return {
    name: 'rest:anon',
    ok: rows === 0,
    detail:
      rows === 0
        ? 'HTTP 200, 0 rows — RLS gave an anonymous reader nothing'
        : `HTTP 200, ${rows} row(s) — AN ANONYMOUS READER CAN SEE DATA`,
  }
}

async function checkB1Migrations(url: string, key: string): Promise<Check> {
  const { status, error } = await getJson(`${url}/rest/v1/memberships?select=id&limit=1`, {
    apikey: key,
    Authorization: `Bearer ${key}`,
  })

  if (error !== null) {
    return { name: 'migrations:b1', ok: false, detail: `could not connect: ${error}` }
  }

  if (status === 404) {
    return {
      name: 'migrations:b1',
      ok: false,
      detail: 'HTTP 404 — memberships is missing, so B1 migrations are not applied',
    }
  }

  return { name: 'migrations:b1', ok: status === 200, detail: `HTTP ${status}` }
}

export async function GET(): Promise<NextResponse> {
  if (isProductionDeployment()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const env = describeSupabaseEnv()
  const server = serverSupabaseConfig()
  const anon = anonSupabaseConfig()

  // Nothing to connect with. Answer 503 rather than 500: the service is not
  // broken, it is not configured, and the body says which variable to set.
  if (server === null && anon === null) {
    return NextResponse.json(
      {
        ok: false,
        env,
        checks: [],
        next: 'Set the keys in apps/web/.env.local — docs/plan/BACKEND_PHASE.md §7.',
      },
      { status: 503 },
    )
  }

  const url = server?.url ?? anon?.url ?? ''
  const apiKeyForAuth = anon?.anonKey ?? server?.serviceRoleKey ?? ''

  const checks: Check[] = [await checkAuth(url, apiKeyForAuth)]

  if (server !== null) {
    checks.push(await checkServiceRoleRead(url, server.serviceRoleKey))
    checks.push(await checkB1Migrations(url, server.serviceRoleKey))
  }

  if (anon !== null) {
    checks.push(await checkAnonIsRefused(url, anon.anonKey))
  }

  const ok = env.isComplete && checks.every((check) => check.ok)

  return NextResponse.json({ ok, env, checks }, { status: ok ? 200 : 503 })
}

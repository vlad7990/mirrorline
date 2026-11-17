/**
 * What the app can see of Supabase, reported without ever printing a value.
 *
 * B1's first step is "verify the keys without printing them"
 * (`docs/plan/BACKEND_PHASE.md` §7). That is this module: it answers *whether*
 * each credential is present and *which variable name* supplied it, and the
 * report type it returns has no field a key could travel in.
 *
 * ============================================================================
 * Two names for the URL, because the repo already had one
 * ============================================================================
 *
 * `lib/leads/scan-store.ts` reads **`SUPABASE_URL`**. The backend plan's §7
 * asks for **`NEXT_PUBLIC_SUPABASE_URL`**, because the browser needs it too.
 * Those are different variables, and setting only the second would leave the
 * Niche Scan writing to a JSON file while every other part of the app talked
 * to the database — a split brain with no error message.
 *
 * So both names are accepted, the unprefixed one first (it is what the shipped
 * code already uses), and `source` records which one answered. **Nothing here
 * renames an existing variable**: the fix for a mismatch is to report it, which
 * `nameWarnings` does, not to quietly prefer one.
 *
 * ============================================================================
 * Why no `@supabase/supabase-js`
 * ============================================================================
 *
 * `scan-store.ts` explains it and this module follows: the dependency buys a
 * client for a handful of REST calls, and every dependency has to clear the
 * licence allow-list (non-negotiable 10). PostgREST and GoTrue are documented
 * HTTP endpoints.
 */

/** The credentials B1 needs, and the variable names each may arrive as. */
const URL_NAMES = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const
const ANON_KEY_NAMES = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'] as const
const SERVICE_ROLE_NAMES = ['SUPABASE_SERVICE_ROLE_KEY'] as const

/**
 * A credential's presence, and nothing about its content beyond a shape
 * verdict. There is deliberately no `value` field: this type is safe to log,
 * to serialise into a health response, and to put in a test failure message.
 */
export interface CredentialReport {
  /** Every variable name that could have supplied it, in precedence order. */
  readonly names: readonly string[]
  /** The name that did, or `null` when none is set. */
  readonly source: string | null
  readonly isPresent: boolean
  /**
   * Set when the variable is present but cannot be what it claims to be — a
   * URL that is not a URL, a key short enough to be a placeholder. A *reason*,
   * never the offending text.
   */
  readonly shapeProblem: string | null
}

export interface SupabaseEnvReport {
  readonly url: CredentialReport
  readonly anonKey: CredentialReport
  readonly serviceRoleKey: CredentialReport
  /** True when all three are present and none has a shape problem. */
  readonly isComplete: boolean
  /**
   * Set when a credential arrived under one name and some part of the app
   * reads the other. A warning rather than a failure: half the app works.
   */
  readonly nameWarnings: readonly string[]
}

type Env = Readonly<Record<string, string | undefined>>

/**
 * A Supabase JWT is three dot-separated segments and comfortably over a
 * hundred characters. This checks for a placeholder like `your-key-here`, not
 * for validity — only Supabase can say whether a well-formed key is the right
 * one, which is what the health check is for.
 */
const MIN_KEY_LENGTH = 40

function firstPresent(env: Env, names: readonly string[]): { source: string | null; value: string } {
  for (const name of names) {
    const raw = env[name]
    if (raw !== undefined && raw.trim().length > 0) {
      return { source: name, value: raw.trim() }
    }
  }

  return { source: null, value: '' }
}

function reportUrl(env: Env): CredentialReport {
  const { source, value } = firstPresent(env, URL_NAMES)
  if (source === null) {
    return { names: URL_NAMES, source: null, isPresent: false, shapeProblem: null }
  }

  let shapeProblem: string | null = null
  try {
    const parsed = new globalThis.URL(value)
    if (parsed.protocol !== 'https:') {
      shapeProblem = `${source} is not https`
    }
  } catch {
    shapeProblem = `${source} is not a URL`
  }

  return { names: URL_NAMES, source, isPresent: true, shapeProblem }
}

function reportKey(env: Env, names: readonly string[]): CredentialReport {
  const { source, value } = firstPresent(env, names)
  if (source === null) {
    return { names, source: null, isPresent: false, shapeProblem: null }
  }

  const shapeProblem = value.length < MIN_KEY_LENGTH ? `${source} is too short to be a key` : null

  return { names, source, isPresent: true, shapeProblem }
}

/** Describe what is configured. Safe to serialise anywhere. */
export function describeSupabaseEnv(env: Env = process.env): SupabaseEnvReport {
  const url = reportUrl(env)
  const anonKey = reportKey(env, ANON_KEY_NAMES)
  const serviceRoleKey = reportKey(env, SERVICE_ROLE_NAMES)

  const nameWarnings: string[] = []

  // The browser can only read `NEXT_PUBLIC_`-prefixed variables. A server that
  // works and a client that cannot reach the database is the confusing half of
  // this mistake, so it is named rather than left to be discovered.
  if (url.isPresent && env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
    nameWarnings.push('NEXT_PUBLIC_SUPABASE_URL is unset, so the browser cannot read the URL')
  }
  if (anonKey.isPresent && env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
    nameWarnings.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is unset, so the browser cannot read the anon key',
    )
  }
  // The reverse: `scan-store.ts` reads the unprefixed name and nothing else.
  if (url.isPresent && env.SUPABASE_URL === undefined) {
    nameWarnings.push('SUPABASE_URL is unset, so lib/leads/scan-store.ts still writes to a file')
  }

  const credentials = [url, anonKey, serviceRoleKey]
  const isComplete = credentials.every((c) => c.isPresent && c.shapeProblem === null)

  return { url, anonKey, serviceRoleKey, isComplete, nameWarnings }
}

export interface ServerSupabaseConfig {
  readonly url: string
  readonly serviceRoleKey: string
}

export interface AnonSupabaseConfig {
  readonly url: string
  readonly anonKey: string
}

/**
 * One sentence naming what to set, rather than a stack trace. The caller is a
 * route handler or a test, and both want to tell a person what to do.
 */
function missingMessage(report: SupabaseEnvReport, which: readonly CredentialReport[]): string {
  const absent = which.filter((c) => !c.isPresent).map((c) => c.names[0])
  const malformed = which.map((c) => c.shapeProblem).filter((p): p is string => p !== null)

  const parts = [
    absent.length > 0 ? `not set: ${absent.join(', ')}` : null,
    malformed.length > 0 ? malformed.join('; ') : null,
  ].filter((p): p is string => p !== null)

  const warnings = report.nameWarnings.length > 0 ? ` Also: ${report.nameWarnings.join('; ')}.` : ''

  return `Supabase is not configured — ${parts.join('; ')}. Put the keys in apps/web/.env.local; see docs/plan/BACKEND_PHASE.md §7.${warnings}`
}

/**
 * The service-role configuration, or `null` when it is not fully set.
 *
 * **Server only.** Returning the key is the point of this function, so the one
 * safeguard that matters is where it is called from: a route handler or a
 * server action, never a component that renders in a browser.
 */
export function serverSupabaseConfig(env: Env = process.env): ServerSupabaseConfig | null {
  const report = describeSupabaseEnv(env)
  if (!report.url.isPresent || report.url.shapeProblem !== null) return null
  if (!report.serviceRoleKey.isPresent || report.serviceRoleKey.shapeProblem !== null) return null

  return {
    url: firstPresent(env, URL_NAMES).value.replace(/\/$/, ''),
    serviceRoleKey: firstPresent(env, SERVICE_ROLE_NAMES).value,
  }
}

/**
 * The anon configuration, or `null`. Safe in a browser by design — RLS is what
 * protects the data, which is the whole reason the policies exist.
 */
export function anonSupabaseConfig(env: Env = process.env): AnonSupabaseConfig | null {
  const report = describeSupabaseEnv(env)
  if (!report.url.isPresent || report.url.shapeProblem !== null) return null
  if (!report.anonKey.isPresent || report.anonKey.shapeProblem !== null) return null

  return {
    url: firstPresent(env, URL_NAMES).value.replace(/\/$/, ''),
    anonKey: firstPresent(env, ANON_KEY_NAMES).value,
  }
}

/** Throws a sentence a person can act on. For routes, scripts and tests. */
export function requireServerSupabaseConfig(env: Env = process.env): ServerSupabaseConfig {
  const config = serverSupabaseConfig(env)
  if (config === null) {
    const report = describeSupabaseEnv(env)
    throw new Error(missingMessage(report, [report.url, report.serviceRoleKey]))
  }

  return config
}

export function requireAnonSupabaseConfig(env: Env = process.env): AnonSupabaseConfig {
  const config = anonSupabaseConfig(env)
  if (config === null) {
    const report = describeSupabaseEnv(env)
    throw new Error(missingMessage(report, [report.url, report.anonKey]))
  }

  return config
}

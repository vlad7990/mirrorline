/**
 * The two HTTP surfaces B1 needs from Supabase, as thin typed calls.
 *
 * `scan-store.ts` set the precedent and its reasoning holds: PostgREST and
 * GoTrue are documented, stable HTTP APIs, and `@supabase/supabase-js` buys a
 * client for a handful of calls while adding a dependency that has to clear
 * the licence allow-list (non-negotiable 10).
 *
 * ============================================================================
 * Which key goes in which call, and why it is a parameter
 * ============================================================================
 *
 * Every function here takes the credential it should use rather than reading
 * the environment. That is deliberate: the RLS tests need to make the *same*
 * request three times — once as the service role, once as a signed-in user,
 * once anonymously — and a module that picked its own credential could not
 * express that. It also means nothing in this file can reach for the
 * service-role key on its own.
 *
 * ============================================================================
 * The new key format, and the one rule that matters
 * ============================================================================
 *
 * This project uses Supabase's current API keys — `sb_publishable_…` and
 * `sb_secret_…` — not the legacy JWTs. With those:
 *
 * - **Every key goes in the `apikey` header**, the publishable one and the
 *   secret one alike.
 * - **`Authorization: Bearer` carries a user's session JWT and nothing else.**
 *   The secret key is never sent as a bearer token. The legacy format
 *   tolerated it because the key *was* a JWT; `sb_secret_…` is not, and putting
 *   it there means putting a server credential into the header that proxies,
 *   access logs and error reporters all treat as an end-user token.
 *
 * So: the service role is `apiKey: <secret>, accessToken: null`. Anonymous is
 * `apiKey: <publishable>, accessToken: null`. A signed-in user is
 * `apiKey: <publishable>, accessToken: <their JWT>` — **that pairing is what
 * makes RLS apply to them**, and passing the secret key as the apikey instead
 * would bypass every policy in the previous migration.
 */

export interface RestResponse<T = unknown> {
  readonly status: number
  readonly ok: boolean
  readonly rows: readonly T[]
  /** PostgREST's error code, e.g. `42501` for a policy refusal. */
  readonly errorCode: string | null
  readonly errorMessage: string | null
}

export interface RestCredentials {
  readonly url: string
  /** Identifies the project: the anon key for a user call, the service-role key for a server one. */
  readonly apiKey: string
  /** The identity Postgres sees: a user's access token, or the service-role key. Null for anonymous. */
  readonly accessToken: string | null
}

function headers(credentials: RestCredentials, extra: Record<string, string> = {}): HeadersInit {
  const base: Record<string, string> = {
    apikey: credentials.apiKey,
    'Content-Type': 'application/json',
    ...extra,
  }

  // No bearer at all is how both an anonymous request and a service-role
  // request are made: the `apikey` header carries the credential and PostgREST
  // takes the role from it. A bearer appears only when there is a user session
  // JWT to put in it.
  if (credentials.accessToken !== null) {
    base.Authorization = `Bearer ${credentials.accessToken}`
  }

  return base
}

/**
 * Normalise PostgREST's two reply shapes into one.
 *
 * A successful select is an array; an error is an object with `code` and
 * `message`. Collapsing them here means a caller never has to guess which it
 * got, and a refusal reads as `errorCode === '42501'` rather than as a thrown
 * exception — **a policy saying no is an expected outcome in these tests**,
 * not a failure.
 */
async function readBody<T>(response: Response): Promise<RestResponse<T>> {
  let parsed: unknown = null
  try {
    parsed = await response.json()
  } catch {
    parsed = null
  }

  if (Array.isArray(parsed)) {
    return {
      status: response.status,
      ok: response.ok,
      rows: parsed as readonly T[],
      errorCode: null,
      errorMessage: null,
    }
  }

  const asError = (parsed ?? {}) as { code?: unknown; message?: unknown }

  return {
    status: response.status,
    ok: response.ok,
    rows: [],
    errorCode: typeof asError.code === 'string' ? asError.code : null,
    errorMessage: typeof asError.message === 'string' ? asError.message : null,
  }
}

export async function restSelect<T = unknown>(
  credentials: RestCredentials,
  path: string,
): Promise<RestResponse<T>> {
  const response = await fetch(`${credentials.url}/rest/v1/${path}`, {
    headers: headers(credentials),
    cache: 'no-store',
  })

  return readBody<T>(response)
}

export async function restInsert<T = unknown>(
  credentials: RestCredentials,
  table: string,
  rows: readonly unknown[],
): Promise<RestResponse<T>> {
  const response = await fetch(`${credentials.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(credentials, { Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
    cache: 'no-store',
  })

  return readBody<T>(response)
}

/**
 * `Prefer: return=representation` matters here beyond convenience: when a
 * policy hides the row, PostgREST answers **200 with an empty array** rather
 * than an error. "Zero rows came back" is how a blocked update is detected,
 * and without the representation there would be nothing to count.
 */
export async function restUpdate<T = unknown>(
  credentials: RestCredentials,
  path: string,
  patch: Readonly<Record<string, unknown>>,
): Promise<RestResponse<T>> {
  const response = await fetch(`${credentials.url}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: headers(credentials, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
    cache: 'no-store',
  })

  return readBody<T>(response)
}

export async function restDelete<T = unknown>(
  credentials: RestCredentials,
  path: string,
): Promise<RestResponse<T>> {
  const response = await fetch(`${credentials.url}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: headers(credentials, { Prefer: 'return=representation' }),
    cache: 'no-store',
  })

  return readBody<T>(response)
}

/** Call a Postgres function. `delete_workspace` is the one B1 needs. */
export async function restRpc<T = unknown>(
  credentials: RestCredentials,
  functionName: string,
  args: Readonly<Record<string, unknown>>,
): Promise<RestResponse<T>> {
  const response = await fetch(`${credentials.url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: headers(credentials),
    body: JSON.stringify(args),
    cache: 'no-store',
  })

  return readBody<T>(response)
}

// ============================================================================
// GoTrue
// ============================================================================

export interface CreatedUser {
  readonly id: string
  readonly email: string
}

/**
 * Create a confirmed user through the admin API.
 *
 * `email_confirm: true` is the important part: it skips the confirmation mail
 * entirely. D79 leaves auth mail on Supabase's rate-limited built-in sender,
 * so a suite that signed up normally would either wait for mail it cannot read
 * or exhaust the hourly limit. **Requires the service-role key.**
 */
export async function adminCreateUser(
  url: string,
  serviceRoleKey: string,
  email: string,
  password: string,
  metadata: Readonly<Record<string, unknown>> = {},
): Promise<CreatedUser> {
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    // `apikey` only — see the header note. GoTrue's admin endpoints accept the
    // secret key there, and it must not travel as a bearer token.
    headers: { apikey: serviceRoleKey, 'Content-Type': 'application/json' },
    // `user_metadata` lands in `raw_user_meta_data`, which is what
    // `handle_new_user` reads for the profile and `ensureWorkspace` reads for
    // the carried choices. So a user made this way walks the same path a real
    // sign-up does, minus the confirmation mail.
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }),
    cache: 'no-store',
  })

  const body = (await response.json()) as { id?: unknown; msg?: unknown }

  if (!response.ok || typeof body.id !== 'string') {
    const detail = typeof body.msg === 'string' ? body.msg : `HTTP ${response.status}`
    throw new Error(`could not create the test user: ${detail}`)
  }

  return { id: body.id, email }
}

export async function adminDeleteUser(
  url: string,
  serviceRoleKey: string,
  userId: string,
): Promise<void> {
  await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey },
    cache: 'no-store',
  })
}

/**
 * Sign in and return the access token.
 *
 * The anon key, not the service-role key: this is the request a browser makes,
 * and the token it returns is the one the policies are written against.
 */
export async function signIn(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  const body = (await response.json()) as {
    access_token?: unknown
    error_description?: unknown
    msg?: unknown
  }

  if (!response.ok || typeof body.access_token !== 'string') {
    const described =
      typeof body.error_description === 'string' ? body.error_description : undefined
    const messaged = typeof body.msg === 'string' ? body.msg : undefined
    throw new Error(`could not sign in: ${described ?? messaged ?? `HTTP ${response.status}`}`)
  }

  return body.access_token
}

export interface SignUpOutcome {
  readonly status: number
  readonly userId: string | null
  /** True when the project returned a session, i.e. email confirmation is off. */
  readonly hasSession: boolean
  readonly accessToken: string | null
  readonly errorMessage: string | null
}

/**
 * The **real** sign-up endpoint, with the publishable key — the same request a
 * browser makes.
 *
 * Deliberately not the admin API: `adminCreateUser` skips confirmation and
 * therefore skips the thing worth testing. This tells us what a visitor
 * actually gets, including whether the project is set to confirm addresses,
 * which decides whether sign-up can create the workspace or the callback has
 * to.
 */
export async function authSignUp(
  url: string,
  anonKey: string,
  email: string,
  password: string,
  data: Readonly<Record<string, unknown>> = {},
): Promise<SignUpOutcome> {
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data }),
    cache: 'no-store',
  })

  const body = (await response.json()) as {
    id?: unknown
    user?: { id?: unknown } | null
    access_token?: unknown
    msg?: unknown
    error_description?: unknown
  }

  // GoTrue answers two shapes here: the user at the top level when there is no
  // session, and `{ user, access_token }` when there is.
  const topLevelId = typeof body.id === 'string' ? body.id : null
  const nestedId = typeof body.user?.id === 'string' ? body.user.id : null
  const accessToken = typeof body.access_token === 'string' ? body.access_token : null

  const described = typeof body.error_description === 'string' ? body.error_description : undefined
  const messaged = typeof body.msg === 'string' ? body.msg : undefined

  return {
    status: response.status,
    userId: topLevelId ?? nestedId,
    hasSession: accessToken !== null,
    accessToken,
    errorMessage: response.ok ? null : (described ?? messaged ?? `HTTP ${response.status}`),
  }
}

/**
 * Confirm an address without a mailbox.
 *
 * The suite cannot read email, and D79 leaves auth mail on Supabase's
 * rate-limited sender, so a test that waited for a confirmation link would
 * either hang or exhaust the hourly limit. This is the admin equivalent of
 * clicking it — used *after* the real sign-up has been exercised, so the thing
 * under test is still the real endpoint.
 */
export async function adminConfirmEmail(
  url: string,
  serviceRoleKey: string,
  userId: string,
): Promise<boolean> {
  const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { apikey: serviceRoleKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_confirm: true }),
    cache: 'no-store',
  })

  return response.ok
}

/** A sign-in that is expected to fail, reported rather than thrown. */
export async function trySignIn(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<{ status: number; ok: boolean; errorMessage: string | null }> {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  const body = (await response.json()) as { error_description?: unknown; msg?: unknown }
  const described = typeof body.error_description === 'string' ? body.error_description : undefined
  const messaged = typeof body.msg === 'string' ? body.msg : undefined

  return {
    status: response.status,
    ok: response.ok,
    errorMessage: response.ok ? null : (described ?? messaged ?? null),
  }
}

/** Does this auth user still exist? The deletion test's final question. */
export async function adminUserExists(
  url: string,
  serviceRoleKey: string,
  userId: string,
): Promise<boolean> {
  const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceRoleKey },
    cache: 'no-store',
  })

  return response.status === 200
}

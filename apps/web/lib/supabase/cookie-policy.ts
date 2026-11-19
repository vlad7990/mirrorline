/**
 * How long a session cookie lives, which is the whole of "Remember me" (D58).
 *
 * `@supabase/ssr` hands over every cookie it wants to set, with its options,
 * and we pass them to the response. That is the one place the choice can be
 * made, so it is made here rather than in three callers.
 *
 * ============================================================================
 * What "Remember me" actually changes
 * ============================================================================
 *
 * Not the session's *validity* — Supabase decides that, and the refresh token
 * is good for as long as the project says. What it changes is whether the
 * cookie **survives the browser closing**:
 *
 * - **Remembered** — the cookie keeps the `maxAge` Supabase asked for, so the
 *   session is still there tomorrow.
 * - **Not remembered** — `maxAge` and `expires` are stripped, making it a
 *   *session cookie*: the browser drops it on close. That is the right
 *   behaviour on a shared or borrowed machine, and it is what somebody is
 *   asking for when they leave the box unticked.
 *
 * **Nothing here extends anything.** A cookie policy that made a session live
 * *longer* than Supabase intended would be a security decision wearing a
 * convenience decision's clothes.
 */

/**
 * Set when the person ticked "Remember me".
 *
 * Read on every request by the proxy, because that is where session cookies
 * are rewritten on refresh — a flag held only in memory would be forgotten the
 * first time the access token rotated, and the session would quietly become
 * persistent again.
 */
export const REMEMBER_COOKIE = 'mirrorline.remember'

/** A year. The flag has to outlive the session it describes, or it cannot describe it. */
export const REMEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * The subset of cookie options this module cares about. Structural rather than
 * imported, so it fits both Next's `ResponseCookie` and whatever
 * `@supabase/ssr` passes, without this module depending on either.
 */
export interface SessionCookieOptions {
  maxAge?: number
  expires?: Date
  [key: string]: unknown
}

/**
 * Apply the policy to one cookie's options.
 *
 * Immutable: returns new options rather than deleting keys from the object
 * `@supabase/ssr` handed in, which that library still owns.
 */
export function applyRememberPolicy<T extends SessionCookieOptions>(
  options: T | undefined,
  isRemembered: boolean,
): SessionCookieOptions {
  const base: SessionCookieOptions = { ...(options ?? {}) }

  if (isRemembered) return base

  // A session cookie is one with neither lifetime set. **Both have to go**: a
  // stray `expires` would keep it on disk even with `maxAge` removed.
  //
  // Built by copying what we keep rather than destructuring away what we drop.
  // The destructuring version reads well and leaves two variables nothing ever
  // uses, which is a lint warning standing in for a fair question: why name a
  // thing you are discarding?
  const withoutLifetime: SessionCookieOptions = {}

  for (const [key, value] of Object.entries(base)) {
    if (key === 'maxAge' || key === 'expires') continue
    withoutLifetime[key] = value
  }

  return withoutLifetime
}

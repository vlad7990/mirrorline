/**
 * The Supabase client for server actions, route handlers and server
 * components — the one that knows who is signed in.
 *
 * ============================================================================
 * Why `@supabase/ssr`, after two modules deliberately avoided the SDK
 * ============================================================================
 *
 * `lib/leads/scan-store.ts` and `lib/supabase/rest.ts` both talk to PostgREST
 * over plain `fetch`, and said why: the dependency bought a client for a
 * handful of calls, and every dependency has to clear the licence allow-list.
 * **That reasoning does not survive sessions.**
 *
 * A cookie session is not a call, it is a protocol — an access token and a
 * refresh token split across cookies, rotated on expiry, written back on every
 * response, with the rotation racing between parallel requests. Getting it
 * wrong does not fail loudly: it signs people out at random, or worse, serves
 * one visitor another's session out of a CDN cache. `@supabase/ssr` is MIT,
 * maintained by Supabase, and exists for exactly this. Hand-rolling it to stay
 * dependency-free would be the expensive kind of thrift.
 *
 * It gets the **publishable** key, never the secret: RLS is the protection,
 * and the policies proved in `rls.db.test.ts` are what make that a fact rather
 * than a hope.
 *
 * ============================================================================
 * Why `setAll` is allowed to fail
 * ============================================================================
 *
 * A server component cannot set a cookie — React has begun streaming by the
 * time one would be written. `@supabase/ssr` still calls `setAll` after a
 * token refresh, so the write is attempted and the failure swallowed. That is
 * not a silent error being ignored: **`middleware.ts` refreshes the session on
 * every request and writes the cookies there**, which is the supported
 * arrangement and the reason this one can be lossy without signing anybody
 * out.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { applyRememberPolicy, REMEMBER_COOKIE } from './cookie-policy'
import { requireAnonSupabaseConfig } from './env'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = requireAnonSupabaseConfig()

  // Read once rather than per cookie: `setAll` can arrive with several at a
  // time, and the answer cannot change inside one request.
  const isRemembered = cookieStore.get(REMEMBER_COOKIE) !== undefined

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, applyRememberPolicy(options, isRemembered))
          }
        } catch {
          // A server component. See the note above: the proxy has already
          // written these, so there is nothing lost and nothing to recover.
        }
      },
    },
  })
}

/**
 * The signed-in user, or `null`.
 *
 * **`getUser()`, never `getSession()`.** `getSession` reads the cookie and
 * believes it; `getUser` asks Supabase to verify the token. On a server, where
 * the cookie arrived over the network from someone we have not authenticated
 * yet, those are different questions — and trusting the first is how a forged
 * cookie becomes an authorised request.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error !== null) return null

  return data.user
}

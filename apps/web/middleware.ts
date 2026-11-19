/**
 * The proxy: refresh the session on every request, and keep `/app/*` behind it.
 *
 * Three jobs, and the first is why this file has to exist at all.
 *
 * ============================================================================
 * 1. Refreshing the session
 * ============================================================================
 *
 * Access tokens expire. A server component cannot set a cookie, so it cannot
 * write a refreshed one — `lib/supabase/server-client.ts` explains why its
 * `setAll` is allowed to fail. **This is where the write happens.** Calling
 * `getUser()` here is what triggers the refresh, and the cookies it produces
 * are attached to the response.
 *
 * Without it, sessions would appear to work and then expire into a signed-out
 * state that no amount of reloading fixed.
 *
 * ============================================================================
 * 2. The cache headers, which are a security control rather than a nicety
 * ============================================================================
 *
 * `setAll` supplies `Cache-Control`, `Expires` and `Pragma` alongside the
 * cookies, and they have to reach the response. A page carrying a `Set-Cookie`
 * for one visitor's session, cached by a CDN, is then served to the next
 * visitor **as that person**. We deploy behind Vercel's CDN, so this is not
 * theoretical — they are copied onto every response this file returns.
 *
 * ============================================================================
 * 3. Protecting `/app/*`
 * ============================================================================
 *
 * The decisions — which paths need a session, where a refusal goes, whether a
 * `next` destination is one we will use — live in `lib/auth/redirect-rules.ts`
 * and are unit-tested there (37 tests). This file carries them out, because a
 * request, a client and a response are awkward to assert against and the rules
 * are not.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  isAuthPath,
  isProtectedPath,
  NEXT_PARAM,
  resolveNextPath,
  signInPathFor,
} from '@/lib/auth/redirect-rules'
import { applyRememberPolicy, REMEMBER_COOKIE } from '@/lib/supabase/cookie-policy'
import { anonSupabaseConfig } from '@/lib/supabase/env'

/** The headers `setAll` supplies, which must travel with the cookies. */
const CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const config = anonSupabaseConfig()

  // No credentials: nothing can say who anybody is. **Fail closed on the
  // protected paths** rather than letting them through unauthenticated — a
  // preview with no keys should look signed out, not wide open.
  if (config === null) {
    if (!isProtectedPath(request.nextUrl.pathname)) return response

    return NextResponse.redirect(
      new URL(signInPathFor(request.nextUrl.pathname, request.nextUrl.search), request.url),
    )
  }

  const isRemembered = request.cookies.get(REMEMBER_COOKIE) !== undefined

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({ request })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, applyRememberPolicy(options, isRemembered))
        }
      },
    },
  })

  // This call *is* the refresh, and also the answer to "who is this". It is
  // `getUser` rather than `getSession` for the reason in `server-client.ts`:
  // one verifies the token, the other believes the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl

  if (user === null && isProtectedPath(pathname)) {
    return redirectKeepingSession(new URL(signInPathFor(pathname, search), request.url), response)
  }

  // Signed in and looking at sign-in: send them where they were going, or to
  // the studio. `resolveNextPath` is what stops that destination being
  // somebody else's website.
  if (user !== null && isAuthPath(pathname)) {
    const next = resolveNextPath(request.nextUrl.searchParams.get(NEXT_PARAM))
    return redirectKeepingSession(new URL(next, request.url), response)
  }

  return response
}

/**
 * Redirect without throwing away the refreshed session.
 *
 * A fresh `NextResponse.redirect` carries none of the cookies `setAll` just
 * wrote, so a redirect issued on the same request that rotated a token would
 * discard the new one — and the next request would arrive holding a token that
 * had already been spent. Cookies and cache headers are copied across.
 */
function redirectKeepingSession(destination: URL, sessionResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(destination)

  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }

  for (const header of CACHE_HEADERS) {
    const value = sessionResponse.headers.get(header)
    if (value !== null) redirect.headers.set(header, value)
  }

  return redirect
}

export const config = {
  /**
   * Everything except Next's own assets, the image optimiser and static files.
   *
   * `/api/*` is deliberately **included**: a route handler acting for a
   * signed-in user needs the same refreshed session, and
   * `/api/health/supabase` is not under `/app`, so it stays reachable either
   * way.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)',
  ],
}

/**
 * Where every emailed link lands: confirmation, magic link, password reset.
 *
 * Supabase sends a one-time `code`. Exchanging it is what creates the session,
 * and that exchange has to happen somewhere able to set cookies — a route
 * handler, not a server component.
 *
 * ============================================================================
 * Why the workspace is created here too
 * ============================================================================
 *
 * With email confirmation on, `signUp` returns no session, so sign-up cannot
 * create the workspace — `app/(auth)/actions.ts` explains at length. **This is
 * the first moment a new account has a session**, so it is the moment the
 * bootstrap can run. It reads the choices out of the user's metadata, where
 * sign-up left them.
 *
 * It is safe on a reset link as well: `ensure_workspace_for_current_user` hands
 * back an existing workspace rather than making a second, so an established
 * user clicking one changes nothing.
 */

import { NextResponse, type NextRequest } from 'next/server'

import { ensureWorkspaceForCurrentUser } from '@/app/(auth)/actions'
import { NEXT_PARAM, resolveNextPath, SIGN_IN_PATH } from '@/lib/auth/redirect-rules'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * What a visitor gets when the link does not work.
 *
 * A stale or already-used link is the common case by a wide margin — people
 * open mail twice, and scanners follow links before anybody clicks them. So it
 * is a plain notice on the sign-in page rather than an error screen, and the
 * same notice whatever went wrong: the distinctions are not ones a person can
 * act on differently.
 */
const LINK_FAILED = 'that-link-did-not-work'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code')
  const next = resolveNextPath(request.nextUrl.searchParams.get(NEXT_PARAM))

  if (code === null) {
    return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?notice=${LINK_FAILED}`, request.url))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error !== null) {
    return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?notice=${LINK_FAILED}`, request.url))
  }

  // The session exists now, so this is the earliest the bootstrap can run. A
  // failure is deliberately not fatal: the person is signed in, and a
  // workspace that could not be created is something onboarding can retry.
  await ensureWorkspaceForCurrentUser()

  return NextResponse.redirect(new URL(next, request.url))
}

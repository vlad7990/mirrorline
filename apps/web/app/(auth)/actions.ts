'use server'

/**
 * The auth actions. Everything the two forms could not do before.
 *
 * ============================================================================
 * The rule every error message here follows
 * ============================================================================
 *
 * **No message tells "no such account" apart from "wrong password".** Not on
 * sign-in, not on reset, not on a magic link. A form that says "wrong
 * password" has confirmed the address is registered, and somebody with a list
 * of addresses can sort it into customers and strangers one submission at a
 * time.
 *
 * The screens were already written this way — `auth-forms.tsx` says "We could
 * not sign you in with those details", and the reset confirmation says "if an
 * account exists" — so this is the server keeping a promise the copy had
 * already made. Supabase's own `Invalid login credentials` is flattened into
 * our one sentence rather than passed through.
 *
 * ============================================================================
 * Why the onboarding choices travel in user metadata
 * ============================================================================
 *
 * Sign-up cannot always create the workspace. With email confirmation on,
 * `signUp` returns a user and **no session** — so there is nobody to create it
 * for yet, `auth.uid()` is null, and the bootstrap would refuse.
 *
 * So the choices go into the auth user's metadata at sign-up, and
 * `ensureWorkspace` runs on the first request that *does* carry a session:
 * after the confirmation link, after a magic link, or immediately when
 * confirmation is off. The RPC is `ensure_…` rather than `create_…` precisely
 * so it can run more than once without making a second workspace.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { isAccountStage, isAudience } from '@/lib/audience/account-type'
import { resolveNextPath, SIGN_IN_PATH } from '@/lib/auth/redirect-rules'
import { ONBOARDING, STUDIO_HOME } from '@/lib/routes'
import { REMEMBER_COOKIE, REMEMBER_COOKIE_MAX_AGE } from '@/lib/supabase/cookie-policy'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

import { type AuthFormState } from './auth-form-state'

/* -------------------------------------------------------------------------- */
/* Shared shapes                                                              */
/* -------------------------------------------------------------------------- */

/** The one sentence a failed sign-in gets, whichever half was wrong. */
const SIGN_IN_FAILED =
  'We could not sign you in with those details. Check the address and the password, then try again.'

const UNEXPECTED =
  'Something went wrong at our end, and it was not your details. Try again in a moment.'

const MIN_PASSWORD_LENGTH = 12

function fail(message: string): AuthFormState {
  return { status: 'error', message }
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The seven goals, guarded here rather than trusted from a form.
 *
 * `lib/audience/account-type.ts` has `isAudience` and `isAccountStage` but no
 * `isGoalKey`. The database check constraint would reject a bad value anyway —
 * with a 400 and a Postgres message, which is not an error anybody should
 * meet. Rejecting it here means an unrecognised goal is simply dropped, and
 * onboarding asks.
 */
const GOAL_KEYS = [
  'leads',
  'bookings',
  'sales',
  'audience',
  'awareness',
  'community',
  'launch',
] as const

function readGoal(formData: FormData): string | null {
  const value = field(formData, 'goal')
  return (GOAL_KEYS as readonly string[]).includes(value) ? value : null
}

/** `who` and `account` are the parameter names the public site already uses. */
function readChoices(formData: FormData): {
  audience: string | null
  stage: string | null
  goal: string | null
} {
  const audience = field(formData, 'who')
  const stage = field(formData, 'account')

  return {
    audience: isAudience(audience) ? audience : null,
    stage: isAccountStage(stage) ? stage : null,
    goal: readGoal(formData),
  }
}

/**
 * Remember me, as a cookie the proxy can read on every refresh.
 *
 * `lib/supabase/cookie-policy.ts` explains what it changes. Cleared when the
 * box is unticked, because somebody unticking it on a shared machine is making
 * a request about now, not expressing a preference for later.
 */
async function writeRememberFlag(isRemembered: boolean): Promise<void> {
  const cookieStore = await cookies()

  if (!isRemembered) {
    cookieStore.delete(REMEMBER_COOKIE)
    return
  }

  cookieStore.set(REMEMBER_COOKIE, '1', {
    maxAge: REMEMBER_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

/* -------------------------------------------------------------------------- */
/* The workspace bootstrap                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Make sure the signed-in user owns a workspace.
 *
 * Called after every successful authentication, not only after sign-up,
 * because sign-up may not have had a session to work with. Idempotent by
 * design: `ensure_workspace_for_current_user` hands back an existing workspace
 * rather than making a second.
 *
 * **A failure here does not block signing in.** The session is real and the
 * person is who they say they are; a workspace that could not be created is
 * something onboarding can retry. Bouncing them to sign-in with "something
 * went wrong" would be a lie about what failed.
 */
async function ensureWorkspace(): Promise<void> {
  const supabase = await createSupabaseServerClient()

  const { data: user } = await supabase.auth.getUser()
  if (user.user === null) return

  // RLS makes this the caller's own memberships and nobody else's.
  const existing = await supabase.from('memberships').select('workspace_id').limit(1)
  if ((existing.data?.length ?? 0) > 0) return

  const metadata = user.user.user_metadata ?? {}
  const rawName = metadata.workspace_name
  const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : null

  // No name means this user did not arrive through our sign-up form — a magic
  // link to an address that never finished signing up, say. Let onboarding ask
  // rather than inventing "My workspace".
  if (name === null) return

  await supabase.rpc('ensure_workspace_for_current_user', {
    p_name: name,
    p_audience: typeof metadata.audience === 'string' ? metadata.audience : null,
    p_stage: typeof metadata.stage === 'string' ? metadata.stage : null,
    p_goal_type: typeof metadata.goal_type === 'string' ? metadata.goal_type : null,
    p_niche: null,
  })
}

/** Exported for the callback route, which authenticates without a form. */
export async function ensureWorkspaceForCurrentUser(): Promise<void> {
  await ensureWorkspace()
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                     */
/* -------------------------------------------------------------------------- */

export async function signInWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email')
  const password = field(formData, 'password')
  const destination = resolveNextPath(field(formData, 'next') || null)

  if (email.length === 0 || password.length === 0) return fail(SIGN_IN_FAILED)

  await writeRememberFlag(formData.get('remember') !== null)

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  // Every failure is the same sentence. An unknown address, a wrong password
  // and an unconfirmed account all land here, on purpose.
  if (error !== null) return fail(SIGN_IN_FAILED)

  await ensureWorkspace()

  redirect(destination)
}

/* -------------------------------------------------------------------------- */
/* Magic link                                                                  */
/* -------------------------------------------------------------------------- */

export async function sendMagicLink(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email')
  if (email.length === 0) return fail('We need an email address to send a link to.')

  const supabase = await createSupabaseServerClient()

  await supabase.auth.signInWithOtp({
    email,
    options: {
      // Existing accounts only. A magic link that quietly created an account
      // would skip the rights confirmation non-negotiable 1 requires before
      // anybody can upload anything.
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl(resolveNextPath(field(formData, 'next') || null)),
    },
  })

  // The same answer whether or not the address has an account.
  return {
    status: 'sent',
    message:
      'If an account exists for that address, a sign-in link is on its way. The link works once and then expires.',
  }
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                     */
/* -------------------------------------------------------------------------- */

export async function signUpWithPassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email')
  const password = field(formData, 'password')
  const name = field(formData, 'name')
  const workspace = field(formData, 'workspace')
  const ownsRights = formData.get('rights') !== null

  // Non-negotiable 1: we cannot take an upload without this, so we do not take
  // an account without it either. The form blocks it too; this is the half a
  // crafted request cannot skip.
  if (!ownsRights) {
    return fail(
      'We can only work from material you own or hold the rights to, so we need this one.',
    )
  }

  if (email.length === 0 || name.length === 0 || workspace.length === 0) {
    return fail('We need your name, an email address and a workspace name.')
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`A password needs at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  const choices = readChoices(formData)
  const supabase = await createSupabaseServerClient()

  await writeRememberFlag(formData.get('remember') !== null)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read by `handle_new_user` for the profile, and by `ensureWorkspace`
      // for everything else. The header says why they travel here.
      data: {
        full_name: name,
        workspace_name: workspace,
        audience: choices.audience,
        stage: choices.stage,
        goal_type: choices.goal,
        rights_confirmed_at: new Date().toISOString(),
      },
      emailRedirectTo: callbackUrl(ONBOARDING),
    },
  })

  if (error !== null) {
    // "Already registered" is the one case worth its own sentence, and it is
    // not an enumeration leak: the person typing is the one who would already
    // know. "Something went wrong" would send them round the loop again.
    const isTaken = /already/i.test(error.message)

    return fail(
      isTaken
        ? 'There is already an account for that address. Try signing in, or reset the password.'
        : UNEXPECTED,
    )
  }

  // Confirmation is on: a user exists but no session does, so the workspace
  // cannot be created yet and the callback will do it.
  if (data.session === null) {
    return {
      status: 'check-email',
      message:
        'Check your email for a link to confirm the address. The link expires, so if it has been a while, sign up again.',
    }
  }

  await ensureWorkspace()

  redirect(ONBOARDING)
}

/* -------------------------------------------------------------------------- */
/* Sign out                                                                    */
/* -------------------------------------------------------------------------- */

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  // The preference goes with the session. Leaving it set would make the *next*
  // person's session on this machine persistent because of a box this one
  // ticked.
  const cookieStore = await cookies()
  cookieStore.delete(REMEMBER_COOKIE)

  redirect(SIGN_IN_PATH)
}

/* -------------------------------------------------------------------------- */
/* Password reset                                                              */
/* -------------------------------------------------------------------------- */

export async function requestPasswordReset(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email')
  if (email.length === 0) return fail('We need an email address to send a link to.')

  const supabase = await createSupabaseServerClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/reset-password'),
  })

  // Deliberately identical whatever was typed. The screen already promised
  // this: "confirming which addresses are registered would be a way to find
  // out, one guess at a time."
  return {
    status: 'sent',
    message:
      'If an account exists for that address, a reset link is on its way. We say it that way round on purpose: confirming which addresses are registered would be a way to find out, one guess at a time.',
  }
}

export async function updatePassword(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = field(formData, 'password')

  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`A password needs at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  const supabase = await createSupabaseServerClient()

  // The reset link put a session in place when the callback exchanged its
  // code. No session means the link was stale or already used — a different
  // problem from a bad password, and it gets its own sentence.
  const { data: user } = await supabase.auth.getUser()
  if (user.user === null) {
    return fail('That reset link has expired or been used already. Ask for a new one.')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error !== null) return fail(UNEXPECTED)

  await ensureWorkspace()

  redirect(STUDIO_HOME)
}

/* -------------------------------------------------------------------------- */
/* Where the emailed links come back to                                        */
/* -------------------------------------------------------------------------- */

/**
 * The absolute URL Supabase sends people back to.
 *
 * It has to be absolute — it goes in an email — and it has to be *our* origin.
 * `NEXT_PUBLIC_SITE_URL` when set, then Vercel's `VERCEL_URL` so each preview
 * links back to itself rather than somewhere shared, then localhost.
 *
 * **`next` is validated by `resolveNextPath` before it reaches here**, so the
 * one attacker-influenced part of this string is already known to be an
 * internal path.
 */
function callbackUrl(next: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  const vercel = process.env.VERCEL_URL

  const origin =
    configured !== undefined && configured.length > 0
      ? configured
      : vercel !== undefined && vercel.length > 0
        ? `https://${vercel}`
        : 'http://localhost:3000'

  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`
}

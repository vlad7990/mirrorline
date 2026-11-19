/**
 * The absolute URL an emailed link comes back to (D101).
 *
 * ============================================================================
 * Why this moved out of `actions.ts`, and what it fixes
 * ============================================================================
 *
 * It was four lines inside the auth actions, reading `process.env` directly —
 * so it could not be tested, and it was wrong in the one environment nobody
 * can try by hand: **production**.
 *
 * The old order was `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`, then localhost.
 * `NEXT_PUBLIC_SITE_URL` is not set on this project, and **`VERCEL_URL` is the
 * per-deployment hostname** — `mirrorline-a1b2c3d4.vercel.app`, a new one every
 * push — not the alias people actually visit. So a confirmation email asked
 * Supabase to send the person to a host that is not in the project's redirect
 * allow-list, Supabase refused it and fell back to the **Site URL**, and the
 * person landed on the marketing home page instead of onboarding.
 *
 * Nothing looked broken locally or on a preview, because there `VERCEL_URL`
 * *is* the host being visited. That is why it survived: the bug needed the one
 * environment where the deployment URL and the public URL differ.
 *
 * ============================================================================
 * The order, and why `VERCEL_ENV` decides rather than a plain cascade
 * ============================================================================
 *
 * 1. `NEXT_PUBLIC_SITE_URL` — an explicit answer always wins. The escape hatch
 *    for a custom domain, and the one thing to set when this is wrong again.
 * 2. On **production**, `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's name for the
 *    project's stable production domain, which is what the allow-list holds.
 * 3. Otherwise `VERCEL_URL` — per-deployment, and on a preview that is exactly
 *    right: a preview's link should come back to the preview that sent it.
 * 4. `http://localhost:3000`.
 *
 * Step 2 is gated on `VERCEL_ENV === 'production'` rather than merely trying
 * `VERCEL_PROJECT_PRODUCTION_URL` first, because that variable is set on
 * *preview* deployments too — it names the production domain wherever it is
 * read. Preferring it unconditionally would send every preview's confirmation
 * link to production, which is a worse bug than the one this fixes: it is
 * invisible, and it moves people between databases.
 */

import { ONBOARDING, STUDIO_HOME } from '@/lib/routes'

/**
 * An environment to read, so a test can supply one without touching the
 * process. The same shape as `copilot/spend.ts`'s `EnvLike`, and for the same
 * reason — a record rather than an interface of optional keys, because
 * `process.env` is not assignable to a type whose keys are all optional.
 *
 * The four it looks at: `NEXT_PUBLIC_SITE_URL`, `VERCEL_ENV`,
 * `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`.
 */
export type SiteEnv = Readonly<Record<string, string | undefined>>

const LOCAL_ORIGIN = 'http://localhost:3000'

/** Where the callback lives. One constant, because three senders have to agree on it. */
export const CALLBACK_PATH = '/auth/callback'

/**
 * Where each kind of emailed link lands once the session exists.
 *
 * Named rather than written at each call site: "confirm your address" and
 * "reset your password" end in different places for different reasons, and a
 * literal at each sender is how two of the three quietly drift onto the same
 * one.
 */
export const CALLBACK_DESTINATIONS = {
  /** A new account has nothing yet, so it goes straight to the wizard. */
  signUp: ONBOARDING,
  /** An established account is signing in; the studio home is the front door. */
  magicLink: STUDIO_HOME,
  /** The only screen that can take a new password, and it needs the session first. */
  passwordReset: '/reset-password',
} as const

function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function siteOrigin(env: SiteEnv): string {
  const configured = nonEmpty(env.NEXT_PUBLIC_SITE_URL)
  if (configured !== null) return configured

  if (env.VERCEL_ENV === 'production') {
    const production = nonEmpty(env.VERCEL_PROJECT_PRODUCTION_URL)
    if (production !== null) return `https://${production}`
  }

  const deployment = nonEmpty(env.VERCEL_URL)
  if (deployment !== null) return `https://${deployment}`

  return LOCAL_ORIGIN
}

/**
 * The absolute callback URL, carrying where to go afterwards.
 *
 * `next` is encoded rather than interpolated, and the callback validates it
 * again on the way back in (`resolveNextPath`): this side decides *our*
 * destination, and that side refuses anybody else's.
 */
export function callbackUrl(next: string, env: SiteEnv): string {
  return `${siteOrigin(env)}${CALLBACK_PATH}?next=${encodeURIComponent(next)}`
}

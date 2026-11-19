/**
 * Who may see which path, and where a refusal sends them.
 *
 * Pure string functions, deliberately separate from `middleware.ts`. The proxy
 * needs a request, a Supabase client and a response to do its job, which makes
 * it awkward to test; **these are the decisions it makes**, and they are the
 * part worth asserting. `redirect-rules.test.ts` covers them without a server.
 */

import { STUDIO_HOME } from '@/lib/routes'

/** Everything under here needs a session. */
export const PROTECTED_PREFIX = '/app'

/** Where a signed-out visitor is sent, and what a signed-in one is sent away from. */
export const SIGN_IN_PATH = '/sign-in'
export const SIGN_UP_PATH = '/sign-up'

/** The parameter carrying where they were going. Short, because it shows in the address bar. */
export const NEXT_PARAM = 'next'

export function isProtectedPath(pathname: string): boolean {
  return pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`)
}

/** `/sign-in` and `/sign-up`: somebody already signed in has no use for either. */
export function isAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname === SIGN_UP_PATH
}

/**
 * Is this a path we are willing to send somebody to after signing in?
 *
 * **This is an open-redirect guard, and it is why this module exists.** "Back
 * to the page they came from" means taking a destination out of the URL, and
 * that URL is attacker-controlled: a link to
 * `/sign-in?next=https://evil.example/login` which lands on a convincing fake
 * after a *real* sign-in is the oldest trick in the book.
 *
 * So the rule is an allow-list, not a block-list:
 *
 * - must begin with exactly one `/` — `//evil.example` is protocol-relative,
 *   and a browser reads it as another origin;
 * - no backslashes, because some browsers normalise `\` to `/`, which has made
 *   `/\evil.example` an escape before;
 * - no `:`, which rules out every scheme;
 * - no control characters or spaces, which can truncate or smuggle.
 *
 * Anything else falls back to the studio home rather than being repaired. **A
 * destination we had to fix is a destination we did not understand.**
 */
export function isSafeNextPath(raw: string | null | undefined): raw is string {
  if (typeof raw !== 'string' || raw.length === 0) return false
  if (!raw.startsWith('/')) return false
  if (raw.startsWith('//')) return false
  if (raw.includes('\\')) return false
  if (raw.includes(':')) return false
  if (/[\u0000-\u0020\u007f]/.test(raw)) return false

  return true
}

/** The safe destination, or the studio home. Never throws, never returns an external URL. */
export function resolveNextPath(raw: string | null | undefined): string {
  return isSafeNextPath(raw) ? raw : STUDIO_HOME
}

/**
 * The sign-in URL that remembers where somebody was going.
 *
 * `search` is included so a deep link keeps its parameters across the round
 * trip — being returned to a filtered view without its filter is the kind of
 * almost-right that reads as broken.
 */
export function signInPathFor(pathname: string, search = ''): string {
  const destination = `${pathname}${search}`

  // Nothing worth remembering: sign-in already lands on the studio home, so a
  // `next` pointing there is noise in the address bar.
  if (!isSafeNextPath(destination) || destination === STUDIO_HOME) {
    return SIGN_IN_PATH
  }

  return `${SIGN_IN_PATH}?${NEXT_PARAM}=${encodeURIComponent(destination)}`
}

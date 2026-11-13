/**
 * The Niche Scan request: what we collect, and how it is checked (14 §3,
 * "Lead magnet").
 *
 * **Three things this deliberately does not do.**
 *
 * 1. *It sends no email.* CLAUDE.md non-negotiable 11 and the master prompt
 *    both say so. The n8n webhook is a stub, called only when a URL is
 *    configured, and nothing in this repo configures one.
 * 2. *It does not require Supabase.* The store is an adapter: Supabase when
 *    the keys exist in the environment, a git-ignored JSON file otherwise.
 *    A prototype that cannot take a lead without a database is a prototype
 *    nobody can demo.
 * 3. *It does not trust the request body.* Every field is validated here,
 *    server-side, whatever the form did first.
 *
 * No React and no Next imports: this is read by the route handler, by the
 * tests, and by anything that later needs the same shape.
 */

// A relative import, not the `@/` alias: Vitest resolves this module
// directly and does not carry Next's path aliases, so `@/lib/...` here is a
// unit test that cannot load the thing it tests.
import {
  type AccountStage,
  type Audience,
  GOALS,
  type GoalKey,
  isAccountStage,
  isAudience,
} from '../audience/account-type'

/** Loose on purpose: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_SHORT = 200
const MAX_NICHE = 400
/** Three, per 12 §1 and 14 §3. More is a research job, not a free scan. */
export const MAX_HANDLES = 3

export interface NicheScanRequest {
  readonly email: string
  /** Free text, in the user's own words. Never a dropdown — 16 §1. */
  readonly niche: string
  readonly audience: Audience
  readonly stage: AccountStage
  readonly goal: GoalKey
  /** Up to three accounts they admire. Optional. */
  readonly handles: readonly string[]
}

export interface StoredNicheScanLead extends NicheScanRequest {
  readonly id: string
  /** ISO-8601 UTC, e.g. '2026-11-13T09:00:00.000Z'. */
  readonly receivedAt: string
}

export type Validation =
  | { readonly ok: true; readonly lead: NicheScanRequest }
  | { readonly ok: false; readonly error: string }

function readString(source: Record<string, unknown>, key: string, max: number): string | null {
  const value = source[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > max) return null
  return trimmed
}

function isGoalKey(value: unknown): value is GoalKey {
  return GOALS.some((goal) => goal.key === value)
}

/**
 * Handles are normalised rather than rejected.
 *
 * People paste "@name", "name", or a whole profile URL, and refusing any of
 * them teaches nothing — the field means "an account you admire" in all three
 * cases. Anything unrecognisable is dropped rather than failing the whole
 * submission, because a malformed third handle should not cost someone their
 * scan.
 */
export function normaliseHandles(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.length <= MAX_SHORT)
    .map((entry) => {
      const withoutUrl = entry.replace(/^https?:\/\/[^/]+\//i, '').replace(/\/+$/, '')
      const withoutAt = withoutUrl.replace(/^@+/, '')
      return withoutAt.length > 0 ? `@${withoutAt}` : ''
    })
    .filter((entry) => entry.length > 1)
    .slice(0, MAX_HANDLES)
}

/** Server-side validation. The form's own checks are a courtesy, not a gate. */
export function validateNicheScanRequest(body: unknown): Validation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'We could not read that request.' }
  }

  const source = body as Record<string, unknown>

  const email = readString(source, 'email', MAX_SHORT)
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Please give us an email address we can send the scan to.' }
  }

  const niche = readString(source, 'niche', MAX_NICHE)
  if (!niche) {
    return { ok: false, error: 'Tell us what you do, in your own words.' }
  }

  const { audience, stage, goal } = source
  if (!isAudience(audience) || !isAccountStage(stage)) {
    return { ok: false, error: 'Choose whether you are a business or an individual.' }
  }
  if (!isGoalKey(goal)) {
    return { ok: false, error: 'Choose the goal you want the scan aimed at.' }
  }

  return {
    ok: true,
    lead: { email, niche, audience, stage, goal, handles: normaliseHandles(source.handles) },
  }
}

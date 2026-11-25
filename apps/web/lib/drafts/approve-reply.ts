/**
 * Reading what `approve_draft` answered (V3, D129).
 *
 * ============================================================================
 * Why this is not in the action beside it
 * ============================================================================
 *
 * A `'use server'` module may only export async functions — Next enforces it at
 * build time, because every export becomes a callable server endpoint. So a
 * synchronous parser cannot live in `draft-actions.ts`, and would otherwise be
 * either unexported and untested, or exported and a build failure.
 *
 * Which is a happy accident, because the parsing is the part worth testing on
 * its own. The RPC's reply is jsonb, which means it arrives as `unknown`, and
 * the only rule that really matters is the direction of every fallback —
 * **towards refusal**. A reply nobody can read must never become an approval.
 */

const APPROVE_FAILED =
  'We could not record that approval just now. The draft is still waiting for you.'

const NOT_FOUND = 'That draft could not be found.'

export type ApproveDraftResult =
  | { readonly status: 'approved' }
  /** The gate, or a decision already made. `reason` is the sentence to show. */
  | { readonly status: 'refused'; readonly reason: string }
  | { readonly status: 'error'; readonly message: string }

export const APPROVE_ERROR_MESSAGE = APPROVE_FAILED

export const DRAFT_NOT_FOUND_MESSAGE = NOT_FOUND

/**
 * `{ ok, status, reason }` as the function builds it, checked rather than cast.
 *
 * `ok === true` is the only shape that approves anything — not truthy, not
 * `'true'`, not merely present. Everything else is a refusal or an error, and
 * the two are kept apart because a refusal is the gate working (`18 §6`) and an
 * error is ours.
 */
export function readApproveReply(value: unknown): ApproveDraftResult {
  if (typeof value !== 'object' || value === null) {
    return { status: 'error', message: APPROVE_FAILED }
  }

  const row = value as Record<string, unknown>

  if (row.ok === true) return { status: 'approved' }

  // Not `ok` and carrying no sentence is still a refusal. The direction of the
  // fallback matters more than its wording.
  const reason = typeof row.reason === 'string' && row.reason !== '' ? row.reason : NOT_FOUND

  return { status: 'refused', reason }
}

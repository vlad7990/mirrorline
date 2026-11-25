/**
 * A judged draft, as the studio reads it (V3, D129).
 *
 * No `server-only`: `DraftStatus` has to cross into a `'use client'` panel so
 * the screen can decide what to render, and a type is erased at compile time.
 * The service-role write lives in `write-drafts.ts` next door, which does
 * import it — the same split, for the same reason, as `jobs/types.ts`.
 *
 * ============================================================================
 * Why there is a second "can this be approved" function
 * ============================================================================
 *
 * `originality/gate.ts` already exports `isApprovable`, and it answers a
 * narrower question: *does this verdict permit approval*. A draft can carry a
 * passing verdict and still not be approvable, because somebody already decided
 * about it. So `isApprovableDraft` is the conjunction, and the gate's function
 * stays the single definition of the gate's half.
 *
 * **Neither is the enforcement.** Both are for drawing a screen. The rule lives
 * in `drafts_approved_passed`, a check constraint that binds every role —
 * `04 §Originality Gate` forbids an override "from anywhere", and a TypeScript
 * function is an override to anybody who writes a second one.
 */

import { parseVerdict, type OriginalityVerdict } from '../originality/gate'

/**
 * Where a draft has got to.
 *
 * `needs-review` is waiting. `approved` is a decision a person made and the
 * database allowed. `rejected` is a draft sent back — by a person, or by one of
 * the screening rules that refused it before anybody saw it. `blocked` is the
 * gate's own terminal state: it is **not** a decision anybody made, and the
 * schema will not let it become one.
 */
export type DraftStatus = 'needs-review' | 'approved' | 'rejected' | 'blocked'

const STATUSES: readonly DraftStatus[] = ['needs-review', 'approved', 'rejected', 'blocked']

export type DraftKind = 'video-idea' | 'remake-script'

const KINDS: readonly DraftKind[] = ['video-idea', 'remake-script']

export interface DraftSummary {
  readonly id: string
  readonly kind: DraftKind
  readonly title: string
  readonly status: DraftStatus
  /**
   * The gate's verdict, or `null` for **not checked**.
   *
   * Null is not a clean verdict and must never render as one — the rule
   * `VideoIdea.originality` already carries, and here it has consequences: the
   * database treats a null outcome as a refusal too.
   */
  readonly originality: OriginalityVerdict | null
  /**
   * The `body` column, which holds two different things by design (D131).
   *
   * For a **kept** draft it is the exact text the gate judged, so a verdict can
   * be re-derived rather than trusted. For a **refused** one the text is gone —
   * nothing stores a draft we would not show — so it is the reason the gate gave
   * instead. `write-drafts.ts` writes both, and `withheldFrom` is the only
   * reader that cares, because the refusal reason is what the report has to
   * print when fewer than three ideas survive.
   *
   * Null for a row whose body did not parse, which reads as "refused, and we
   * cannot say why" rather than as "not refused".
   */
  readonly body: string | null
  /** 1 or 2. A third attempt is unrepresentable in the schema. */
  readonly attempts: number
  /** ISO-8601, UTC. Null until somebody approves it. */
  readonly approvedAt: string | null
}

/**
 * Columns come back as `unknown`; every field is checked rather than cast, and
 * a row that does not parse is dropped rather than half-built.
 *
 * The direction of every fallback is the same: towards "not approvable". An
 * unrecognised status becomes `needs-review` rather than `approved`, and an
 * unparseable verdict becomes null, which is a refusal everywhere it is read.
 */
export function parseDraft(value: unknown): DraftSummary | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>

  const { id, title } = row
  if (typeof id !== 'string' || typeof title !== 'string') return null

  const status = STATUSES.find((candidate) => candidate === row.status) ?? 'needs-review'
  const kind = KINDS.find((candidate) => candidate === row.kind) ?? 'video-idea'

  // The stored `originality_outcome` column is deliberately not read here. The
  // verdict itself carries the outcome, and reading two copies of one fact
  // invites them to disagree — the column exists so the *database* can enforce
  // the rule without parsing jsonb, not so the application can second-guess it.
  return {
    id,
    kind,
    title,
    status,
    originality: parseVerdict(row.originality),
    body: typeof row.body === 'string' && row.body.trim() !== '' ? row.body.trim() : null,
    attempts: typeof row.attempts === 'number' ? row.attempts : 1,
    approvedAt: typeof row.approved_at === 'string' ? row.approved_at : null,
  }
}

/**
 * Should the screen offer an Approve button?
 *
 * A hidden button is not a refusal — V3 is explicit that the refusal must be
 * server-side "not merely hidden" — so this exists to avoid *inviting* a click
 * that will be refused, and nothing more. The answer it gives is advisory; the
 * one that counts comes back from `approve_draft`.
 */
export function isApprovableDraft(draft: DraftSummary): boolean {
  if (draft.status !== 'needs-review') return false
  return draft.originality?.outcome === 'passed'
}

/**
 * Why this draft cannot be approved, in words a client can read, or null when
 * it can be.
 *
 * The sentences match `approve_draft`'s so that a pre-emptive explanation and a
 * refused attempt do not tell the reader two different stories.
 */
export function approvalBlockedReason(draft: DraftSummary): string | null {
  if (isApprovableDraft(draft)) return null

  if (draft.status === 'approved') return 'Already approved.'
  if (draft.status === 'rejected') return 'This draft is no longer waiting for a decision.'

  // Covers `blocked`, `rewritten`, and the not-checked case. One sentence,
  // because the gate's own numbers and reasons are rendered beside it.
  return 'The Originality Gate has not passed this draft, so it cannot be approved.'
}

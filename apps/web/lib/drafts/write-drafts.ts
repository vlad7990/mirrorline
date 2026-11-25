/**
 * Every judged draft gets a row — the refused ones too (V3, D129).
 *
 * ============================================================================
 * The refused ones are the point
 * ============================================================================
 *
 * `screenIdeas` keeps what passed and returns the rest as `rejected`, which
 * until now was a `console.warn` and a count in a note. That made V3's first
 * done-when — "a deliberately-copied draft is blocked and the block is visible
 * in the studio" — true of the *mechanism* and false of the *screen*: the
 * studio could render a block beautifully and was never given one, because a
 * blocked idea never reached the database.
 *
 * `04 §4`: a gate whose failures are invisible is indistinguishable from a gate
 * that never fires. So both halves are written, and the refused rows are what
 * the client is shown alongside the number and the limit.
 *
 * ============================================================================
 * The service role, and what it still cannot do
 * ============================================================================
 *
 * `drafts` revokes insert from `authenticated`, so this runs behind
 * `server-only` with the scan's own client — the arrangement the report and the
 * `trends` rows already use.
 *
 * Worth saying plainly: holding the service-role key does **not** let this file
 * approve anything. `drafts_approved_passed` is a check constraint, and a check
 * constraint has no concept of privilege. An insert here that tried to write
 * `status: 'approved'` on a blocked verdict is rejected by Postgres, which is
 * exactly the guarantee `04` asks for when it forbids an override "from
 * anywhere".
 *
 * ============================================================================
 * It cannot fail the scan
 * ============================================================================
 *
 * A draft row is a record of a decision already made, and the report carries
 * the same verdicts in `first_videos`. Losing the rows costs the approve
 * surface and nothing else, so a failure here is logged and swallowed — the
 * rule `writeFirstVideos` already follows, for the same reason: a four-minute
 * piece of research must not be thrown away over bookkeeping.
 */

import 'server-only'

import type { createAgentServiceClient } from '../agents/service-client'
import { MAX_ATTEMPTS, type OriginalityVerdict } from '../originality/gate'
import { ideaDraft, type RejectedIdea, type VideoIdea } from '../scripts/video-idea'

import type { DraftStatus } from './types'

type AgentClient = ReturnType<typeof createAgentServiceClient>

export interface WriteDraftsInput {
  readonly workspaceId: string
  readonly reportId: string
  readonly kept: readonly VideoIdea[]
  readonly refused: readonly RejectedIdea[]
}

/** Did screening keep this draft, or refuse it? */
export type Screening = 'kept' | 'refused'

/**
 * The status a draft starts life with, which is **not** a free choice.
 *
 * Three rules, in order:
 *
 * 1. A `blocked` verdict is forced to `blocked` by
 *    `drafts_blocked_is_terminal`. Getting this wrong is an insert that fails,
 *    rather than a blocked draft quietly waiting for a reviewer who could
 *    never approve it.
 * 2. **A refused draft is never `needs-review`.** The gate runs before the fact
 *    check, so an idea refused for an ungrounded fact carries a *passing*
 *    originality verdict — and reading the verdict alone would make that draft
 *    approvable, which is `§V2`'s "at least one real business fact per script"
 *    quietly repealed by a status.
 * 3. Everything else waits for a person.
 */
export function statusForDraft(
  verdict: OriginalityVerdict | null,
  screening: Screening,
): DraftStatus {
  if (verdict?.outcome === 'blocked') return 'blocked'
  return screening === 'refused' ? 'rejected' : 'needs-review'
}

/**
 * How many attempts a verdict represents, clamped to what the schema allows.
 *
 * `attempts` may only be 1 or 2 — `04 §3`'s "two failures mean the recipe is
 * too close to its source to remake", as a constraint. A stored verdict from a
 * future version claiming attempt 5 would otherwise fail the insert and take
 * the whole batch with it, so it is clamped and the ceiling stays the schema's
 * to enforce.
 */
export function attemptsForVerdict(verdict: OriginalityVerdict | null): number {
  const attempt = verdict?.attempt ?? 1
  return Math.min(Math.max(1, Math.trunc(attempt)), MAX_ATTEMPTS)
}

export function draftRowsFor(input: WriteDraftsInput): readonly Record<string, unknown>[] {
  const kept = input.kept.map((idea) => ({
    title: idea.title,
    // The text the gate actually judged, rebuilt the way `screenIdeas` built
    // it, so a stored verdict can be re-derived rather than trusted.
    body: ideaDraft(idea),
    originality: idea.originality,
    screening: 'kept' as Screening,
  }))

  const refused = input.refused.map((rejection) => ({
    title: rejection.title,
    // A refused idea is kept nowhere, so its text is gone by the time we get
    // here; the reason the gate gave is what there is to show. That is also the
    // better field to store — the body would be the copied text itself.
    body: rejection.reason,
    originality: rejection.originality,
    screening: 'refused' as Screening,
  }))

  return [...kept, ...refused].map((draft) => ({
    workspace_id: input.workspaceId,
    report_id: input.reportId,
    kind: 'video-idea',
    title: draft.title,
    body: draft.body,
    originality: draft.originality,
    // The column the database's rules are written against, taken from the
    // verdict rather than stored independently — null when there is no verdict,
    // which every rule treats as a refusal.
    originality_outcome: draft.originality?.outcome ?? null,
    status: statusForDraft(draft.originality, draft.screening),
    attempts: attemptsForVerdict(draft.originality),
  }))
}

/** How many rows were written. Zero on failure, and the log says why. */
export async function writeDrafts(supabase: AgentClient, input: WriteDraftsInput): Promise<number> {
  const rows = draftRowsFor(input)
  if (rows.length === 0) return 0

  const { error } = await supabase.from('drafts').insert(rows)

  if (error) {
    // Swallowed on purpose (see the header), and said out loud: without this
    // line a scan would silently stop producing an approve surface, and the
    // studio would show a report with nothing under it.
    console.error(`[drafts] could not write ${rows.length} draft(s): ${error.message}`)
    return 0
  }

  return rows.length
}

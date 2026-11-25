'use client'

import { AlertBar, Button, Card, Eyebrow, StatusChip, type Status } from '@mirrorline/ui'
import * as React from 'react'

import type { ApproveDraftResult } from '@/lib/drafts/approve-reply'
import { approvalBlockedReason, isApprovableDraft, type DraftSummary } from '@/lib/drafts/types'

/**
 * "Drafts and the gate" — where a refusal becomes something you can see, and
 * press against (V3, D129).
 *
 * ============================================================================
 * Why the refused drafts are listed at all
 * ============================================================================
 *
 * `04 §4`: a gate whose failures are invisible is indistinguishable from a gate
 * that never fires. Until now the studio could render a block beautifully and
 * was never given one — a refused idea was a `console.warn` and a number in a
 * note, so the only drafts on screen were the ones that passed. A client
 * looking at three clean verdicts could not tell a strict gate from a sleeping
 * one.
 *
 * So every judged draft is here, and the ones that failed carry the number, the
 * limit and the gate's own reasons.
 *
 * ============================================================================
 * The button is hidden *and* the server refuses
 * ============================================================================
 *
 * `§V3` is explicit: "the approve action is refused **server-side**, not merely
 * hidden". Both, then, and they do different jobs — hiding it keeps a client
 * from being invited to press something that cannot work, and the refusal is
 * what makes it true. `isApprovableDraft` here is advisory; the answer that
 * counts comes back from `approve_draft` and is rendered verbatim.
 *
 * A refusal is **not** an error on this screen. The gate refusing is the gate
 * working, and `18 §6`'s rule for the spend cap applies unchanged: painting a
 * working control red teaches the reader to distrust it.
 *
 * ============================================================================
 * The action arrives as a prop
 * ============================================================================
 *
 * Not imported, for the reason `RunScanForm` gives: `server-only.test.ts` walks
 * the static import graph and fails if a `'use client'` module can reach the
 * SDK chokepoint at any depth. `approve-reply.ts` imports nothing at all, which
 * is what makes the result *type* safe to import here.
 */

/** Which chip a status wears, and the word it says. */
const CHIP: Record<DraftSummary['status'], { readonly tone: Status; readonly label: string }> = {
  'needs-review': { tone: 'needs-review', label: 'Needs review' },
  approved: { tone: 'approved', label: 'Approved' },
  // Not its own chip tone, and the mapping is honest rather than lazy: a draft
  // sent back is not going out, which is what `blocked` means to a reader.
  rejected: { tone: 'blocked', label: 'Sent back' },
  blocked: { tone: 'blocked', label: 'Blocked' },
}

export interface DraftDecisionsProps {
  /** Null means the read failed, which is **not** the same as no drafts. */
  readonly drafts: readonly DraftSummary[] | null
  readonly onApprove: (draftId: string) => Promise<ApproveDraftResult>
}

interface RowProps {
  readonly draft: DraftSummary
  readonly onApprove: DraftDecisionsProps['onApprove']
}

function DraftRow({ draft, onApprove }: RowProps) {
  const [result, setResult] = React.useState<ApproveDraftResult | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const chip = CHIP[draft.status]
  const verdict = draft.originality
  const blockedReason = approvalBlockedReason(draft)
  const canApprove = isApprovableDraft(draft)

  const approve = () => {
    startTransition(async () => {
      setResult(await onApprove(draft.id))
    })
  }

  return (
    <li className="flex flex-col gap-2 border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-body font-medium">{draft.title}</p>
        <StatusChip status={chip.tone}>{chip.label}</StatusChip>
      </div>

      {/* The gate's own arithmetic, never a second computation that could
          disagree with it. A null verdict says "not checked" rather than
          leaving a blank that reads as clean. */}
      {verdict ? (
        <p className="m-0 text-caption text-text-muted">
          <span className="machine">{verdict.similarity}%</span> of the phrasing is shared · limit{' '}
          <span className="machine">{verdict.limit}%</span> · attempt{' '}
          <span className="machine">{draft.attempts}</span> of <span className="machine">2</span>
        </p>
      ) : (
        <p className="m-0 text-caption text-text-muted">
          Not checked — this draft was stored before the gate ran, so there is no verdict to show.
        </p>
      )}

      {verdict && verdict.reasons.length > 0 ? (
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-caption text-text-muted">
          {verdict.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {canApprove ? (
          <Button
            variant="primary"
            size="md"
            className="press"
            disabled={isPending}
            onClick={approve}
          >
            {isPending ? 'Approving…' : 'Approve'}
          </Button>
        ) : (
          <p className="m-0 text-caption text-text-muted">{blockedReason}</p>
        )}

        {/* What the server said, which outranks everything above it. */}
        {result?.status === 'approved' ? (
          <p className="m-0 text-caption text-text-muted">Approved. Reload to see it settle.</p>
        ) : null}
        {result?.status === 'refused' ? (
          <p className="m-0 text-caption text-text-muted">{result.reason}</p>
        ) : null}
        {result?.status === 'error' ? (
          <p className="m-0 text-caption text-text-muted">{result.message}</p>
        ) : null}
      </div>
    </li>
  )
}

export function DraftDecisions({ drafts, onApprove }: DraftDecisionsProps) {
  // Three states, kept apart for the reason `read-drafts.ts` gives: a failed
  // read rendering as "no drafts" would hide a blocked one, and this is the
  // screen that exists in order not to hide them.
  if (drafts === null) {
    return (
      <AlertBar
        aria-label="Drafts unavailable"
        description="This is about our request, not about your drafts. Reload in a moment."
        role="region"
        title="We could not load the drafts from this scan."
        tone="warning"
      />
    )
  }

  if (drafts.length === 0) return null

  const waiting = drafts.filter((draft) => draft.status === 'needs-review').length

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>Compliance · Originality Gate</Eyebrow>
        {waiting > 0 ? (
          <StatusChip status="needs-review">Needs review · {waiting}</StatusChip>
        ) : null}
      </div>

      <p className="m-0 text-caption text-text-muted">
        Every draft this scan wrote, including the ones the gate refused. Nothing can be approved
        without a passing verdict — the refusal is in the database, not in this screen.
      </p>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {drafts.map((draft) => (
          <DraftRow key={draft.id} draft={draft} onApprove={onApprove} />
        ))}
      </ul>
    </Card>
  )
}

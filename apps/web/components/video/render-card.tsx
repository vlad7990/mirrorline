'use client'

import { AiLabel, Button, Card, StatusChip } from '@mirrorline/ui'
import * as React from 'react'

import type { ApproveDraftResult } from '@/lib/drafts/approve-reply'
import { approvalBlockedReason, isRenderPending, type RenderSummary } from '@/lib/video/types'

/**
 * One finished short, with its verdict and its one button (V5, slice 1).
 *
 * ============================================================================
 * The gate's findings are on the card, not behind it
 * ============================================================================
 *
 * `04 §Originality Gate` sets the rule and V3 applied it to scripts: "the
 * verdict is shown to the client with the number, the limit and what the gate
 * did — a gate whose failures are invisible is the predecessor project's
 * gate." A compliance verdict on a video is the same promise, so a flagged cut
 * says what was flagged rather than greying out a button.
 *
 * ============================================================================
 * The AI label is rendered from the row, not from a prop somebody set
 * ============================================================================
 *
 * `renders.ai_label` is `not null`-by-constraint whenever `ai_scenes` is
 * non-empty, so this label cannot be missing from a render that has a
 * generated scene — the database refuses that row. Here it is simply printed.
 * Slice 1 generates nothing, so it is absent; the day the generation session
 * fills a segment, it appears without this file changing.
 */

export interface RenderCardProps {
  readonly render: RenderSummary
  /** Passed in, never imported — see `FootageUpload` for why. */
  readonly approve: (renderId: string) => Promise<ApproveDraftResult>
}

const seconds = (value: number | null): string =>
  value === null ? '' : `${Math.round(value)}s`

export function RenderCard({ render, approve }: RenderCardProps) {
  const [result, setResult] = React.useState<ApproveDraftResult | null>(null)
  const [isWorking, setIsWorking] = React.useState(false)

  const isApproved = render.approvedAt !== null || result?.status === 'approved'
  const blocked = approvalBlockedReason(render)

  async function onApprove() {
    setIsWorking(true)
    setResult(await approve(render.id))
    setIsWorking(false)
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-title">{render.title}</h3>
          <p className="text-caption text-text-muted">
            {render.segments.length > 0
              ? `${render.segments.length} beats · ${seconds(render.durationS)} · 1080×1920`
              : seconds(render.durationS)}
          </p>
        </div>
        <StatusChip
          status={
            isApproved
              ? 'approved'
              : render.status === 'failed'
                ? 'blocked'
                : isRenderPending(render)
                  ? 'scheduled'
                  : 'needs-review'
          }
        />
      </div>

      {render.playbackUrl !== null ? (
        // `controls` and nothing else: no autoplay, no loop. This is a client
        // deciding whether to post something, not a feed.
        <video
          className="w-full max-w-[280px] self-start rounded-lg border border-border"
          controls
          preload="metadata"
          poster={render.posterUrl ?? undefined}
          src={render.playbackUrl}
        />
      ) : render.status === 'ready' ? (
        <p className="text-meta text-text-muted">
          This video is finished, but the link could not be signed just now. Reload the page.
        </p>
      ) : isRenderPending(render) ? (
        <p className="text-meta text-text-muted">
          Making your video. Transcribing is the slow part — about a third of the length of your
          footage.
        </p>
      ) : null}

      {render.aiLabel !== null ? <AiLabel>{render.aiLabel}</AiLabel> : null}

      {render.error !== null ? (
        <p className="text-meta text-danger" role="alert">
          {render.error}
        </p>
      ) : null}

      {render.compliance !== null ? (
        <div className="flex flex-col gap-1">
          <p className="text-caption font-medium uppercase tracking-wide text-text-muted">
            Compliance · {render.compliance.verdict}
          </p>
          {render.compliance.findings.length > 0 ? (
            <ul className="list-disc pl-5 text-meta text-text-muted">
              {render.compliance.findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          ) : (
            <p className="text-meta text-text-muted">
              Rights record, banned phrases, near-duplicates and AI labelling all checked.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        {isApproved ? (
          <p className="text-meta text-text-muted">Approved. It is ready to post.</p>
        ) : (
          <Button type="button" onClick={onApprove} disabled={isWorking || blocked !== null}>
            {isWorking ? 'Approving…' : 'Approve'}
          </Button>
        )}
        {blocked !== null && !isApproved ? (
          <p className="text-meta text-text-muted">{blocked}</p>
        ) : null}
      </div>

      {result?.status === 'refused' ? (
        <p className="text-meta text-danger" role="alert">
          {result.reason}
        </p>
      ) : null}
      {result?.status === 'error' ? (
        <p className="text-meta text-danger" role="alert">
          {result.message}
        </p>
      ) : null}
    </Card>
  )
}

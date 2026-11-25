/**
 * The video pipeline's shapes and its numbers, in a module either side may
 * import (V5, slice 1).
 *
 * **No `server-only` here, and that is the point** — the same split
 * `lib/jobs/types.ts` makes. A `'use client'` card needs `RenderStatus` to
 * decide what to render; everything that touches the service-role key lives in
 * the modules next door that do import `server-only`.
 */

import type { Segment } from './segment'

/**
 * The longest source this pipeline will accept, and the reason it is an hour.
 *
 * A podcast or a webinar is the material §V5 is for, and an hour is the top of
 * that range. It is **not** an arbitrary ceiling: it is the number the budgets
 * below are derived from, and the two have to move together or a 90-minute
 * upload becomes a job that cannot finish inside its lease and is therefore
 * run twice. `budget.test.ts` next door asserts the relationship.
 *
 * A longer file is refused at the upload with a sentence, before a byte is
 * stored, rather than accepted and failed after an hour of CPU.
 */
export const MAX_SOURCE_SECONDS = 60 * 60

/** The size the bucket also enforces (5 GiB). Checked here so the refusal has words. */
export const MAX_SOURCE_BYTES = 5 * 1024 * 1024 * 1024

/**
 * How long a render job's claim lasts, and why it is not `JOB_LEASE_SECONDS`.
 *
 * `claim_job(job_kinds, lease_seconds)` takes the lease **per claim**, which
 * the scan worker has always passed explicitly. That turns out to be the hinge
 * for video: transcribing an hour of audio on two vCPUs is twenty minutes of
 * honest work, and no amount of care makes it fit in the scan's fifteen-minute
 * lease. A job that outlives its lease is not a slow job — `claim_job`
 * reclaims it and a second worker starts the same encode — so the lease moves
 * to fit the work rather than the work being cut to fit the lease.
 *
 * One hour, against a worst-case sum of forty minutes. The margin is the same
 * third the scan's budget test demands, and for the same reason: a job is more
 * than its two slow legs.
 */
export const RENDER_JOB_LEASE_SECONDS = 60 * 60

/**
 * The transcription leg's ceiling: 24 minutes for up to an hour of audio.
 *
 * faster-whisper `small` with int8 weights runs at roughly 0.2–0.4× realtime
 * on two vCPUs, so an hour lands between 12 and 24 minutes. This is the top of
 * that range and not a target — it is `MAX_SOURCE_SECONDS` × 0.4, which is why
 * `budget.test.ts` can assert the two move together. When it is hit the job
 * **fails with a sentence** rather than being killed by a lease expiry,
 * because a failure we wrote is debuggable and a reclaim is a second bill.
 */
export const TRANSCRIBE_TIME_BUDGET_MS = 24 * 60 * 1000

/** Encoding every short from one source: 10 minutes. A 45-second short takes 10–25s. */
export const RENDER_TIME_BUDGET_MS = 10 * 60 * 1000

/** Pulling the source down and pushing the shorts back up: 5 minutes. */
export const TRANSFER_TIME_BUDGET_MS = 5 * 60 * 1000

/**
 * The shortest and longest finished short.
 *
 * Four beats of five to twenty seconds is twenty to eighty seconds of video.
 * The floor exists because a twelve-second "video" is a clip nobody watches;
 * the ceiling because every platform's short-form surface treats ninety
 * seconds as the edge, and a cut that long has stopped being a short.
 */
export const MIN_SHORT_SECONDS = 12
export const MAX_SHORT_SECONDS = 90

/** 9:16 at the size every platform accepts without re-encoding it again. */
export const VERTICAL_WIDTH = 1080
export const VERTICAL_HEIGHT = 1920

export const FOOTAGE_BUCKET = 'client-footage'
export const RENDERS_BUCKET = 'renders'

/**
 * `uploading` until the client's resumable upload reports done. A row that
 * stays `uploading` is an abandoned upload, not a queue.
 */
export type AssetStatus = 'uploading' | 'ready' | 'rejected'

/**
 * `queued` and `rendering` both read as "Making your video…" to the client —
 * the distinction is the worker's. `failed` is terminal: the worker marks a
 * failure and stops, and the client presses the button again, which is a retry
 * made by somebody who can see the error (the rule `isJobPending` carries).
 */
export type RenderStatus = 'queued' | 'rendering' | 'ready' | 'failed'

const ASSET_STATUSES: readonly AssetStatus[] = ['uploading', 'ready', 'rejected']
const RENDER_STATUSES: readonly RenderStatus[] = ['queued', 'rendering', 'ready', 'failed']

/** The Compliance agent's answer, as `summary.json` already spells it. */
export type ComplianceVerdict = 'passed' | 'needs-review' | 'blocked'

export interface ComplianceReport {
  readonly verdict: ComplianceVerdict
  /** One line per finding, in the gate's own words. Shown to the client. */
  readonly findings: readonly string[]
}

export interface VideoAssetSummary {
  readonly id: string
  readonly originalName: string
  readonly status: AssetStatus
  readonly bytes: number | null
  readonly durationS: number | null
  readonly hasAudio: boolean | null
  readonly rightsHolder: string
  /** ISO-8601, UTC, as `timestamptz` comes back over REST. */
  readonly createdAt: string
  readonly error: string | null
}

export interface RenderSummary {
  readonly id: string
  readonly title: string
  readonly status: RenderStatus
  readonly cutIndex: number
  readonly assetId: string
  readonly draftId: string | null
  readonly durationS: number | null
  readonly segments: readonly Segment[]
  /** Null when nothing in this render was generated. */
  readonly aiLabel: string | null
  readonly compliance: ComplianceReport | null
  readonly approvedAt: string | null
  readonly createdAt: string
  readonly error: string | null
  /**
   * A short-lived signed URL for the finished file, or null.
   *
   * Null on anything unfinished, and null on a `ready` render whose URL could
   * not be signed — the card then says so rather than rendering a dead player.
   * Never a public URL: the bucket is private because a render that has not
   * passed the gate is not a thing to hand out a permanent link to.
   */
  readonly playbackUrl: string | null
  readonly posterUrl: string | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export function parseAssetStatus(value: unknown): AssetStatus | null {
  return typeof value === 'string' && (ASSET_STATUSES as readonly string[]).includes(value)
    ? (value as AssetStatus)
    : null
}

export function parseRenderStatus(value: unknown): RenderStatus | null {
  return typeof value === 'string' && (RENDER_STATUSES as readonly string[]).includes(value)
    ? (value as RenderStatus)
    : null
}

/**
 * Lift the compliance verdict out of jsonb.
 *
 * **An unreadable verdict is null, not a pass.** `approve_render` and
 * `renders_approved_passed` both read the stored jsonb directly, so this
 * function cannot grant anything — but a screen that rendered an unknown
 * verdict as "passed" would be telling the client the gate approved something
 * it never saw.
 */
export function parseCompliance(value: unknown): ComplianceReport | null {
  if (!isRecord(value)) return null

  const verdict = value.verdict
  if (verdict !== 'passed' && verdict !== 'needs-review' && verdict !== 'blocked') return null

  const findings = Array.isArray(value.findings)
    ? value.findings.filter((finding): finding is string => typeof finding === 'string')
    : []

  return { verdict, findings }
}

/** Whether this render is still going to produce something. */
export function isRenderPending(render: Pick<RenderSummary, 'status'>): boolean {
  return render.status === 'queued' || render.status === 'rendering'
}

/**
 * Whether the client may approve this render yet, and the sentence when they
 * may not.
 *
 * The same three-layer shape `drafts` has: this function is what the *screen*
 * uses, `approve_render` refuses server-side, and two check constraints refuse
 * every role including the worker's. Remove any one and the other two still
 * refuse — which is what `04` means by "no override, from anywhere".
 */
export function approvalBlockedReason(render: RenderSummary): string | null {
  if (render.approvedAt !== null) return null
  if (isRenderPending(render)) return 'This video is still being made.'
  if (render.status === 'failed') return 'This video did not finish, so there is nothing to approve.'

  if (render.compliance === null) {
    return 'The Compliance agent has not looked at this video yet.'
  }

  if (render.compliance.verdict !== 'passed') {
    return render.compliance.verdict === 'blocked'
      ? 'The Compliance agent blocked this video, so it cannot be approved.'
      : 'The Compliance agent flagged this video for review, so it cannot be approved yet.'
  }

  return null
}

/** What the client is told to expect, and it is arithmetic rather than a hope. */
export function renderEtaMinutes(sourceDurationS: number | null): number {
  // Transcription dominates and runs at roughly a third of realtime; the encode
  // is a minute at most. Rounded up, floored at two, so a 30-second test clip
  // does not promise "0 min".
  const transcribeMinutes = ((sourceDurationS ?? 0) / 60) * 0.4
  return Math.max(2, Math.ceil(transcribeMinutes + 1))
}

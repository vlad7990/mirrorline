/**
 * The shape the cuts grid renders, whichever side produced it.
 *
 * `CutGrid` used to take `Cut` from @mirrorline/mock, which tied the grid to
 * the demo data. The engine's formats are its own vocabulary ("Hook
 * question", "List") and do not fit the mock's `FormatTag` union. Forcing
 * them into it would mean printing "Carousel" on a cut the engine called a
 * list, which is a small lie told on every card.
 *
 * So `CutView` is a structural supertype of the mock `Cut`: same field names,
 * `format` widened to a string, and two fields only a real run can fill. A
 * mock cut is already a `CutView` and needs no mapping; an engine cut gets
 * `toCutView`.
 */

import type { ComplianceStatus } from '@mirrorline/mock'

import type { EngineComplianceStatus, EngineCut } from '@/lib/engine/types'

export interface CutView {
  readonly id: string
  /** 1-based position in the grid. */
  readonly index: number
  readonly hook: string
  readonly highlightPhrase?: string
  readonly lengthLabel: string
  readonly lengthSeconds: number
  /** The producer's own word for the shape of the clip. */
  readonly format: string
  readonly score: number
  readonly compliance: ComplianceStatus
  readonly complianceLabel: string
  /** Why the gate flagged it; null when it passed. */
  readonly complianceReason: string | null
  readonly thumbnailColor: string
  /** Set only for a cut the engine actually rendered. */
  readonly videoUrl?: string
  /** Why the finder scored it as it did. Empty for demo cuts. */
  readonly reasons?: readonly string[]
}

/** An engine cut carrying the URL the API serves it from. */
export type EngineCutWithUrl = EngineCut & { readonly url?: string }

const STATUS: Record<EngineComplianceStatus, ComplianceStatus> = {
  pass: 'passed',
  'needs-review': 'needs-review',
  blocked: 'blocked',
}

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  passed: 'Passed',
  'needs-review': 'Needs review',
  blocked: 'Blocked',
}

/**
 * The demo thumbnails cycle four brand colours. A rendered cut has a real
 * frame behind it, but the card still needs a fill while the video is not
 * playing, so it borrows the same rotation.
 */
const THUMBNAIL_COLORS = ['#12545A', '#1E3A5F', '#6B3A2E', '#14433B'] as const

export function thumbnailColorFor(index: number): string {
  const count = THUMBNAIL_COLORS.length
  const safe = ((index % count) + count) % count
  return THUMBNAIL_COLORS[safe] ?? THUMBNAIL_COLORS[0]
}

/**
 * The first finding that is not a pass, which is the one worth printing.
 *
 * `ComplianceResult` already takes the worst status; this takes the sentence
 * that goes with it, so the card explains itself rather than just colouring
 * itself.
 */
export function reasonFrom(cut: EngineCut): string | null {
  const blocking = cut.compliance.findings.find((finding) => finding.status === 'blocked')
  if (blocking) return blocking.message

  const review = cut.compliance.findings.find((finding) => finding.status === 'needs-review')
  return review ? review.message : null
}

export function toCutView(cut: EngineCutWithUrl, jobId: string): CutView {
  const compliance = STATUS[cut.compliance.status]

  return {
    id: `${jobId}-${cut.index}`,
    index: cut.index,
    hook: cut.hook,
    lengthLabel: cut.lengthLabel,
    lengthSeconds: cut.lengthSeconds,
    format: cut.format,
    score: cut.score,
    compliance,
    complianceLabel: STATUS_LABEL[compliance],
    complianceReason: reasonFrom(cut),
    thumbnailColor: thumbnailColorFor(cut.index - 1),
    videoUrl: cut.url,
    reasons: cut.reasons,
  }
}

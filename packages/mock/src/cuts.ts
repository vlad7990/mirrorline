/**
 * Episode 47 and the 12 cuts the Multiplier made from it.
 *
 * Transcribed from the table in docs/specs/08_MOCK_DATA.md — hooks, lengths,
 * format tags, scores and compliance verdicts must match it exactly.
 */

import {
  COMPLIANCE_LABELS,
  TODAY,
  idSuffix,
  secondsFromClockLabel,
  thumbnailColorAt,
} from './internal'
import type { ComplianceStatus, Cut, FormatTag, SourceVideo } from './types'

export const sourceVideo: SourceVideo = {
  id: 'video-episode-47',
  title: 'Episode 47: Why good managers burn out',
  durationLabel: '52:14',
  durationSeconds: secondsFromClockLabel('52:14'),
  uploadedOn: TODAY,
  uploadedAtLabel: '9:12 am',
  uploadedAt24: '09:12',
}

interface CutRow {
  readonly hook: string
  readonly lengthLabel: string
  readonly format: FormatTag
  readonly score: number
  readonly compliance: ComplianceStatus
  readonly complianceReason: string | null
}

const CUT_ROWS: readonly CutRow[] = [
  {
    hook: "You're not tired. You're over-responsible.",
    lengthLabel: '0:24',
    format: 'Hook clip',
    score: 92,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: 'The meeting that cost me my best engineer',
    lengthLabel: '0:52',
    format: 'Story',
    score: 88,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: '3 words that stop a team from burning out',
    lengthLabel: '0:31',
    format: 'Hook clip',
    score: 86,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: 'If your 1:1s feel like status updates, try this',
    lengthLabel: '0:44',
    format: 'Tip',
    score: 84,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: "New managers: stop saying 'let me know if you need anything'",
    lengthLabel: '0:28',
    format: 'Hook clip',
    score: 83,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: "What I'd tell myself in my first month as a manager",
    lengthLabel: '0:58',
    format: 'Story',
    score: 80,
    compliance: 'needs-review',
    complianceReason: 'Mentions a former employer',
  },
  {
    hook: "Burnout isn't a workload problem",
    lengthLabel: '0:19',
    format: 'Quote card',
    score: 79,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: 'Why your best people go quiet',
    lengthLabel: '0:36',
    format: 'Hook clip',
    score: 77,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: 'A listener asked: how do I say no to my boss?',
    lengthLabel: '0:47',
    format: 'Reply',
    score: 75,
    compliance: 'needs-review',
    complianceReason: 'Listener name visible',
  },
  {
    hook: 'The 10-minute Friday habit',
    lengthLabel: '0:33',
    format: 'Tip',
    score: 74,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: "5 signs you're managing, not leading",
    lengthLabel: '0:40',
    format: 'Carousel',
    score: 72,
    compliance: 'passed',
    complianceReason: null,
  },
  {
    hook: 'Funny story about my first team offsite',
    lengthLabel: '0:29',
    format: 'Story',
    score: 61,
    compliance: 'blocked',
    complianceReason: 'Background music from a venue; replace the audio',
  },
]

export const cuts: readonly Cut[] = CUT_ROWS.map((row, position) => ({
  id: `cut-${idSuffix(position + 1)}`,
  index: position + 1,
  hook: row.hook,
  lengthLabel: row.lengthLabel,
  lengthSeconds: secondsFromClockLabel(row.lengthLabel),
  format: row.format,
  score: row.score,
  compliance: row.compliance,
  complianceLabel: COMPLIANCE_LABELS[row.compliance],
  complianceReason: row.complianceReason,
  thumbnailColor: thumbnailColorAt(position),
}))

export function cutById(id: string): Cut {
  const cut = cuts.find((candidate) => candidate.id === id)
  if (!cut) {
    throw new Error(`Unknown cut id: ${id}`)
  }
  return cut
}

function countCutsByCompliance(status: ComplianceStatus): number {
  return cuts.filter((cut) => cut.compliance === status).length
}

/** Drives the S3 summary: "12 cuts ready · 9 passed · 3 need your eye." */
export const cutSummary = {
  total: cuts.length,
  passed: countCutsByCompliance('passed'),
  needsReview: countCutsByCompliance('needs-review'),
  blocked: countCutsByCompliance('blocked'),
  needsYourEye: countCutsByCompliance('needs-review') + countCutsByCompliance('blocked'),
} as const

/** Non-negotiable 6: a blocked cut can never reach the calendar. */
export const schedulableCuts: readonly Cut[] = cuts.filter((cut) => cut.compliance !== 'blocked')

/** Deterministic pick from the schedulable cuts, wrapping around the list. */
export function schedulableCutAt(index: number): Cut {
  const count = schedulableCuts.length
  const cut = schedulableCuts[((index % count) + count) % count]
  if (!cut) {
    throw new Error(`No schedulable cut at index ${index}`)
  }
  return cut
}

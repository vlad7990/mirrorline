/**
 * View models and copy for S3 · Upload and multiply.
 *
 * Every cut, hook, length, score and verdict comes from @mirrorline/mock. The
 * filter counts and the summary line are counted from that same list, so the
 * screen can never claim a total the grid does not show.
 *
 * 03_SCREENS_SPEC "States to show at least once": empty, loading, error and
 * blocked-by-compliance all have to be reachable. The first three are demo
 * states on this screen; the blocked card is in the data itself.
 */

import type { Cut, FormatTag } from '@mirrorline/mock'
import { cutSummary, cuts, sourceVideo, workspace } from '@mirrorline/mock'
import type { Status } from '@mirrorline/ui'

/* -------------------------------------------------------------------------- */
/* Demo state                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The four states a reviewer has to be able to screenshot. It lives in the
 * `?state=` query param so each one can be deep-linked from an end-to-end
 * test or a screenshot script.
 */
export const DEMO_STATES = ['ready', 'empty', 'loading', 'error'] as const

export type DemoState = (typeof DEMO_STATES)[number]

export const DEFAULT_DEMO_STATE: DemoState = 'ready'

export const DEMO_STATE_PARAM = 'state'

/** Anything unrecognised falls back to the real screen rather than throwing. */
export function parseDemoState(raw: string | readonly string[] | undefined): DemoState {
  const value = Array.isArray(raw) ? raw[0] : raw
  const match = DEMO_STATES.find((state) => state === value)
  return match ?? DEFAULT_DEMO_STATE
}

export interface DemoStateItem {
  readonly value: DemoState
  readonly label: string
}

export const DEMO_STATE_ITEMS: readonly DemoStateItem[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'empty', label: 'Empty' },
  { value: 'loading', label: 'Loading' },
  { value: 'error', label: 'Error' },
]

/* -------------------------------------------------------------------------- */
/* Header, source and copy                                                     */
/* -------------------------------------------------------------------------- */

const SECONDS_IN_MINUTE = 60

export const UPLOAD_HEADER = {
  eyebrow: 'Create · Multiplier agent',
  title: `One video, ${cuts.length} posts`,
  /** With nothing to show, the count in the title would be a claim. */
  titleWithoutCuts: 'Upload a video',
} as const

export const SOURCE_VIDEO = {
  lengthLabel: sourceVideo.durationLabel,
  title: sourceVideo.title,
  meta: `${workspace.showName} · uploaded today ${sourceVideo.uploadedAtLabel}`,
} as const

export const DROPZONE_COPY = {
  title: 'Drop a long video',
  importPrefix: 'or ',
  importLabel: 'import from my YouTube channel',
  /** Said plainly: nothing leaves the browser in this build. */
  note: 'This demo reads the file name only. Nothing is uploaded.',
} as const

export const EMPTY_COPY = {
  title: 'No uploads yet',
  description: 'Drop a long video. We’ll find the moments worth posting.',
} as const

export const ERROR_COPY = {
  title: 'We couldn’t read that file.',
  description: 'Try an MP4 or MOV under 4 GB.',
  retryLabel: 'Try again',
} as const

/* -------------------------------------------------------------------------- */
/* Pipeline steps                                                              */
/* -------------------------------------------------------------------------- */

export type StepState = 'done' | 'running' | 'waiting'

export interface PipelineStep {
  readonly id: string
  readonly name: string
  readonly detail: string
}

/** Candidate moments the Multiplier looked at before keeping twelve. */
const CANDIDATE_MOMENTS = 31
/** The vertical frame every cut is rendered in. */
const CUT_ASPECT = '9:16'
const ownerFirstName = workspace.ownerName.split(' ')[0] ?? workspace.ownerName

export const PIPELINE_STEPS: readonly PipelineStep[] = [
  {
    id: 'transcribing',
    name: 'Transcribing',
    detail: `${Math.round(sourceVideo.durationSeconds / SECONDS_IN_MINUTE)} min, word timings`,
  },
  { id: 'finding', name: 'Finding moments', detail: `${CANDIDATE_MOMENTS} candidates` },
  { id: 'cutting', name: 'Cutting', detail: `${cuts.length} kept, ${CUT_ASPECT}` },
  { id: 'captioning', name: 'Captioning', detail: `${ownerFirstName}’s caption style` },
  {
    id: 'compliance',
    name: 'Compliance check',
    detail: `${cutSummary.passed} · ${cutSummary.needsReview} · ${cutSummary.blocked}`,
  },
]

/** How far along the run is while the screen is in its loading state. */
const RUNNING_STEP_INDEX = 3

export const PIPELINE_TITLE = {
  done: 'Done in 3 min 41 s',
  running: 'Making your cuts',
} as const

/** Everything before the running step has finished; everything after waits. */
export function stepStateAt(index: number, isRunning: boolean): StepState {
  if (!isRunning) return 'done'
  if (index < RUNNING_STEP_INDEX) return 'done'
  if (index === RUNNING_STEP_INDEX) return 'running'
  return 'waiting'
}

/** Status is never colour alone: each chip says its word out loud. */
export const STEP_STATE_WORDS: Record<StepState, string> = {
  done: 'Done',
  running: 'Running',
  waiting: 'Waiting',
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

export interface CutFilter {
  readonly id: string
  /** "Hook clips 4" — the name plus the count the grid will show. */
  readonly label: string
}

interface FilterGroup {
  readonly id: string
  readonly name: string
  /** null means "every cut". */
  readonly formats: readonly FormatTag[] | null
}

const FILTER_GROUPS: readonly FilterGroup[] = [
  { id: 'all', name: 'All', formats: null },
  { id: 'hook', name: 'Hook clips', formats: ['Hook clip'] },
  { id: 'story', name: 'Stories', formats: ['Story'] },
  { id: 'tip', name: 'Tips', formats: ['Tip'] },
  { id: 'other', name: 'Quote, carousel, reply', formats: ['Quote card', 'Carousel', 'Reply'] },
]

export const ALL_CUTS_FILTER_ID = 'all'

function matchesFormats(cut: Cut, formats: readonly FormatTag[] | null): boolean {
  return formats === null || formats.includes(cut.format)
}

/** Counted from the fixtures, so the chip and the grid can never disagree. */
export const CUT_FILTERS: readonly CutFilter[] = FILTER_GROUPS.map((group) => ({
  id: group.id,
  label: `${group.name} ${cuts.filter((cut) => matchesFormats(cut, group.formats)).length}`,
}))

export function cutsForFilter(filterId: string): readonly Cut[] {
  const group = FILTER_GROUPS.find((candidate) => candidate.id === filterId)
  if (!group) return cuts
  return cuts.filter((cut) => matchesFormats(cut, group.formats))
}

/* -------------------------------------------------------------------------- */
/* Cut status and actions                                                      */
/* -------------------------------------------------------------------------- */

export type CutStatus = Extract<Status, 'passed' | 'approved' | 'needs-review' | 'blocked'>

/** Approval is the one thing a person changes here; the verdict is the agent's. */
export function cutStatus(cut: Cut, isApproved: boolean): CutStatus {
  return isApproved ? 'approved' : cut.compliance
}

export const CUT_ACTIONS = {
  preview: 'Preview',
  approve: 'Approve',
  undo: 'Undo',
  review: 'Review',
  fix: 'Fix',
} as const

/** The second button on a card: what this cut is actually waiting for. */
export function secondActionLabel(status: CutStatus): string {
  if (status === 'approved') return CUT_ACTIONS.undo
  if (status === 'blocked') return CUT_ACTIONS.fix
  if (status === 'needs-review') return CUT_ACTIONS.review
  return CUT_ACTIONS.approve
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

export interface CutCounts {
  readonly total: number
  /** Cuts the Compliance agent passed, approved or not. */
  readonly passed: number
  readonly approved: number
  readonly needsReview: number
  readonly blocked: number
}

export function countCuts(approvedIds: readonly string[]): CutCounts {
  return {
    total: cutSummary.total,
    passed: cutSummary.passed,
    approved: cuts.filter((cut) => cut.compliance === 'passed' && approvedIds.includes(cut.id))
      .length,
    needsReview: cutSummary.needsReview,
    blocked: cutSummary.blocked,
  }
}

/** "12 cuts ready · 9 passed · 2 need your eye · 1 blocked". */
export function summaryLine(counts: CutCounts): string {
  const parts = [`${counts.total} cuts ready`, `${counts.passed} passed`]
  if (counts.approved > 0) parts.push(`${counts.approved} approved`)
  parts.push(`${counts.needsReview} need your eye`, `${counts.blocked} blocked`)
  return parts.join(' · ')
}

export function scheduleLabel(counts: CutCounts): string {
  return `Schedule ${counts.passed} passed cuts`
}

'use client'

/**
 * The panels S3 is built from: the source card, the pipeline card, the cuts
 * grid, the loading skeletons and the preview dialog.
 *
 * DESIGN.md "Video card" fixes the anatomy of a cut card, and @mirrorline/ui
 * already implements it, so this file composes rather than redraws.
 */

import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  StatusChip,
  VideoCard,
  VideoThumb,
  ViewerPanel,
  cn,
} from '@mirrorline/ui'
import { Check, Clock, Loader2 } from 'lucide-react'
import * as React from 'react'

import type { CutView } from './cut-view'
import { UploadDropzone } from './upload-dropzone'
import {
  CUT_ACTIONS,
  PIPELINE_STEPS,
  PIPELINE_TITLE,
  SOURCE_VIDEO,
  STEP_STATE_WORDS,
  type CutStatus,
  type StepState,
  cutStatus,
  secondActionLabel,
  stepStateAt,
} from './upload-data'

/* -------------------------------------------------------------------------- */
/* Source card                                                                 */
/* -------------------------------------------------------------------------- */

export interface SourceCardProps {
  /** Hidden in the empty state: there is no source video yet. */
  showSource: boolean
}

export function SourceCard({ showSource }: SourceCardProps) {
  return (
    <Card as="section" aria-label="Source video" className="flex flex-1 flex-col gap-3.5">
      <UploadDropzone />

      {showSource ? (
        <div className="flex items-center gap-3.5">
          {/* The source's running time is a measurement, so it reads in the
              machine's voice. DESIGN.md "Typography": timings (0:24, 52:14)
              are Geist Mono. */}
          <span
            aria-hidden="true"
            className="machine flex h-[54px] w-24 shrink-0 items-center justify-center rounded-md bg-demo-teal text-caption text-demo-sand"
          >
            {SOURCE_VIDEO.lengthLabel}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body font-semibold text-text">{SOURCE_VIDEO.title}</span>
            <span className="text-meta text-text-muted">{SOURCE_VIDEO.meta}</span>
          </span>
        </div>
      ) : null}
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Pipeline card                                                               */
/* -------------------------------------------------------------------------- */

const STEP_TONES: Record<StepState, string> = {
  done: 'border-success/30 bg-success-soft text-on-success-soft',
  running: 'border-accent/40 bg-accent-soft text-on-accent-soft',
  waiting: 'border-border bg-surface-subtle text-text-muted',
}

interface StepIconProps {
  state: StepState
}

function StepIcon({ state }: StepIconProps) {
  if (state === 'done') {
    return <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
  }
  if (state === 'running') {
    return <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" strokeWidth={2} />
  }
  return <Clock aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
}

export interface PipelineCardProps {
  /** True while the Multiplier is still working. */
  isRunning: boolean
}

export function PipelineCard({ isRunning }: PipelineCardProps) {
  return (
    <Card as="section" aria-labelledby="pipeline-heading" className="flex flex-[2] flex-col gap-3.5">
      <h2 id="pipeline-heading" className="m-0 font-heading text-subtitle text-text">
        {isRunning ? PIPELINE_TITLE.running : PIPELINE_TITLE.done}
      </h2>
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 p-0">
        {PIPELINE_STEPS.map((step, index) => {
          const state = stepStateAt(index, isRunning)
          return (
            <li
              key={step.id}
              className={cn(
                'flex flex-col gap-1.5 rounded-md border p-3',
                STEP_TONES[state],
                state === 'running' && 'shimmer',
              )}
            >
              {/* The step's name is the studio naming a stage. */}
              <span className="inline-flex items-center gap-1.5 text-caption">
                <StepIcon state={state} />
                {/* The tick, the spinner and the clock differ by shape; this
                    makes the state a word as well. */}
                <span className="sr-only">{STEP_STATE_WORDS[state]}: </span>
                {step.name}
              </span>
              {/* Its detail is either what the Multiplier measured ("52 min,
                  word timings", "12 kept, 9:16", "9 · 2 · 1") or the name of
                  something the studio chose ("Maya's caption style"). Only the
                  first kind is the machine reporting, so only it goes mono. */}
              <span
                className={cn('text-caption font-normal', step.isMeasured && 'machine')}
              >
                {step.detail}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Cuts grid                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * DESIGN.md "Layout": "auto-fill grids of 172px-minimum cards for videos".
 * The gap tightened by one step from the marketing rhythm — DESIGN.md puts
 * card gaps at 16–24px and the studio sits at the near end of that band.
 */
const CUT_GRID_CLASSES = 'grid grid-cols-[repeat(auto-fill,minmax(172px,1fr))] gap-3.5 sm:gap-4'

/**
 * DESIGN.md "Motion — Stagger": "up to about six items. Past that it stops
 * feeling like one gesture." Cuts seven and beyond land with the sixth.
 */
const STAGGER_CEILING = 5

export interface CutGridProps {
  cuts: readonly CutView[]
  approvedIds: readonly string[]
  onToggleApprove: (cutId: string) => void
  onPreview: (cut: CutView) => void
}

export function CutGrid({ cuts, approvedIds, onToggleApprove, onPreview }: CutGridProps) {
  return (
    // DESIGN.md "Colors — Viewer": "Every 9:16 frame — the preview, the
    // approvals queue, the player — sits on the viewer surface, and it is the
    // same near-black in both themes." The cuts grid is the approvals queue,
    // so it is a lightbox holding a contact sheet: the cards keep their own
    // surface and every frame is judged against the same near-black, whichever
    // theme the person approving it happens to be using.
    <ViewerPanel as="section" aria-label="Cuts" className={cn('gap-0', CUT_GRID_CLASSES)}>
      {cuts.map((cut, index) => {
        const isApproved = approvedIds.includes(cut.id)
        const status = cutStatus(cut, isApproved)
        return (
          <VideoCard
            key={cut.id}
            selected={isApproved}
            // DESIGN.md "Motion — Stagger": 60ms a step, capped at the sixth,
            // so twelve cuts still land as one gesture rather than a cascade.
            className="log-in stagger"
            style={{ '--index': Math.min(index, STAGGER_CEILING) } as React.CSSProperties}
            thumb={{
              caption: cut.hook,
              index: cut.index - 1,
              length: cut.lengthLabel,
              cutNumber: cut.index,
            }}
            // The hook is already burned into the frame, exactly as it will
            // look on the platform. Repeating it under the card would say the
            // same thing twice, so the card's heading keeps the text for
            // assistive technology and leaves the picture to carry it.
            title={<span className="sr-only">{cut.hook}</span>}
            format={cut.format}
            score={cut.score}
            status={status}
            reason={cut.complianceReason ?? undefined}
            actions={
              <CutActions
                cut={cut}
                status={status}
                onToggleApprove={onToggleApprove}
                onPreview={onPreview}
              />
            }
          />
        )
      })}
    </ViewerPanel>
  )
}

interface CutActionsProps {
  cut: CutView
  status: CutStatus
  onToggleApprove: (cutId: string) => void
  onPreview: (cut: CutView) => void
}

/**
 * Two 44px buttons that still fit inside a 172px card. `press` is DESIGN.md
 * "Motion — Press": a 3% dip on :active, fine pointers only, dropped under
 * prefers-reduced-motion.
 */
const CARD_BUTTON_CLASSES = 'press min-w-0 flex-1 px-2'

function CutActions({ cut, status, onToggleApprove, onPreview }: CutActionsProps) {
  const secondLabel = secondActionLabel(status)
  const isApprovalAction = status === 'passed' || status === 'approved'

  return (
    <>
      <Button
        variant="secondary"
        className={CARD_BUTTON_CLASSES}
        onClick={() => onPreview(cut)}
        aria-label={`${CUT_ACTIONS.preview} cut ${cut.index}`}
      >
        {CUT_ACTIONS.preview}
      </Button>
      <Button
        variant={status === 'passed' ? 'primary' : 'secondary'}
        size="md"
        className={CARD_BUTTON_CLASSES}
        onClick={() => (isApprovalAction ? onToggleApprove(cut.id) : onPreview(cut))}
        aria-label={`${secondLabel} cut ${cut.index}`}
      >
        {secondLabel}
      </Button>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Loading skeletons                                                           */
/* -------------------------------------------------------------------------- */

export interface CutSkeletonGridProps {
  count: number
}

/** The `.shimmer` utility from theme.css; 02_BRAND_AND_VOICE calls for it. */
export function CutSkeletonGrid({ count }: CutSkeletonGridProps) {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="m-0 text-body text-text-muted">
        Making {count} cuts. This usually takes about 3 minutes.
      </p>
      <div aria-hidden="true" className={CUT_GRID_CLASSES}>
        {Array.from({ length: count }, (_unused, index) => (
          <Card key={index} padding="none" className="flex flex-col gap-2.5 p-2.5">
            <span className="shimmer block aspect-[9/16] rounded-md bg-surface-subtle" />
            <span className="shimmer block h-4 w-11/12 rounded-sm bg-surface-subtle" />
            <span className="shimmer block h-3 w-2/3 rounded-sm bg-surface-subtle" />
            <span className="shimmer block h-9 w-full rounded-md bg-surface-subtle" />
          </Card>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Preview dialog                                                              */
/* -------------------------------------------------------------------------- */

export interface CutPreviewDialogProps {
  /** The cut being looked at, or null when the dialog is closed. */
  cut: CutView | null
  isApproved: boolean
  onOpenChange: (open: boolean) => void
}

const PASSED_EXPLANATION = 'This cut passed every compliance check.'

export function CutPreviewDialog({ cut, isApproved, onOpenChange }: CutPreviewDialogProps) {
  if (!cut) return null

  const status = cutStatus(cut, isApproved)

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-4">
        <DialogTitle>Cut {cut.index}</DialogTitle>
        <DialogDescription>{cut.complianceReason ?? PASSED_EXPLANATION}</DialogDescription>
        <div className="flex flex-wrap gap-4">
          {/* The player. DESIGN.md "Viewer panel": "a near-black lightbox
              holding the 9:16 frame, in both themes". */}
          <ViewerPanel className="shrink-0 items-center">
            {/* A cut the engine rendered has a file behind it, so it plays.
                A demo cut has only a painted frame, and showing a dead player
                for it would promise something that is not there. */}
            {cut.videoUrl ? (
              <video
                src={cut.videoUrl}
                controls
                playsInline
                preload="metadata"
                aria-label={`Cut ${cut.index}: ${cut.hook}`}
                className="aspect-[9/16] w-[150px] rounded-thumb bg-black"
              />
            ) : (
              <VideoThumb
                caption={cut.hook}
                index={cut.index - 1}
                length={cut.lengthLabel}
                cutNumber={cut.index}
                className="w-[150px]"
              />
            )}
          </ViewerPanel>
          <div className="flex min-w-[180px] flex-1 flex-col items-start gap-2.5">
            <p className="m-0 font-heading text-subtitle text-text">{cut.hook}</p>
            {/* The format is a name the studio gave this kind of cut; the score
                and the length are measurements, so only those two go mono. */}
            <p className="m-0 text-meta text-text-muted">
              {cut.format} · score <span className="machine">{cut.score}</span> ·{' '}
              <span className="machine">{cut.lengthLabel}</span>
            </p>
            <StatusChip status={status} />
          </div>
        </div>
        <DialogClose asChild>
          <Button variant="secondary" className="press self-start">
            Close
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

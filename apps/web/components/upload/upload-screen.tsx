'use client'

/**
 * S3 · Upload and multiply.
 *
 * 03_SCREENS_SPEC: "show the core magic: one video becomes many." The screen
 * reads top to bottom as the story: here is the source, here is what the
 * Multiplier did, here are the twelve cuts and what each one needs.
 *
 * The demo state lives in the `?state=` query param rather than in React
 * state, so every required screenshot — ready, empty, loading, error — has a
 * URL an end-to-end test can open directly.
 */

import type { Cut } from '@mirrorline/mock'
import { cuts as allCuts } from '@mirrorline/mock'
import { AlertBar, Button, EmptyState, Eyebrow, PageHeader, SegmentedControl } from '@mirrorline/ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'

import {
  CutGrid,
  CutPreviewDialog,
  CutSkeletonGrid,
  PipelineCard,
  SourceCard,
} from './upload-panels'
import {
  ALL_CUTS_FILTER_ID,
  CUT_FILTERS,
  DEMO_STATE_ITEMS,
  DEMO_STATE_PARAM,
  EMPTY_COPY,
  ERROR_COPY,
  UPLOAD_HEADER,
  type DemoState,
  countCuts,
  cutsForFilter,
  scheduleLabel,
  summaryLine,
} from './upload-data'

export interface UploadScreenProps {
  /** Already validated by the page; one of the four demo states. */
  state: DemoState
}

export function UploadScreen({ state }: UploadScreenProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [filterId, setFilterId] = React.useState<string>(ALL_CUTS_FILTER_ID)
  const [approvedIds, setApprovedIds] = React.useState<readonly string[]>([])
  const [previewCut, setPreviewCut] = React.useState<Cut | null>(null)

  const counts = countCuts(approvedIds)
  const isReady = state === 'ready'
  const isLoading = state === 'loading'
  const isEmpty = state === 'empty'
  const isError = state === 'error'

  function goToState(next: string): void {
    router.replace(`${pathname}?${DEMO_STATE_PARAM}=${next}`, { scroll: false })
  }

  function toggleApprove(cutId: string): void {
    // Replace the list rather than mutate it, so nothing else holding the
    // previous array sees it change underneath.
    setApprovedIds((previous) =>
      previous.includes(cutId)
        ? previous.filter((candidate) => candidate !== cutId)
        : [...previous, cutId],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={UPLOAD_HEADER.eyebrow}
        title={UPLOAD_HEADER.title}
        action={
          isReady ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span role="status" className="text-label font-normal text-text-muted">
                {summaryLine(counts)}
              </span>
              <Button asChild variant="primary">
                <Link href="/app/calendar">{scheduleLabel(counts)}</Link>
              </Button>
            </div>
          ) : null
        }
      />

      <DemoStateSwitcher state={state} onChange={goToState} />

      {isError ? (
        <AlertBar
          title={ERROR_COPY.title}
          description={ERROR_COPY.description}
          action={
            <Button variant="primary" onClick={() => goToState('ready')}>
              {ERROR_COPY.retryLabel}
            </Button>
          }
        />
      ) : null}

      <div className="flex flex-wrap items-stretch gap-5">
        <SourceCard showSource={!isEmpty && !isError} />
        {isReady || isLoading ? <PipelineCard isRunning={isLoading} /> : null}
      </div>

      {isReady ? (
        <SegmentedControl
          label="Filter cuts by format"
          value={filterId}
          onValueChange={setFilterId}
          className="max-w-full flex-wrap"
          items={CUT_FILTERS.map((filter) => ({ value: filter.id, label: filter.label }))}
        />
      ) : null}

      {isReady ? (
        <CutGrid
          cuts={cutsForFilter(filterId)}
          approvedIds={approvedIds}
          onToggleApprove={toggleApprove}
          onPreview={setPreviewCut}
        />
      ) : null}

      {isLoading ? <CutSkeletonGrid count={allCuts.length} /> : null}

      {isEmpty ? <EmptyState title={EMPTY_COPY.title} description={EMPTY_COPY.description} /> : null}

      <CutPreviewDialog
        cut={previewCut}
        isApproved={previewCut !== null && approvedIds.includes(previewCut.id)}
        onOpenChange={(open) => {
          if (!open) setPreviewCut(null)
        }}
      />
    </div>
  )
}

interface DemoStateSwitcherProps {
  state: DemoState
  onChange: (next: string) => void
}

/**
 * A labelled control for the four states this screen has to be able to show.
 * It ships with the demo on purpose, so a reviewer can reach every state
 * without a build flag; the eyebrow says plainly what it is.
 */
function DemoStateSwitcher({ state, onChange }: DemoStateSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Eyebrow>Demo state</Eyebrow>
      <SegmentedControl
        label="Demo state"
        value={state}
        onValueChange={onChange}
        items={DEMO_STATE_ITEMS.map((item) => ({ value: item.value, label: item.label }))}
      />
    </div>
  )
}

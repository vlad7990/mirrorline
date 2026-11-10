'use client'

/**
 * The drop target on S3.
 *
 * It is a real `<input type="file">` with a real `<label>`, visually hidden
 * but still in the tab order, so the zone works from the keyboard exactly as
 * it does from a mouse. The dashed panel is the label's visible body and
 * picks up the focus ring through the `peer` relationship.
 *
 * Nothing is uploaded. CLAUDE.md keeps this build on mock data, so a dropped
 * file only drives the simulated progress line below the zone.
 */

import { ProgressBar, cn } from '@mirrorline/ui'
import Link from 'next/link'
import * as React from 'react'

import { DROPZONE_COPY, ERROR_COPY } from './upload-data'

/** Steps the simulated read takes, and how long each one waits. */
const PROGRESS_STEP = 8
const PROGRESS_INTERVAL_MS = 110
const PROGRESS_COMPLETE = 100
const ACCEPTED_TYPE_PREFIX = 'video/'

type ReadState = 'idle' | 'reading' | 'done' | 'rejected'

interface FileReadStatus {
  readonly state: ReadState
  readonly fileName: string
  readonly percent: number
}

const IDLE_STATUS: FileReadStatus = { state: 'idle', fileName: '', percent: 0 }

export function UploadDropzone() {
  const inputId = React.useId()
  const [isDragging, setIsDragging] = React.useState(false)
  const [status, setStatus] = React.useState<FileReadStatus>(IDLE_STATUS)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  React.useEffect(() => stopTimer, [stopTimer])

  const startRead = React.useCallback(
    (file: File) => {
      stopTimer()

      // Validate at the boundary: a dropped file can be anything at all.
      if (!file.type.startsWith(ACCEPTED_TYPE_PREFIX)) {
        setStatus({ state: 'rejected', fileName: file.name, percent: 0 })
        return
      }

      setStatus({ state: 'reading', fileName: file.name, percent: 0 })
      timerRef.current = setInterval(() => {
        setStatus((previous) => {
          if (previous.state !== 'reading') return previous
          const next = previous.percent + PROGRESS_STEP
          if (next >= PROGRESS_COMPLETE) {
            stopTimer()
            return { ...previous, state: 'done', percent: PROGRESS_COMPLETE }
          }
          return { ...previous, percent: next }
        })
      }, PROGRESS_INTERVAL_MS)
    },
    [stopTimer],
  )

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files.item(0)
    if (file) startRead(file)
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.item(0)
    if (file) startRead(file)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The peer sits before the panel so the panel can show its focus. */}
      <input
        id={inputId}
        type="file"
        accept="video/*"
        className="peer sr-only"
        onChange={handleChange}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg p-4 text-center',
          'border-2 border-dashed border-border-strong bg-background',
          'transition-colors duration-150',
          isDragging && 'border-primary bg-accent-soft',
          'peer-focus-visible:outline peer-focus-visible:outline-2',
          'peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
        )}
      >
        <label
          htmlFor={inputId}
          className="flex min-h-11 cursor-pointer items-center text-body font-semibold text-text"
        >
          {DROPZONE_COPY.title}
        </label>
        <p className="m-0 text-meta text-text-muted">
          {DROPZONE_COPY.importPrefix}
          <Link
            href="/app/settings"
            className="font-semibold text-primary underline underline-offset-4 dark:text-accent"
          >
            {DROPZONE_COPY.importLabel}
          </Link>
        </p>
      </div>

      <FileReadLine status={status} />
    </div>
  )
}

interface FileReadLineProps {
  status: FileReadStatus
}

/**
 * What happened to the file you just dropped, in one honest line.
 *
 * SC 4.1.3: both regions are mounted from the first render, before there is
 * anything to say. A live region that appears at the same moment as its text
 * is usually missed, and `role="progressbar"` announces nothing by itself.
 * Progress is polite; a rejected file is an alert, because the person has to
 * do something about it.
 */
function FileReadLine({ status }: FileReadLineProps) {
  const isReading = status.state === 'reading' || status.state === 'done'
  const isDone = status.state === 'done'

  return (
    <div className="flex flex-col gap-1.5">
      <div role="status" aria-live="polite" className="flex flex-col gap-1.5">
        {isReading ? (
          <>
            <p className="m-0 text-meta text-text-muted">
              {isDone ? 'Read' : 'Reading'} {status.fileName}. {DROPZONE_COPY.note}
            </p>
            <ProgressBar
              label={`Reading ${status.fileName}`}
              value={status.percent}
              valueText={`${status.percent}% read`}
            />
          </>
        ) : null}
      </div>

      <div role="alert">
        {status.state === 'rejected' ? (
          <p className="m-0 text-meta font-semibold text-on-danger-soft">
            {ERROR_COPY.title} {ERROR_COPY.description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

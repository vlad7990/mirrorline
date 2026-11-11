'use client'

/**
 * Live mode: a real upload, a real run, real cuts.
 *
 * The engine only runs where its binaries are, so this component asks
 * `/api/engine/status` first and renders nothing at all when the answer is
 * no. On a Vercel preview that is always the answer, and the screen keeps
 * its demo states. Nothing here pretends the engine is present.
 *
 * Polling rather than streaming: a run is minutes long and a poll every two
 * seconds costs one small JSON read. A socket would be a lot of machinery to
 * save very little.
 */

import { AlertBar, Button, Card } from '@mirrorline/ui'
import * as React from 'react'

import {
  useEngineAvailability,
  useEngineJob,
  type EngineJobResult,
} from '@/lib/engine/use-engine-job'

const RIGHTS_LABEL =
  'I own this footage, or I hold a written licence for it, and I can show the record.'

/**
 * Unchanged for callers. The submit-and-poll machinery moved to
 * `useEngineJob` when the public hero needed the same thing; what is left
 * here is this screen's form, which was never the shared part.
 */
export type EngineLiveResult = EngineJobResult

export interface EngineLiveProps {
  /** Raised when a run finishes, so the screen can show its cuts. */
  onResult: (result: EngineLiveResult | null) => void
}

export function EngineLive({ onResult }: EngineLiveProps) {
  const availability = useEngineAvailability()
  const job = useEngineJob()
  const [file, setFile] = React.useState<File | null>(null)
  const [transcript, setTranscript] = React.useState<File | null>(null)
  const [rightsHolder, setRightsHolder] = React.useState('')
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false)
  const inputId = React.useId()
  const holderId = React.useId()
  const scriptId = React.useId()

  // The hook owns the result; this screen only forwards it up. Keyed on the
  // result identity, which changes once per run, so the parent is not told
  // the same thing on every poll.
  const { result } = job
  React.useEffect(() => {
    if (result) onResult(result)
  }, [result, onResult])

  async function start(event: React.FormEvent) {
    event.preventDefault()
    if (file === null) return

    onResult(null)
    await job.start({ video: file, transcript, rightsConfirmed, rightsHolder })
  }

  // Still asking, or the engine is not here. Either way there is nothing to
  // offer, and the screen's demo states carry on as before.
  if (availability === null || !availability.available) return null

  const { error, isRunning } = job
  const canStart = file !== null && rightsConfirmed && rightsHolder.trim() !== '' && !isRunning

  return (
    <Card as="section" aria-labelledby="engine-live-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="engine-live-heading" className="m-0 font-heading text-subtitle text-text">
          Run the engine on your own video
        </h2>
        <p className="m-0 text-meta text-text-muted">
          This runs locally, on this machine. The cuts below are made by the real engine, not by
          the sample data.
        </p>
      </div>

      {error ? <AlertBar title="The run did not finish" description={error} /> : null}

      <form className="flex flex-col gap-4" onSubmit={start}>
        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-label font-semibold text-text">
            Your video
          </label>
          <input
            id={inputId}
            type="file"
            accept="video/*"
            disabled={isRunning}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-meta text-text-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-2 file:text-label file:font-semibold file:text-text"
          />
        </div>

        {/* Optional, and the difference between a run that works and one that
            stops, on a machine with no Whisper model. The engine will not
            invent words, so with no model and no script there is nothing to
            cut on. */}
        <div className="flex flex-col gap-2">
          <label htmlFor={scriptId} className="text-label font-semibold text-text">
            Transcript{' '}
            <span className="font-normal text-text-muted">
              (optional, needed when no speech model is installed)
            </span>
          </label>
          <input
            id={scriptId}
            type="file"
            accept=".txt,.json"
            disabled={isRunning}
            onChange={(event) => setTranscript(event.target.files?.[0] ?? null)}
            className="text-meta text-text-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-2 file:text-label file:font-semibold file:text-text"
          />
          <p className="m-0 text-meta text-text-muted">
            A plain <span className="machine">.txt</span> script, or a word-level{' '}
            <span className="machine">.transcript.json</span>. Timings from a plain script are
            spread evenly, and the summary says so.
          </p>
        </div>

        {/* CLAUDE.md non-negotiable 1. The API refuses without both of these,
            so the form asks for them rather than letting the server say no. */}
        <div className="flex flex-col gap-2">
          <label htmlFor={holderId} className="text-label font-semibold text-text">
            Who owns it
          </label>
          <input
            id={holderId}
            type="text"
            value={rightsHolder}
            disabled={isRunning}
            placeholder="Maya Torres Coaching"
            onChange={(event) => setRightsHolder(event.target.value)}
            className="h-touch rounded-md border border-border-strong bg-surface px-3 text-body text-text placeholder:text-text-muted"
          />
        </div>

        <label className="flex items-start gap-2.5 text-meta text-text">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            disabled={isRunning}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
            className="mt-0.5 size-4 shrink-0"
          />
          {RIGHTS_LABEL}
        </label>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" className="press" disabled={!canStart}>
            {isRunning ? 'Running' : 'Make cuts'}
          </Button>
          {isRunning ? (
            <span role="status" className="text-meta text-text-muted">
              Transcribing, finding moments, cutting and captioning. Minutes, not seconds.
            </span>
          ) : null}
        </div>

        {/* No progress bar. The engine reports nothing between "started" and
            "finished", so a bar here would be an animation pretending to be a
            measurement. The status line above says what is happening and that
            it takes minutes, which is the true amount we know. */}
      </form>
    </Card>
  )
}

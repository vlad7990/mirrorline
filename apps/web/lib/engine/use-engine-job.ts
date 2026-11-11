'use client'

/**
 * Submitting a run and watching it, in one place.
 *
 * Two screens need this now — the studio's live upload panel and the public
 * hero control borrowed from OpusClip and Vizard
 * (docs/design/COMPETITOR_REFERENCES.md §2.1). Both ask the same three
 * questions: is the engine here, did my upload start, and is it done yet.
 * Before this hook, the answer lived inside `EngineLive` and a second copy
 * would have had to repeat the polling, the cleanup and the error paths.
 *
 * Polling rather than streaming, for the reason `EngineLive` already gave: a
 * run is minutes long and a poll every two seconds costs one small JSON read.
 * A socket is a lot of machinery to save very little.
 */

import * as React from 'react'

import { toCutView, type CutView, type EngineCutWithUrl } from '@/components/upload/cut-view'

import type { EngineJobState, EngineSummary } from './types'

const POLL_MS = 2000

export interface EngineAvailability {
  readonly available: boolean
  readonly reason: string
}

export type EngineSummaryWithUrls = Omit<EngineSummary, 'cuts'> & {
  cuts: EngineCutWithUrl[]
}

interface JobResponse {
  readonly id: string
  readonly state: EngineJobState
  readonly sourceName: string
  readonly error: string | null
  readonly summary: EngineSummaryWithUrls | null
}

export interface EngineJobResult {
  readonly cuts: readonly CutView[]
  readonly summary: EngineSummaryWithUrls
}

/** What `start` needs. The rights fields are not optional — see below. */
export interface StartJobInput {
  readonly video: File
  /** An optional `script.txt`/`.json` sidecar, when the caller offers one. */
  readonly transcript?: File | null
  /**
   * CLAUDE.md non-negotiable 1: only client-owned material. Both of these are
   * required by `/api/engine/jobs`, and the hook does not default them — a
   * caller that forgets has to be told by the API, not quietly allowed.
   */
  readonly rightsConfirmed: boolean
  readonly rightsHolder: string
}

/**
 * Does this deployment have the engine behind it?
 *
 * `null` while the question is still out. Callers must distinguish that from
 * `{ available: false }`: the first means "do not render a verdict yet", the
 * second means "there is genuinely no engine here", which is the normal state
 * on a Vercel preview.
 */
export function useEngineAvailability(): EngineAvailability | null {
  const [availability, setAvailability] = React.useState<EngineAvailability | null>(null)

  React.useEffect(() => {
    let cancelled = false

    fetch('/api/engine/status')
      .then((response) => response.json() as Promise<EngineAvailability>)
      .then((result) => {
        if (!cancelled) setAvailability(result)
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability({ available: false, reason: 'the status check did not answer.' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return availability
}

export interface UseEngineJob {
  /** `null` before the first run. */
  readonly state: EngineJobState | null
  readonly error: string | null
  /** Set once, when a run finishes. */
  readonly result: EngineJobResult | null
  readonly isRunning: boolean
  readonly start: (input: StartJobInput) => Promise<void>
  /** Back to the state before any run, so the form can be used again. */
  readonly reset: () => void
}

export function useEngineJob(): UseEngineJob {
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [state, setState] = React.useState<EngineJobState | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<EngineJobResult | null>(null)

  React.useEffect(() => {
    if (jobId === null) return undefined

    let cancelled = false
    const timer = setInterval(() => {
      void fetch(`/api/engine/jobs/${jobId}`)
        .then((response) => response.json() as Promise<JobResponse>)
        .then((job) => {
          if (cancelled) return
          setState(job.state)

          if (job.state === 'done' && job.summary) {
            const summary = job.summary
            setResult({ cuts: summary.cuts.map((cut) => toCutView(cut, jobId)), summary })
            setJobId(null)
            return
          }
          if (job.state === 'failed') {
            setError(job.error ?? 'the run failed and said nothing about why.')
            setJobId(null)
          }
        })
        .catch(() => {
          if (!cancelled) setError('lost contact with the run.')
        })
    }, POLL_MS)

    // Clears on every exit path, including unmounting mid-run.
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [jobId])

  const start = React.useCallback(async (input: StartJobInput) => {
    setError(null)
    setResult(null)

    const body = new FormData()
    body.set('video', input.video)
    if (input.transcript) body.set('transcript', input.transcript)
    body.set('rightsConfirmed', String(input.rightsConfirmed))
    body.set('rightsHolder', input.rightsHolder)

    try {
      const response = await fetch('/api/engine/jobs', { method: 'POST', body })
      const payload = (await response.json()) as { jobId?: string; error?: string }

      if (!response.ok || !payload.jobId) {
        setError(payload.error ?? `the upload was refused (${response.status}).`)
        return
      }

      setJobId(payload.jobId)
      setState('running')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [])

  const reset = React.useCallback(() => {
    setJobId(null)
    setState(null)
    setError(null)
    setResult(null)
  }, [])

  return { state, error, result, isRunning: jobId !== null && state === 'running', start, reset }
}

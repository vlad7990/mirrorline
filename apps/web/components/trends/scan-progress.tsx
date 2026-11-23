'use client'

import { AlertBar } from '@mirrorline/ui'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { SCAN_ETA_MINUTES, isJobPending, type JobSummary } from '@/lib/jobs/types'

/**
 * What the Niche Scan is doing right now (D119).
 *
 * The scan moved off the request — the button writes a job and returns in
 * milliseconds, and a worker takes four to six minutes (D118). That makes this
 * panel the *only* thing standing between the client and a screen that looks
 * like the press did nothing.
 *
 * ============================================================================
 * Polling, and why it is a refresh rather than a fetch
 * ============================================================================
 *
 * `router.refresh()` re-runs the server render, so one poll updates **both**
 * halves of this screen at once: this panel's status and, when the scan lands,
 * the report and the format cards below it. A `fetch` of a job endpoint would
 * have told us the job was done and left the report unfetched, which means a
 * second mechanism and a window in which the two disagree.
 *
 * It stops as soon as the job stops being pending. An interval that outlives
 * its reason is a page that re-renders every ten seconds forever.
 *
 * **Ten seconds, not one.** The thing being waited for takes minutes, so a
 * faster poll buys nothing a reader can perceive and costs a server render
 * plus a database read every time. Ten is frequent enough that the report
 * never feels stale and slow enough to be free.
 *
 * ============================================================================
 * Three endings, and only one of them is red
 * ============================================================================
 *
 * - **Refused** is the spend cap declining, and it renders as *information*.
 *   `18 §6` wants the cap visible precisely so it can be trusted, and styling
 *   a working ceiling as a fault teaches the reader the opposite.
 * - **Failed** is ours, and only once the retries are spent. A failed attempt
 *   with a retry left is still pending — `isJobPending` knows — because
 *   showing an error for a scan that succeeds a minute later is worse than
 *   showing nothing.
 * - **Complete** renders nothing at all. The report is the result and it is
 *   already on the screen below; a banner saying "done" above it would be
 *   telling the reader something the page is already showing them.
 */

/** Long enough to be free, short enough that the report never feels stale. */
const POLL_MS = 10_000

export interface ScanProgressProps {
  /** Null when nothing has ever been queued for this workspace. */
  readonly job: JobSummary | null
  /**
   * The job read failed — which is **not** the same as no scan running.
   *
   * Said out loud because the alternative is dangerous: a failed read
   * rendering as "nothing is running" re-enables the button, the client
   * presses it, and a second scan is billed for one report.
   */
  readonly readFailed: boolean
}

export function ScanProgress({ job, readFailed }: ScanProgressProps) {
  const router = useRouter()
  const isPending = job !== null && isJobPending(job)

  React.useEffect(() => {
    if (!isPending) return

    const timer = setInterval(() => router.refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [isPending, router])

  if (readFailed) {
    return (
      <AlertBar
        aria-label="Scan status unavailable"
        description="This is about our request, not about your scan. If one is running it is still running; reload in a moment."
        role="region"
        title="We could not check whether a scan is running."
        tone="warning"
      />
    )
  }

  if (job === null) return null

  if (isPending) {
    return (
      <AlertBar
        aria-label="Scan in progress"
        /*
         * "Usually" is carrying real weight. It is what makes a seven-minute
         * scan a slow one rather than a broken one, and it is honest: the two
         * runs we have measured took six minutes and four.
         *
         * No progress bar and no percentage. One model call has no
         * intermediate state to report from, so any bar here would be an
         * animation pretending to be a measurement.
         */
        description={`Usually about ${SCAN_ETA_MINUTES} minutes. The Trend Scout is searching the open web and writing up what it finds — you can leave this page and come back, and this one updates on its own.`}
        role="status"
        title="Scanning your niche…"
        tone="info"
      />
    )
  }

  if (job.outcome === 'refused') {
    return (
      <AlertBar
        aria-label="Scan not run"
        /*
         * The cap's own sentence, not ours. `runNicheScan` wrote the reason it
         * refused, and paraphrasing it here would create a second answer to
         * "why did this not run" that can drift from the ledger's.
         */
        description={
          job.error ??
          'Your agent spend cap for this month is reached. Nothing was spent on this request.'
        }
        role="region"
        title="This scan did not run, and that is the cap working."
        tone="info"
      />
    )
  }

  if (job.status === 'failed') {
    return (
      <AlertBar
        aria-label="Scan failed"
        description={`${job.error ?? 'The scan stopped before it finished.'} Nothing was saved, and you can run it again.`}
        role="region"
        title="The scan did not finish."
        tone="warning"
      />
    )
  }

  // Complete. The report below is the result; a banner would be noise.
  return null
}

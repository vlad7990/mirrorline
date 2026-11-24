import { AlertBar, EmptyState, PageHeader } from '@mirrorline/ui'
import { Info } from 'lucide-react'
import type { Metadata } from 'next'

import { runNicheScanAction, saveClientProfileAction } from '@/app/app/(studio)/trends/actions'
import { approveDraft } from '@/app/app/(studio)/trends/draft-actions'
import { ClientProfileForm } from '@/components/trends/client-profile-form'
import { DraftDecisions } from '@/components/trends/draft-decisions'
import { NicheReportPanel } from '@/components/trends/niche-report-panel'
import { RunScanForm } from '@/components/trends/run-scan-form'
import { ScanProgress } from '@/components/trends/scan-progress'
import { readReportDrafts } from '@/lib/drafts/read-drafts'
import { readLatestScanJob } from '@/lib/jobs/read-scan-job'
import { isJobPending } from '@/lib/jobs/types'
import { SAMPLE_REPORT } from '@/lib/niche-scan/canned'
import { isProfileEmpty } from '@/lib/workspace/client-profile'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'
import { readClientProfile } from '@/lib/workspace/read-client-profile'
import { readLatestNicheReport } from '@/lib/workspace/read-niche-report'

/**
 * S4 · Niche Scan.
 *
 * Renamed from "Trend board" in v4 under 16 §5. The screen never really was a
 * trending list — Trend Scout researches the account's own niche and the ones
 * beside it, and what comes back is a set of recipes with a fit score. Calling
 * it Trends invited the comparison with every tool that shows you what is
 * popular, which is the comparison P2 and P5 exist to refuse.
 *
 * ## One format view, and copy that matches what we measure (P0, D121)
 *
 * The screen rendered the formats **twice**: the report's own grid, and a
 * board of `TrendCard`s built from the same rows underneath it, behind a
 * filter bar. A reader counted six formats at the top and three at the bottom
 * and had no way of knowing it was one piece of research. The board's two
 * good parts — the storyboard and the fit bar — moved into the report card,
 * and the rest went, filters included: a control that filters three formats
 * by platform and by a time window we do not measure is furniture.
 *
 * The header claimed "Formats rising in your niche … Growth over 7 days"
 * above cards every one of which read "Not measured yet". We run no
 * growth measurement at all — the scan reads public posts and published
 * guides — so the copy now says that instead. `15 §honesty rules`.
 *
 * Every format is a recipe drawn as empty frames. CLAUDE.md non-negotiables 1
 * and 2: we never hold anyone else's footage, and a remake copies the format
 * only.
 */

export const metadata: Metadata = { title: 'Niche Scan' }

export default async function TrendsPage() {
  // Null means the read failed, which the panel's three-state branch below
  // renders as our problem rather than as an empty niche.
  const reportResult = await readLatestNicheReport()

  // Only for the form's default value. The *action* takes the workspace from
  // `getOwnedWorkspace()` itself rather than trusting anything rendered here —
  // a scan spends money, so the id it spends against is never a round trip
  // through the browser.
  const workspace = await getOwnedWorkspace()

  // The client's own facts, as the signed-in user. Empty is an ordinary
  // answer: the form asks for them and the report says what it cost not to
  // have them.
  const profile = await readClientProfile()

  /*
   * Is a scan running? (D119)
   *
   * Null is "we could not tell", which is **not** "nothing is running" — and
   * the difference is the one that costs money. Treating a failed read as an
   * idle workspace re-enables the button, and the next press buys a second
   * six-minute scan for a report already on its way. So the uncertainty is
   * passed down intact and `ScanProgress` says so on the screen.
   */
  const jobRead = await readLatestScanJob()
  const scanJob = jobRead?.job ?? null
  const isScanPending = scanJob !== null && isJobPending(scanJob)

  /*
   * The drafts this report produced, refused ones included (V3, D129).
   *
   * Empty for a sample report and for anything scanned before D129 — there is
   * no report id to hang them off, and inventing one would be worse than an
   * absent panel. Null is a failed read and renders as such: a blocked draft
   * hidden behind "no drafts" is exactly the invisibility `04 §4` forbids.
   */
  const reportId = reportResult?.report?.id ?? ''
  const drafts = reportId === '' ? [] : await readReportDrafts(reportId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        // "updated 10:05 am" was a hard-coded string in a header above live
        // research. The scan's own timestamp is printed on the report, where
        // it is true; the eyebrow names the agent and stops there.
        eyebrow="Create · Trend Scout agent"
        title="Niche Scan"
        description="Formats working in your niche, from public posts and guides found this week."
      />

      {/* CLAUDE.md non-negotiables 1 and 2, said plainly and up front. */}
      <AlertBar
        tone="info"
        role="region"
        aria-label="How remakes work"
        title={
          <>
            <Info
              aria-hidden="true"
              className="mr-2 inline size-[18px] align-[-3px]"
              strokeWidth={2}
            />
            We remake the format, never the footage.
          </>
        }
        description="Each card is a recipe of beats, not someone else's video. Every remake gets a new script, your footage and a compliance check."
      />

      {/*
        V2 · the brief, above the button that spends it.

        The profile is what makes a scan about this business rather than about
        the niche in general: the fit scores are argued from it, and "Your
        first 3 videos" is written from it — and cannot be written at all
        without it, because every draft would fail the fact check. So it sits
        directly above the control it changes rather than two screens away in
        Settings.
      */}
      <ClientProfileForm
        action={saveClientProfileAction}
        isEmpty={isProfileEmpty(profile)}
        profile={profile}
      />

      {/*
        V1 · the trigger, above the thing it produces. The scan is the only
        reason any of the rest of this screen has content, and until now the
        only way to start one was to call the action from code.
      */}
      <RunScanForm
        action={runNicheScanAction}
        defaultNiche={reportResult?.report?.niche ?? workspace?.niche ?? ''}
        /*
         * Disabled while one is running, and the reason is the bill rather
         * than tidiness. The form's own `isPending` only covers the
         * milliseconds the enqueue takes; the scan itself runs for minutes
         * afterwards, in another process, and for all of them this button
         * would otherwise look ready to be pressed again.
         */
        isScanRunning={isScanPending}
      />

      {/*
        V1 · what the scan is doing, between the trigger and its result —
        which is where a reader looks after pressing the button (D119).
      */}
      <ScanProgress job={scanJob} readFailed={jobRead === null} />

      {/*
        V1 · the niche report. Above the recipe cards, because the report is
        what the scan produced and the cards are what we would make from it.

        Three states, kept distinct on purpose (D110, B2.4's lesson): a real
        report renders plainly; no scan yet renders the labelled sample so the
        screen is never empty for a new workspace; a failed read says so
        rather than rendering "no formats", which would read as a claim about
        the client's niche instead of about our request.
      */}
      {reportResult === null ? (
        <AlertBar
          aria-label="Niche report unavailable"
          description="This is about our request, not about your niche. Reload in a moment."
          role="region"
          title="We could not load your niche report just now."
          tone="warning"
        />
      ) : (
        <NicheReportPanel
          // The cover names the client (D122). Read here rather than in the
          // panel: the page already holds the workspace, and a component that
          // fetches its own identity is a component that cannot be previewed.
          clientName={workspace?.name}
          findings={reportResult.report?.findings ?? SAMPLE_REPORT}
          isSample={reportResult.report === null}
          niche={reportResult.report?.niche}
          scannedAt={reportResult.report?.completedAt ?? reportResult.report?.createdAt}
        />
      )}

      {/*
        V3 · the gate's decisions, directly under the report that produced
        them. Below rather than inside `NicheReportPanel`, because that panel
        is what a client reads and prints, and a list of refusals with an
        Approve button is what they *act on* — two different jobs, and the
        panel is already 787 lines against an 800-line ceiling.
      */}
      <DraftDecisions drafts={drafts} onApprove={approveDraft} />

      {/*
        One empty state, and it is about *us*: nothing has run yet. It sits
        below the sample report rather than instead of it, so a new workspace
        sees what a report looks like and is told plainly that this one is not
        theirs. The old "No formats match these filters" went with the
        filters — it blamed a filter choice for work we had not done.
      */}
      {reportResult !== null && !reportResult.hasScanned ? (
        <EmptyState
          title="No scan yet"
          description="When the Trend Scout runs, the formats it finds in your niche replace the sample above — each one a set of beats, never anyone else's footage."
        />
      ) : null}
    </div>
  )
}

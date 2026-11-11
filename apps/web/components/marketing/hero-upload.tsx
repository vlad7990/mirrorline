'use client'

/**
 * The hero control: the first step of the product, not a picture of it.
 *
 * Borrowed from OpusClip ("Drop a video link or upload a file" → Get free
 * clips) and Vizard ("Paste a YouTube link here" → GET CLIPS FOR FREE), the
 * one structural device both of them lead with — see
 * docs/design/COMPETITOR_REFERENCES.md §2.1. On those sites the hero *is* the
 * product's first step, and that is most of why they feel alive where a page
 * of screenshots does not.
 *
 * Two deliberate departures from the sites it is borrowed from.
 *
 * **No link field.** Both competitors accept a YouTube URL, which means
 * ingesting footage whose rights they have not established. CLAUDE.md
 * non-negotiable 1 allows only client-owned material, so this takes an upload
 * and says why. The constraint is the product, so it is stated rather than
 * hidden.
 *
 * **A rights gate before the run.** Picking a file is not consent. The
 * confirmation appears once a file is chosen, because asking before there is
 * anything to confirm is noise.
 *
 * Unlike `EngineLive`, this never renders `null`. A hero that disappears on
 * deployments without the engine — which is every Vercel preview — would take
 * the page's main action with it. Without an engine the same control invites
 * a pilot instead, and says plainly that the run happens with us rather than
 * pretending to start one.
 */

import { AlertBar, Button, ReelMedia, VideoThumb, cn } from '@mirrorline/ui'
import { UploadCloud } from 'lucide-react'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'
import type { CutView } from '@/components/upload/cut-view'
import { useEngineAvailability, useEngineJob } from '@/lib/engine/use-engine-job'

const RIGHTS_LABEL =
  'I own this footage, or I hold a written licence for it, and I can show the record.'

/** Enough to prove the point without turning the hero into the results page. */
const CUTS_SHOWN = 4

/** Accepted upload types, matching what the pipeline can actually open. */
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-matroska,video/webm'

export function HeroUpload() {
  const availability = useEngineAvailability()
  const job = useEngineJob()
  const [file, setFile] = React.useState<File | null>(null)
  const [rightsHolder, setRightsHolder] = React.useState('')
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false)
  const fileId = React.useId()
  const holderId = React.useId()
  const confirmId = React.useId()

  const isLive = availability?.available === true
  const canStart = file !== null && rightsConfirmed && rightsHolder.trim() !== '' && !job.isRunning

  const reset = React.useCallback(() => {
    job.reset()
    setFile(null)
    setRightsConfirmed(false)
    setRightsHolder('')
  }, [job])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (file === null || !canStart) return
    await job.start({ video: file, rightsConfirmed, rightsHolder })
  }

  // Results replace the form: once there are cuts, the cuts are the argument.
  if (job.result) {
    return <HeroResult cuts={job.result.cuts} onReset={reset} />
  }

  return (
    <div className="flex flex-col gap-3">
      {job.error ? <AlertBar title="The run did not finish" description={job.error} /> : null}

      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        {/* The field and its action on one line, as both reference sites do.
            It wraps rather than shrinks at 390px: a 44px target squeezed to
            fit is worse than a second row. */}
        <div className="flex flex-col gap-2 rounded-xl border border-border-strong bg-surface p-2 sm:flex-row sm:items-center">
          <label
            htmlFor={fileId}
            className={cn(
              'flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5',
              'text-label text-text-muted transition-colors hover:bg-surface-subtle',
              'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
            )}
          >
            <UploadCloud aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0 truncate">
              {file ? file.name : 'Drop a talk, podcast or webinar'}
            </span>
            <input
              id={fileId}
              type="file"
              accept={VIDEO_ACCEPT}
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          {isLive ? (
            <Button type="submit" variant="primary" disabled={!canStart}>
              {job.isRunning ? 'Cutting…' : 'Cut it up'}
            </Button>
          ) : (
            <LeadDialogButton intent="pilot">Start a pilot</LeadDialogButton>
          )}
        </div>

        {/* Honest about the one thing the competitors do and we will not. */}
        <p className="m-0 text-meta text-text-muted">
          {/* A typographic apostrophe, as everywhere else on the site. The
              `&apos;` escape this first shipped with renders a straight quote
              and read as a different typeface mid-sentence. */}
          Your own footage only — no links to other people’s videos.{' '}
          {isLive
            ? 'This runs here and now, on this machine.'
            : 'We run the first cuts with you on a pilot call.'}
        </p>

        {/* The rights gate. Appears only once there is a file to confirm, and
            only where a run can actually start. */}
        {isLive && file ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-subtle p-3">
            <label htmlFor={holderId} className="text-label font-semibold text-text">
              Who owns this footage?
            </label>
            <input
              id={holderId}
              type="text"
              value={rightsHolder}
              onChange={(event) => setRightsHolder(event.target.value)}
              placeholder="Your name or your company"
              className="h-11 rounded-md border border-border-strong bg-surface px-3 text-body text-text"
            />
            <label htmlFor={confirmId} className="flex items-start gap-2.5 text-meta text-text">
              <input
                id={confirmId}
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{RIGHTS_LABEL}</span>
            </label>
          </div>
        ) : null}
      </form>

      {/* A second way in, for anyone who did not come to upload today. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <LeadDialogButton intent="demo" variant="tertiary" />
      </div>
    </div>
  )
}

interface HeroResultProps {
  /** `CutView` directly, rather than a narrower local shape that would drift. */
  readonly cuts: readonly CutView[]
  readonly onReset: () => void
}

/**
 * What came back. Real footage from a real run, so these frames use the same
 * `ReelMedia` the sample wall will use once there is sample footage to put in
 * it — the frame does not care where the file came from.
 */
function HeroResult({ cuts, onReset }: HeroResultProps) {
  const shown = cuts.slice(0, CUTS_SHOWN)

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-subtitle font-normal text-text">
        <span className="machine">{cuts.length}</span>{' '}
        {cuts.length === 1 ? 'cut' : 'cuts'} from your video.
      </p>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
        {shown.map((cut, index) => (
          <li key={cut.id} className="min-w-0">
            <VideoThumb
              caption={cut.hook}
              cutNumber={cut.index}
              highlight={cut.highlightPhrase}
              index={index}
              length={cut.lengthLabel}
              media={cut.videoUrl ? <ReelMedia videoSrc={cut.videoUrl} /> : undefined}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <LeadDialogButton intent="pilot" />
        <Button variant="tertiary" onClick={onReset}>
          Try another video
        </Button>
      </div>
    </div>
  )
}

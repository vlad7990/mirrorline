'use client'

/**
 * The hero control: the first step of the product, not a picture of it.
 *
 * docs/design/handoff-v4 §Home gives this a pill with a link icon, a
 * placeholder reading "Paste a YouTube, podcast or webinar link", and a gold
 * "Show me my posts" button — then plays a scripted four-step demo. Two
 * deliberate departures, both recorded in D25.
 *
 * **It takes an upload, never a link.** A link to your own channel would be
 * legitimate; a generic paste field invites someone else's video, which
 * CLAUDE.md non-negotiable 1 forbids and which is the behaviour that killed
 * the earlier project. The pill, the ring and the gold button are kept; what
 * it accepts is a file. An e2e test asserts the absence of a URL input,
 * because that absence is the product decision.
 *
 * **The run is real.** The handoff's demo is canned. We have an engine, so
 * the step chips and the cuts that appear are actual job state. Where there
 * is no engine — every Vercel preview — the same control invites a pilot and
 * says so, rather than playing an animation that pretends.
 *
 * Unlike `EngineLive` this never renders `null`: a hero that disappears
 * takes the page's main action with it.
 */

import { AlertBar, Button, ReelMedia, VideoThumb, cn } from '@mirrorline/ui'
import { Check, UploadCloud } from 'lucide-react'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'
import type { CutView } from '@/components/upload/cut-view'
import { useEngineAvailability, useEngineJob } from '@/lib/engine/use-engine-job'

const RIGHTS_LABEL =
  'I own this footage, or I hold a written licence for it, and I can show the record.'

/** Enough to prove the point without turning the hero into the results page. */
const CUTS_SHOWN = 6

/** Accepted upload types, matching what the pipeline can actually open. */
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-matroska,video/webm'

/**
 * The handoff's four step chips.
 *
 * The engine reports "running" and then "done" — it does not say which of
 * these it is on. So they are shown as a *list of what happens*, pending
 * together while the job runs and done together when it finishes, rather
 * than lighting up one by one on a timer. A timed sequence would be an
 * animation pretending to be a measurement, which is the same objection that
 * kept a progress bar off the studio's upload panel.
 */
const STEPS = ['Transcribing', 'Finding moments', 'Cutting 9:16', 'Compliance check'] as const

/** The platforms the posts go to. Copy from the handoff. */
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube Shorts'] as const

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

  return (
    <div className="flex flex-col items-center gap-4">
      {job.error ? (
        <AlertBar title="The run did not finish" description={job.error} className="w-full" />
      ) : null}

      <form className="flex w-full max-w-[780px] flex-col gap-3" onSubmit={onSubmit}>
        {/* The handoff's pill: dark fill, a hairline border, and a wide soft
            gold ring outside it. The ring is what makes this read as the
            page's one action rather than as a form field. */}
        <div className="flex flex-col gap-2 rounded-[999px] border border-ink-line-strong bg-ink-700/90 p-2 shadow-[0_0_0_6px_rgba(245,184,61,0.06)] sm:flex-row sm:items-center">
          <label
            htmlFor={fileId}
            className={cn(
              'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[999px] px-4 py-3',
              'text-body text-on-ink-muted transition-colors hover:text-on-ink-900',
              'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold',
            )}
          >
            <UploadCloud
              aria-hidden="true"
              className="size-5 shrink-0 text-gold"
              strokeWidth={1.8}
            />
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
            <Button type="submit" variant="gold" size="lg" disabled={!canStart}>
              {job.isRunning ? 'Working…' : 'Show me my posts'}
            </Button>
          ) : (
            <LeadDialogButton intent="pilot" variant="gold" size="lg">
              Show me my posts
            </LeadDialogButton>
          )}
        </div>

        {/* The handoff's platform line, with the rights constraint stated
            rather than hidden — it is the product, not a footnote. */}
        <p className="m-0 flex flex-wrap items-center justify-center gap-2 text-meta text-on-ink-faint">
          <span>Posts to</span>
          {PLATFORMS.map((platform) => (
            <span
              key={platform}
              className="rounded-full border border-ink-line px-2.5 py-1 text-caption text-on-ink-muted"
            >
              {platform}
            </span>
          ))}
          <span>
            ·{' '}
            {isLive
              ? 'only material you own. This runs here and now, on this machine.'
              : 'only material you own. We run the first cuts with you on a pilot call.'}
          </span>
        </p>

        {/* The rights gate. Appears once there is a file to confirm, and only
            where a run can actually start. Picking a file is not consent. */}
        {isLive && file ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-ink-line bg-ink-800 p-4 text-left">
            <label htmlFor={holderId} className="text-label font-semibold text-on-ink-900">
              Who owns this footage?
            </label>
            <input
              id={holderId}
              type="text"
              value={rightsHolder}
              onChange={(event) => setRightsHolder(event.target.value)}
              placeholder="Your name or your company"
              className="h-11 rounded-lg border border-ink-line-strong bg-ink-900 px-3 text-body text-on-ink-900 placeholder:text-on-ink-faint"
            />
            <label
              htmlFor={confirmId}
              className="flex items-start gap-2.5 text-meta text-on-ink-muted"
            >
              <input
                id={confirmId}
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-gold"
              />
              <span>{RIGHTS_LABEL}</span>
            </label>
          </div>
        ) : null}
      </form>

      {job.isRunning || job.result ? (
        <RunPanel cuts={job.result?.cuts ?? null} onReset={reset} />
      ) : null}
    </div>
  )
}

interface RunPanelProps {
  /** `null` while the job is still running. */
  readonly cuts: readonly CutView[] | null
  readonly onReset: () => void
}

/**
 * The handoff's demo panel, driven by a real job.
 *
 * While the engine works the four steps sit pending. When it finishes they
 * are all done and the cuts appear — real rendered footage through the same
 * `ReelMedia` the sample wall uses, because a frame does not care where its
 * file came from.
 */
function RunPanel({ cuts, onReset }: RunPanelProps) {
  const isDone = cuts !== null
  const shown = cuts?.slice(0, CUTS_SHOWN) ?? []

  return (
    <div className="w-full max-w-[980px] rounded-3xl border border-ink-line bg-ink-700/70 p-5 text-left">
      <ul
        className="m-0 flex list-none flex-wrap justify-center gap-2 p-0"
        aria-label="What the engine is doing"
      >
        {STEPS.map((step) => (
          <li
            key={step}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-caption transition-colors duration-500',
              isDone
                ? 'border-site-positive/40 bg-site-positive/10 text-site-positive'
                : 'border-gold/40 bg-gold/10 text-gold-bright',
            )}
          >
            {isDone ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} /> : null}
            {step}
          </li>
        ))}
      </ul>

      {/* `role="status"`, not an alert: finishing is information rather than
          an interruption, and a polite region is read at the next pause. */}
      <p role="status" className="m-0 mt-4 text-center text-body text-on-ink-muted">
        {isDone ? (
          <>
            <span className="machine text-on-ink-900">{cuts.length}</span>{' '}
            {cuts.length === 1 ? 'cut' : 'cuts'} ready from your video.
          </>
        ) : (
          'Transcribing, finding moments, cutting and captioning. Minutes, not seconds.'
        )}
      </p>

      {isDone ? (
        <>
          <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
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

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <LeadDialogButton intent="pilot" variant="gold" />
            <Button variant="ghost" onClick={onReset} className="text-on-ink-muted">
              Run it again
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

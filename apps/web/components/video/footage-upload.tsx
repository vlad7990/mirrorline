'use client'

import { Button, Checkbox, Input, Label, ProgressBar, Select } from '@mirrorline/ui'
import * as React from 'react'
import * as tus from 'tus-js-client'

import type { ApprovedIdea } from '@/lib/video/read-renders'
import type { CreateUploadOutcome } from '@/lib/video/create-upload'
import type { StartRenderOutcome } from '@/lib/video/start-render'
import { MAX_SOURCE_BYTES } from '@/lib/video/types'

/**
 * Sending your own footage, and getting a video back (V5, slice 1).
 *
 * ============================================================================
 * The upload does not go through our server
 * ============================================================================
 *
 * The browser asks the action for a signed token, then uploads **straight to
 * Supabase Storage** over TUS. Two reasons, and the second is the one that
 * makes it non-negotiable:
 *
 * 1. A Vercel function has a request-body ceiling measured in megabytes. The
 *    material this product is for — a podcast, a webinar, a talk — is measured
 *    in gigabytes.
 * 2. TUS resumes. §V5's acceptance test is "a 2GB upload survives an
 *    interrupted and resumed connection", and resume is a property of the
 *    protocol rather than something we could add later.
 *
 * `tus-js-client` keeps a fingerprint of the file in `localStorage`, so
 * pressing the same button with the same file after a dropped connection picks
 * up where it stopped rather than starting again.
 *
 * ============================================================================
 * The actions arrive as props
 * ============================================================================
 *
 * Not imported. `server-only.test.ts` walks the client import graph and an
 * imported action would put this component one hop from the Anthropic SDK
 * chokepoint — the same decision `RunScanForm` and `ClientProfileForm`
 * document.
 */

/** Supabase Storage's TUS implementation requires exactly 6 MB chunks. */
const CHUNK_BYTES = 6 * 1024 * 1024

/** Backoff for a dropped connection, in milliseconds. */
const RETRY_DELAYS = [0, 3_000, 5_000, 10_000, 20_000]

export interface FootageUploadProps {
  /** Approved ideas only — an unapproved script is not one we may spend CPU on. */
  readonly ideas: readonly ApprovedIdea[]
  readonly createUpload: (input: {
    readonly name: string
    readonly mime: string
    readonly bytes: number
    readonly rightsHolder: string
    readonly rightsConfirmed: boolean
  }) => Promise<CreateUploadOutcome>
  readonly startRender: (assetId: string, draftId: string) => Promise<StartRenderOutcome>
}

type Phase = 'idle' | 'uploading' | 'starting' | 'queued'

const gigabytes = (bytes: number): string => `${(bytes / 1024 ** 3).toFixed(1)}GB`

export function FootageUpload({ ideas, createUpload, startRender }: FootageUploadProps) {
  const [draftId, setDraftId] = React.useState(ideas[0]?.draftId ?? '')
  const [rightsHolder, setRightsHolder] = React.useState('')
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [percent, setPercent] = React.useState(0)
  const [message, setMessage] = React.useState<string | null>(null)
  const [problem, setProblem] = React.useState<string | null>(null)

  const isBusy = phase === 'uploading' || phase === 'starting'
  const canSubmit =
    !isBusy && file !== null && draftId !== '' && rightsConfirmed && rightsHolder.trim() !== ''

  /**
   * The upload itself, wrapped so the caller can await it.
   *
   * `onError` rejects rather than merely reporting: the render must not be
   * queued against a partial object, and `start-render.ts` checks the object's
   * size as a second line of defence for the case where this one is bypassed.
   */
  const uploadTo = (upload: CreateUploadOutcome & { status: 'ready' }, chosen: File) =>
    new Promise<void>((resolve, reject) => {
      const resumable = new tus.Upload(chosen, {
        endpoint: upload.endpoint,
        retryDelays: RETRY_DELAYS,
        chunkSize: CHUNK_BYTES,
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        headers: {
          // The signed upload token authorises writing this one object path and
          // nothing else, which is why no session token is needed here.
          'x-signature': upload.token,
          'x-upsert': 'true',
        },
        metadata: {
          bucketName: upload.bucket,
          objectName: upload.path,
          contentType: chosen.type,
        },
        onProgress: (sent, total) => setPercent(Math.round((sent / total) * 100)),
        onError: (error) => reject(error),
        onSuccess: () => resolve(),
      })

      // Resume from whatever the server already holds, rather than from zero.
      resumable.findPreviousUploads().then((previous) => {
        const first = previous[0]
        if (first !== undefined) resumable.resumeFromPreviousUpload(first)
        resumable.start()
      }, reject)
    })

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (file === null || !canSubmit) return

    setProblem(null)
    setMessage(null)
    setPercent(0)
    setPhase('uploading')

    const upload = await createUpload({
      name: file.name,
      mime: file.type,
      bytes: file.size,
      rightsHolder: rightsHolder.trim(),
      rightsConfirmed,
    })

    if (upload.status !== 'ready') {
      setPhase('idle')
      setProblem(upload.message)
      return
    }

    try {
      await uploadTo(upload, file)
    } catch (error: unknown) {
      setPhase('idle')
      // The sentence is ours rather than the library's: a TUS error carries
      // HTTP detail that means nothing to the person holding the file.
      setProblem(
        'That upload stopped before it finished. Press the button again and it will pick up where it left off.',
      )
      console.error('[upload] tus failed', error)
      return
    }

    setPhase('starting')
    const queued = await startRender(upload.assetId, draftId)

    if (queued.status === 'queued') {
      setPhase('queued')
      setMessage('Got it. We are making your video — this page updates when it is ready.')
      return
    }

    setPhase('idle')
    setProblem('message' in queued ? queued.message : 'We could not start that video.')
  }

  if (ideas.length === 0) {
    return (
      <p className="text-meta text-text-muted">
        Approve one of your video ideas on the Niche Scan screen first — a script is what the cut
        follows, and an unapproved one is not one we will film against.
      </p>
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="video-idea">Which idea is this footage for?</Label>
        <Select
          id="video-idea"
          options={ideas.map((idea) => ({ value: idea.draftId, label: idea.title }))}
          value={draftId}
          onValueChange={setDraftId}
          disabled={isBusy}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="footage">Your video</Label>
        <Input
          id="footage"
          type="file"
          accept="video/*"
          disabled={isBusy}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null)
            setProblem(null)
          }}
        />
        <p className="text-caption text-text-muted">
          Up to {gigabytes(MAX_SOURCE_BYTES)} and up to an hour long. If the connection drops, press
          the button again and the upload resumes.
        </p>
      </div>

      {/*
        Non-negotiable 1, on the screen rather than only in the schema: only
        client-owned material. The compliance gate blocks every cut made with no
        rights record, so this is also the cheapest possible refusal.
      */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="rights-holder">Who owns this footage?</Label>
        <Input
          id="rights-holder"
          value={rightsHolder}
          disabled={isBusy}
          placeholder="Your business name"
          onChange={(event) => setRightsHolder(event.currentTarget.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="rights-confirmed"
          checked={rightsConfirmed}
          disabled={isBusy}
          onCheckedChange={(checked) => setRightsConfirmed(checked === true)}
        />
        <Label htmlFor="rights-confirmed" className="pt-3 text-meta font-normal">
          I own this footage, or I hold a written licence for it.
        </Label>
      </div>

      {phase === 'uploading' ? (
        <ProgressBar
          value={percent}
          label="Uploading your video"
          valueText={`${percent}% uploaded`}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {phase === 'uploading'
            ? `Uploading ${percent}%`
            : phase === 'starting'
              ? 'Starting…'
              : 'Send it and make the video'}
        </Button>
        {message ? <p className="text-meta text-text-muted">{message}</p> : null}
      </div>

      {problem ? (
        <p className="text-meta text-danger" role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  )
}

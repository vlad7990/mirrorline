import type { Metadata } from 'next'

import { DEMO_STATE_PARAM, parseDemoState } from '@/components/upload/upload-data'
import { UploadScreen } from '@/components/upload/upload-screen'
import { VideoPanel } from '@/components/video/video-panel'

import { approveRenderAction, createFootageUploadAction, startRenderAction } from './video-actions'

/**
 * S3 · Upload and multiply.
 *
 * Two halves, deliberately distinguishable (V5, slice 1):
 *
 * * **`VideoPanel`** is real. It uploads the client's own footage straight to
 *   Supabase Storage, queues a render, and shows the finished 9:16 short with
 *   its compliance verdict and an Approve button.
 * * **`UploadScreen`** is S3 with mock data and the four demo states, which
 *   the reference PNGs still show and which says "Sample data" where it must.
 *
 * The page's other job is unchanged: read `?state=` and hand a validated value
 * to the sample screen. Next 15 delivers search params as a promise and
 * anything it carries is untrusted, so it goes through `parseDemoState`.
 *
 * The three server actions are imported **here** and passed down as props.
 * `server-only.test.ts` walks the client import graph, so a client component
 * importing an action would put it one hop from the SDK chokepoint — the rule
 * every form in this app follows.
 */

export const metadata: Metadata = { title: 'Upload' }

interface UploadPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const params = await searchParams

  return (
    <div className="flex flex-col gap-10">
      <VideoPanel
        createUpload={createFootageUploadAction}
        startRender={startRenderAction}
        approve={approveRenderAction}
      />
      <UploadScreen state={parseDemoState(params[DEMO_STATE_PARAM])} />
    </div>
  )
}

import { Card, EmptyState } from '@mirrorline/ui'

import type { ApproveDraftResult } from '@/lib/drafts/approve-reply'
import type { CreateUploadOutcome } from '@/lib/video/create-upload'
import { readApprovedIdeas, readRenders } from '@/lib/video/read-renders'
import type { StartRenderOutcome } from '@/lib/video/start-render'

import { FootageUpload } from './footage-upload'
import { RenderCard } from './render-card'

/**
 * The real half of the Upload screen (V5, slice 1).
 *
 * A server component, so the reads happen on the server with the member's own
 * client and row-level security decides what comes back. The two client
 * components below it get data and **functions**, never a Supabase client.
 *
 * ============================================================================
 * It sits above the sample screen rather than replacing it
 * ============================================================================
 *
 * `UploadScreen` is S3 with mock data and four demo states, and it is still
 * what the reference PNGs show. This panel is the part that actually moves
 * bytes. Keeping them apart means the demo states keep working for the
 * marketing and screenshot paths while a client with an approved idea can use
 * the real one — and it is honest about which is which, because the sample
 * below says "Sample data" and this does not.
 *
 * Replacing the screen is the right move once a client has used this twice.
 * Doing it in the same change as the pipeline would have made the diff
 * unreadable and put the design under a feature's deadline.
 */

export interface VideoPanelProps {
  readonly createUpload: (input: {
    readonly name: string
    readonly mime: string
    readonly bytes: number
    readonly rightsHolder: string
    readonly rightsConfirmed: boolean
  }) => Promise<CreateUploadOutcome>
  readonly startRender: (assetId: string, draftId: string) => Promise<StartRenderOutcome>
  readonly approve: (renderId: string) => Promise<ApproveDraftResult>
}

export async function VideoPanel({ createUpload, startRender, approve }: VideoPanelProps) {
  // Both reads at once: neither depends on the other, and the screen is
  // useless until both have answered.
  const [ideas, renders] = await Promise.all([readApprovedIdeas(), readRenders()])

  return (
    <section className="flex flex-col gap-6" aria-labelledby="your-videos">
      <header className="flex flex-col gap-1">
        <h2 id="your-videos" className="text-headline">
          Your videos
        </h2>
        <p className="text-meta text-text-muted">
          Send a long video and we cut the four beats of an approved idea out of it — captions
          burned in, 9:16, ready for you to approve.
        </p>
      </header>

      <Card className="p-5">
        <FootageUpload ideas={ideas} createUpload={createUpload} startRender={startRender} />
      </Card>

      {renders.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Approve an idea, send the footage it was written for, and the first cut appears here."
        />
      ) : (
        <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
          {renders.map((render) => (
            <li key={render.id}>
              <RenderCard render={render} approve={approve} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

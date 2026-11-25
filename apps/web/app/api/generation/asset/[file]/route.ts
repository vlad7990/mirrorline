/**
 * One generated scene's bytes, for a dev screen to put in a `<video>`.
 *
 * ============================================================================
 * Why this route exists at all
 * ============================================================================
 *
 * `GeneratedAsset.location` is a path on this machine. A browser cannot open
 * one, and a route that passed it to `createReadStream` would let whatever
 * produced the asset choose any file on disk. So the screen never sees a path:
 * it sees a **name**, validated against the only shape our two builders
 * produce, and the path is rebuilt here from the configured directory.
 * `asset-file.ts` holds that logic, and `cutPath()` made the same argument
 * first.
 *
 * ============================================================================
 * Three gates, in this order, each cheaper than the next
 * ============================================================================
 *
 * 1. **The flag.** `GENERATION_ENABLED` off means this route does not exist, so
 *    it answers 404 rather than 403 — a deployment that has not turned
 *    generation on should not advertise that it could.
 * 2. **A session.** `/api/*` is outside `isProtectedPath`, which covers `/app`
 *    and nothing else, so the middleware does not stand in front of this. The
 *    check has to be here, and `getUser()` rather than `getSession()` for the
 *    reason `export/route.ts` gives: the token is verified rather than
 *    believed.
 * 3. **The name.** Then, and only then, a stat.
 *
 * **The known limit, written down rather than implied.** A signed-in member of
 * one workspace can fetch another workspace's generated scene if they know the
 * name, because slice 1 has no bucket and therefore no row-level security over
 * these bytes — the name is derived from the prompt and the beat, and nothing
 * about it is workspace-scoped. That is one of the reasons the flag is off by
 * default and this screen lives under `/app/dev/*`. The real answer is the
 * VIDEO session's storage bucket and its RLS review; when that lands, this route
 * either gains a workspace check or is deleted in favour of a signed URL.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

import { NextResponse } from 'next/server'

import {
  assetContentType,
  generatedAssetPath,
  isServableAssetName,
} from '@/lib/generation/asset-file'
import { isGenerationEnabled } from '@/lib/generation/flag'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'

/** `node:fs`, so not the edge. An edge runtime fails at request time. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Larger than any scene we ask for, and small enough to be a sanity check.
 *
 * `MAX_CLIP_SECONDS` is 6 and `Resolution` tops out at 720p, so a generated clip
 * is single-digit megabytes. A file over this ceiling sitting in the generation
 * directory is not one of ours, however well-formed its name is.
 */
const MAX_ASSET_BYTES = 32 * 1024 * 1024

/** The same answer for every refusal, so none of them is informative. */
function notFound() {
  return NextResponse.json({ error: 'no generated scene by that name' }, { status: 404 })
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!isGenerationEnabled()) return notFound()

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (auth.user === null) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const { file } = await params
  if (!isServableAssetName(file)) return notFound()

  const assetPath = generatedAssetPath(file)

  let size: number
  try {
    const stats = await stat(assetPath)
    if (!stats.isFile()) return notFound()
    size = stats.size
  } catch {
    // Gone, never written, or written under a different `GENERATION_OUTPUT_DIR`
    // than the one configured now. All three look alike from here, and all three
    // mean the same thing to the screen.
    return notFound()
  }

  if (size > MAX_ASSET_BYTES) return notFound()

  // Streamed rather than buffered, which costs nothing to do properly.
  //
  // No `accept-ranges`, and that is deliberate: a three-to-six second B-roll
  // clip has nothing to seek within, and the range handling it would need is
  // already written — and explained — in
  // `app/api/engine/jobs/[jobId]/cuts/[index]/route.ts`. If generated scenes
  // ever get long enough to scrub, that is the implementation to lift rather
  // than a second one to write.
  const stream = Readable.toWeb(createReadStream(assetPath)) as ReadableStream<Uint8Array>

  return new NextResponse(stream, {
    headers: {
      'content-type': assetContentType(file),
      'content-length': String(size),
      // The name is a hash of the prompt and the beat, so these bytes never
      // change under a given URL. Private, because they are a client's.
      'cache-control': 'private, max-age=3600',
    },
  })
}

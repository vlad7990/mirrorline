import 'server-only'

/**
 * Minting one upload: a row, a path and a token (V5, slice 1).
 *
 * ============================================================================
 * The bytes never touch Vercel, and that is the whole design
 * ============================================================================
 *
 * `BACKEND_PHASE §V5` is blunt about it — "a function body limit is not an
 * upload strategy". `/api/engine/jobs` streams a 2 GB file through a Node
 * handler onto local disk, which works on a laptop and cannot work anywhere
 * else: a Vercel function has a request-body ceiling measured in megabytes, a
 * read-only filesystem and a timeout in seconds.
 *
 * So this function moves **no bytes at all**. It writes the `video_assets` row,
 * works out where the object goes, and mints a signed upload token for exactly
 * that path. The browser then uploads straight to Supabase Storage over TUS,
 * resumably, and the server learns it finished when the client says so (and
 * disbelieves it until ffprobe agrees — see `start-render.ts`).
 *
 * ============================================================================
 * Why the row is written before the upload rather than after
 * ============================================================================
 *
 * The path contains the asset id, so the id has to exist first. The cost is
 * rows for uploads that never complete, which is the right way round: an
 * abandoned `uploading` row is a thing to sweep, while an object with no row is
 * a file nobody can account for — in a private bucket holding somebody's
 * unedited footage, that is the worse of the two.
 *
 * ============================================================================
 * The rights record is checked here, in words
 * ============================================================================
 *
 * `video_assets.rights_holder` is `not null` and the column's own check refuses
 * whitespace, so the database is the guarantee. This is the *message*:
 * non-negotiable 1 allows only client-owned material, and a client who left the
 * box empty is owed a sentence rather than a constraint violation.
 */

import { createAgentServiceClient } from '../agents/service-client'

import { ACCEPTED_SOURCE_MIMES, sourceExtensionFor, sourceObjectPath } from './paths'
import { FOOTAGE_BUCKET, MAX_SOURCE_BYTES } from './types'

/** One sentence for every way this can fail on our side. The client can do one thing: try again. */
const COULD_NOT_START = 'We could not start that upload just now. Try again shortly.'

export interface CreateUploadRequest {
  readonly workspaceId: string
  /** The signed-in user, for `uploaded_by`. Null when we could not read one. */
  readonly userId: string | null
  readonly originalName: string
  readonly mime: string
  readonly bytes: number
  /** Who owns the footage, typed by the client. Non-negotiable 1. */
  readonly rightsHolder: string
  /** The checkbox. False is a refusal, not a default. */
  readonly rightsConfirmed: boolean
}

/**
 * The resumable endpoint, on the **direct storage hostname**.
 *
 * Supabase's own guidance, and it is a performance difference rather than a
 * preference: "for optimal performance when uploading large files you should
 * always use the direct storage hostname" — `<ref>.storage.supabase.co` instead
 * of `<ref>.supabase.co`. For a 4 GB podcast that is the difference between a
 * long upload and an abandoned one.
 *
 * Built here rather than in the component so the browser is handed a URL rather
 * than the job of assembling one out of an environment variable.
 */
function resumableEndpoint(): string | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url === undefined || url.trim() === '') return null

  return `${url.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable`
}

export type CreateUploadOutcome =
  | {
      readonly status: 'ready'
      readonly assetId: string
      readonly bucket: string
      readonly path: string
      /** Where TUS should POST. See `resumableEndpoint`. */
      readonly endpoint: string
      /**
       * The `x-signature` header value for the resumable upload. **Not a
       * secret the client keeps** — it authorises writing one object path and
       * expires — but it is still a credential, so it is returned to the
       * caller rather than logged anywhere.
       */
      readonly token: string
    }
  | { readonly status: 'refused'; readonly message: string }
  | { readonly status: 'failed'; readonly message: string }

export async function createFootageUpload(
  request: CreateUploadRequest,
): Promise<CreateUploadOutcome> {
  const originalName = request.originalName.trim()
  const rightsHolder = request.rightsHolder.trim()

  if (originalName === '') {
    return { status: 'refused', message: 'That file has no name we can read.' }
  }

  if (!request.rightsConfirmed || rightsHolder === '') {
    return {
      status: 'refused',
      message:
        'Confirm you own this footage, or hold a written licence for it, and name the rights holder.',
    }
  }

  const extension = sourceExtensionFor(request.mime)
  if (extension === null) {
    return {
      status: 'refused',
      message: `We can take ${ACCEPTED_SOURCE_MIMES.map((mime) => mime.replace('video/', '')).join(', ')} video. That file is a ${request.mime || 'file of unknown type'}.`,
    }
  }

  if (!Number.isFinite(request.bytes) || request.bytes <= 0) {
    return { status: 'refused', message: 'That file appears to be empty.' }
  }

  if (request.bytes > MAX_SOURCE_BYTES) {
    const gb = Math.round(MAX_SOURCE_BYTES / 1024 ** 3)
    return {
      status: 'refused',
      message: `That file is larger than the ${gb}GB we can take. Send the longest version under that and we will cut from it.`,
    }
  }

  const endpoint = resumableEndpoint()
  if (endpoint === null) {
    // No Supabase, no upload. Saying so beats accepting a file we cannot store
    // — the same refusal `/api/engine/jobs` makes when the engine is absent.
    return { status: 'failed', message: 'Uploads are not configured here yet.' }
  }

  const supabase = createAgentServiceClient()

  // The id comes from the row, so the insert happens before the path exists.
  const inserted = await supabase
    .from('video_assets')
    .insert({
      workspace_id: request.workspaceId,
      uploaded_by: request.userId,
      // Rewritten immediately below. The column is `not null` and the real
      // path needs the id this insert is generating, so the first value is a
      // placeholder that is unique for the same reason the real one is.
      storage_path: `pending/${crypto.randomUUID()}`,
      original_name: originalName,
      bytes: Math.round(request.bytes),
      mime: request.mime,
      rights_holder: rightsHolder,
      status: 'uploading',
    })
    .select('id')
    .single()

  const assetId = (inserted.data as { id?: unknown } | null)?.id
  if (inserted.error !== null || typeof assetId !== 'string') {
    console.error(`[video] could not create an asset row: ${inserted.error?.code ?? 'unknown'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  const path = sourceObjectPath(request.workspaceId, assetId, extension)

  const pathed = await supabase.from('video_assets').update({ storage_path: path }).eq('id', assetId)
  if (pathed.error !== null) {
    console.error(`[video] could not store the object path: ${pathed.error.code ?? 'unknown'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  // `upsert: true` so a resumed upload that restarts from byte zero overwrites
  // its own half-written object rather than failing on a name it owns. There is
  // no `expiresIn` to pass — see `UPLOAD_TOKEN_IS_SUPABASES_TO_EXPIRE`.
  const signed = await supabase.storage
    .from(FOOTAGE_BUCKET)
    .createSignedUploadUrl(path, { upsert: true })

  const token = signed.data?.token
  if (signed.error !== null || typeof token !== 'string' || token === '') {
    console.error(`[video] could not sign an upload: ${signed.error?.message ?? 'no token'}`)
    return { status: 'failed', message: COULD_NOT_START }
  }

  return { status: 'ready', assetId, bucket: FOOTAGE_BUCKET, path, endpoint, token }
}

/**
 * Moving bytes between Supabase Storage and the container's disk (V5, slice 1).
 *
 * ============================================================================
 * Streamed, because the source is gigabytes
 * ============================================================================
 *
 * `supabase.storage.download()` resolves a `Blob`, which means the whole object
 * in the process's memory. For a 4 GB podcast on a 4 GB container that is an
 * OOM, and an OOM mid-job is the worst failure shape available here: the
 * container dies, the lease expires, another worker claims the same job and
 * does it again.
 *
 * So a download is a signed URL and a piped `fetch`, and the only thing held in
 * memory is a buffer. The upload direction is small enough (a 45-second short
 * is 10-20 MB) that a Buffer is honest there.
 */

import { createWriteStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

import type { SupabaseClient } from '@supabase/supabase-js'

/** Long enough to pull 5 GB on a slow link; short enough to not be forever. */
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60

export class MediaTransferError extends Error {}

/**
 * Pull one object down to `destination`.
 *
 * The signed URL is minted with the service role and used immediately, so it
 * never leaves this process.
 */
export async function downloadObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  destination: string,
): Promise<number> {
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS)
  const url = signed.data?.signedUrl
  if (signed.error !== null || typeof url !== 'string') {
    throw new MediaTransferError(`could not sign ${path}: ${signed.error?.message ?? 'no url'}`)
  }

  const response = await fetch(url)
  if (!response.ok || response.body === null) {
    throw new MediaTransferError(`could not fetch ${path}: HTTP ${response.status}`)
  }

  await pipeline(
    // The two spellings of the same stream: `fetch` returns the web one and
    // `Readable.fromWeb` wants the `node:stream/web` one. The cast is the same
    // one `/api/engine/jobs` carries, and for the same reason — `pnpm
    // typecheck` and `next build` disagree about whether it is needed.
    Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
    createWriteStream(destination),
  )

  const written = await stat(destination)
  if (written.size === 0) {
    throw new MediaTransferError(`${path} downloaded as an empty file`)
  }

  return written.size
}

/**
 * Push one finished file up.
 *
 * `upsert: true` because a job whose lease was reclaimed renders the same
 * `cut_index` to the same path, and the second attempt must replace the first
 * rather than fail on a name it owns.
 */
export async function uploadObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  localPath: string,
  contentType: string,
): Promise<number> {
  const body = await readFile(localPath)

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  })

  if (error !== null) {
    throw new MediaTransferError(`could not upload ${path}: ${error.message}`)
  }

  return body.byteLength
}

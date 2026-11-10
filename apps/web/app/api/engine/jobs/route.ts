/**
 * Start a run.
 *
 * Takes the video and a rights confirmation, writes both to a job directory,
 * answers with the job id, and lets the engine run on behind the response.
 * The client polls `/api/engine/jobs/<id>` from there.
 *
 * Two refusals worth naming, because both are rules rather than validation:
 *
 * - No rights confirmation, no run. CLAUDE.md non-negotiable 1 allows only
 *   client-owned material, and the gate downstream can only block cuts after
 *   the fact. Refusing here is cheaper and says so sooner.
 * - No engine, no job. On a deployment this 503s rather than accepting an
 *   upload it can never process.
 */

import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

import { NextResponse } from 'next/server'

import {
  createJobDirectory,
  messageOf,
  sourcePath,
  writeJob,
  type StoredJob,
} from '@/lib/engine/jobs'
import { engineAvailability, runEngine, writeBrandFile } from '@/lib/engine/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A laptop, a local disk and one run at a time. Not a product limit. */
const MAX_BYTES = 2 * 1024 * 1024 * 1024

const ACCEPTED_PREFIX = 'video/'

export async function POST(request: Request) {
  const availability = await engineAvailability()
  if (!availability.available) {
    return NextResponse.json(
      { error: `the engine cannot run here. ${availability.reason}` },
      { status: 503 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch (error) {
    return NextResponse.json(
      { error: `that upload could not be read: ${messageOf(error)}` },
      { status: 400 },
    )
  }

  const file = form.get('video')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'attach a video file as `video`' }, { status: 400 })
  }
  if (!file.type.startsWith(ACCEPTED_PREFIX)) {
    return NextResponse.json(
      { error: `that is a ${file.type || 'file of unknown type'}, not a video` },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `that file is larger than the ${MAX_BYTES / 1024 ** 3}GB this accepts` },
      { status: 413 },
    )
  }

  // The checkbox on the upload screen. Non-negotiable 1 lives here.
  const rightsHolder = String(form.get('rightsHolder') ?? '').trim()
  if (form.get('rightsConfirmed') !== 'true' || rightsHolder === '') {
    return NextResponse.json(
      {
        error:
          'confirm you own this footage, or hold a written licence for it, and name the rights holder.',
      },
      { status: 400 },
    )
  }

  const jobId = randomUUID()
  const startedAt = new Date().toISOString()

  try {
    await createJobDirectory(jobId)
    // Streamed to disk rather than buffered: a 20-minute episode has no
    // business sitting in the server's memory on the way past.
    //
    // The cast is between two spellings of the same object. `File.stream()`
    // is typed as the DOM ReadableStream and `Readable.fromWeb` wants the one
    // from node:stream/web; they are the same stream at runtime. `pnpm
    // typecheck` accepts it either way and `next build` does not, which is
    // why this is written down rather than discovered twice.
    await pipeline(
      Readable.fromWeb(file.stream() as NodeReadableStream<Uint8Array>),
      createWriteStream(sourcePath(jobId)),
    )
    await writeBrandFile(jobId, rightsHolder)
  } catch (error) {
    return NextResponse.json(
      { error: `the upload could not be stored: ${messageOf(error)}` },
      { status: 500 },
    )
  }

  const queued: StoredJob = {
    id: jobId,
    state: 'running',
    sourceName: file.name,
    startedAt,
    finishedAt: null,
    error: null,
  }
  await writeJob(queued)

  // Deliberately not awaited: the response goes back now and the run
  // continues in this process. Every exit path writes a terminal state, so a
  // job cannot sit at "running" after the engine has stopped.
  void runEngine(jobId)
    .then((outcome) =>
      writeJob({
        ...queued,
        state: outcome.ok ? 'done' : 'failed',
        finishedAt: new Date().toISOString(),
        error: outcome.ok ? null : outcome.message,
      }),
    )
    .catch((error: unknown) =>
      writeJob({
        ...queued,
        state: 'failed',
        finishedAt: new Date().toISOString(),
        error: messageOf(error),
      }),
    )

  return NextResponse.json({ jobId }, { status: 202 })
}

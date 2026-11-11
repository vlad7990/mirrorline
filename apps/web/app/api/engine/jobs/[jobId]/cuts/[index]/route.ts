/**
 * One rendered cut, with range support.
 *
 * The path is built from a validated job id and a validated integer, never
 * from the `file` the summary recorded. That path is absolute and produced on
 * this machine; serving it verbatim would let whatever wrote the summary pick
 * any file on disk. `cutPath()` is the only way a path gets made here.
 *
 * Ranges matter: without them a `<video>` has no duration and no scrub bar.
 * The browser asks for a byte range, and a server that answers 200 with the
 * whole file every time leaves the player unable to seek.
 *
 * On `content-length`, and what turned out to be true. It is set here and it
 * does not appear on the response under `next dev`, which sends everything
 * `transfer-encoding: chunked` and drops the header. That is the dev server,
 * not this route: a plain JSON 404 from here loses it too. The first guess,
 * that a streamed body was the cause, was wrong, which is why the answer is
 * written down rather than guessed at twice.
 *
 * It does not matter for the thing it was blocking. A player takes the total
 * size from `content-range: bytes a-b/TOTAL`, which does survive, and that
 * is what gives it a duration and a scrub bar.
 *
 * Ranges are answered from a buffer and capped, so "everything from zero"
 * cannot buffer a gigabyte.
 */

import { createReadStream } from 'node:fs'
import { open, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

import { NextResponse } from 'next/server'

import { cutPath, isJobId } from '@/lib/engine/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The most one range answers at a time. Chrome asks for `bytes=0-` and is
 * perfectly happy with a partial answer, so an open-ended range is clamped
 * rather than refused.
 */
const MAX_RANGE_BYTES = 4 * 1024 * 1024

/** `bytes=0-`, `bytes=1000-2000`, `bytes=-500`. Anything else is ignored. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (header === null) return null

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (match === null) return null

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  // A suffix range asks for the last N bytes.
  if (rawStart === '') {
    const length = Number(rawEnd)
    if (!Number.isFinite(length) || length <= 0) return null
    return { start: Math.max(0, size - length), end: size - 1 }
  }

  const start = Number(rawStart)
  if (!Number.isFinite(start) || start >= size) return null

  const requestedEnd = rawEnd === '' ? size - 1 : Number(rawEnd)
  const end = Math.min(Number.isFinite(requestedEnd) ? requestedEnd : size - 1, size - 1)
  if (end < start) return null

  return { start, end: Math.min(end, start + MAX_RANGE_BYTES - 1) }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string; index: string }> },
) {
  const { jobId, index } = await params

  if (!isJobId(jobId)) {
    return NextResponse.json({ error: 'no job by that id' }, { status: 404 })
  }

  let path: string
  try {
    path = cutPath(jobId, Number(index))
  } catch {
    return NextResponse.json({ error: 'no cut by that number' }, { status: 404 })
  }

  let size: number
  try {
    size = (await stat(path)).size
  } catch {
    return NextResponse.json({ error: 'that cut has not been rendered' }, { status: 404 })
  }

  const rangeHeader = request.headers.get('range')
  const range = parseRange(rangeHeader, size)

  // A range was asked for and could not be met. Saying so is better than
  // quietly sending the whole file, which a player reads as a seek failure.
  if (rangeHeader !== null && range === null && /^bytes=/.test(rangeHeader.trim())) {
    return new NextResponse(null, {
      status: 416,
      headers: { 'content-range': `bytes */${size}`, 'accept-ranges': 'bytes' },
    })
  }

  if (range !== null) {
    const length = range.end - range.start + 1
    const handle = await open(path, 'r')
    try {
      const buffer = Buffer.alloc(length)
      await handle.read(buffer, 0, length, range.start)

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'content-type': 'video/mp4',
          'content-length': String(length),
          'content-range': `bytes ${range.start}-${range.end}/${size}`,
          'accept-ranges': 'bytes',
          'cache-control': 'private, max-age=3600',
        },
      })
    } finally {
      await handle.close()
    }
  }

  // No range asked for. Streamed, because the whole file has no business
  // being buffered, and `accept-ranges` tells the player it may ask for one.
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>

  return new NextResponse(stream, {
    headers: {
      'content-type': 'video/mp4',
      'content-length': String(size),
      'accept-ranges': 'bytes',
      // A rendered cut never changes: the job id is part of the path, and a
      // new run gets a new id.
      'cache-control': 'private, max-age=3600',
    },
  })
}

/**
 * One rendered cut, streamed.
 *
 * The path is built from a validated job id and a validated integer, never
 * from the `file` the summary recorded. That path is absolute and produced on
 * this machine; serving it verbatim would let whatever wrote the summary pick
 * any file on disk. `cutPath()` is the only way a path gets made here.
 *
 * Range requests are not implemented, so a browser cannot seek. For a local
 * preview of a 30-second clip that is a fair trade; when this moves to real
 * storage in week 3, that storage will handle ranges itself.
 */

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'

import { NextResponse } from 'next/server'

import { cutPath, isJobId } from '@/lib/engine/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
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

  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>

  return new NextResponse(stream, {
    headers: {
      'content-type': 'video/mp4',
      'content-length': String(size),
      // A rendered cut never changes: the job id is part of the path, and a
      // new run gets a new id.
      'cache-control': 'private, max-age=3600',
    },
  })
}

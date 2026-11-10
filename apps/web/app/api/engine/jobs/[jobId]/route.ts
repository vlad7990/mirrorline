/**
 * One job: its state, and its summary once there is one.
 *
 * Polled by the upload screen every couple of seconds while a run is going.
 * Cheap on purpose: reading two small files beats holding a process open to
 * remember them.
 */

import { NextResponse } from 'next/server'

import { readJob } from '@/lib/engine/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params

  const job = await readJob(jobId)
  if (job === null) {
    return NextResponse.json({ error: 'no job by that id' }, { status: 404 })
  }

  // The summary's per-cut `file` is an absolute path on this machine. It is
  // useful to the engine and to nobody in a browser, so the cuts go out with
  // a URL this app serves instead.
  const cuts = (job.summary?.cuts ?? []).map((cut) => ({
    ...cut,
    file: null,
    url: `/api/engine/jobs/${jobId}/cuts/${cut.index}`,
  }))

  return NextResponse.json({
    ...job,
    summary: job.summary === null ? null : { ...job.summary, cuts },
  })
}

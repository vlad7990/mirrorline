/**
 * POST /api/niche-scan — the lead magnet's handler (14 §3).
 *
 * It stores the request and tells n8n, and that is all it does. **No email is
 * sent from here**, by anything, ever: non-negotiable 11, and the back-office
 * flow that eventually delivers a scan lives in n8n outside this app.
 *
 * It never answers ok on a failed write. Telling somebody their scan is on
 * its way when nothing was stored is the same class of untruth as an
 * unlabelled AI scene — the interface asserting something that is not so.
 */

import { NextResponse } from 'next/server'

import { validateNicheScanRequest } from '@/lib/leads/niche-scan-lead'
import { notifyN8n, storeNicheScan } from '@/lib/leads/scan-store'

// Node APIs (the file adapter), and nothing here may be cached.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'We could not read that request.' },
      { status: 400 },
    )
  }

  const validation = validateNicheScanRequest(body)
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 })
  }

  try {
    const { lead, via } = await storeNicheScan(validation.lead, new Date())
    const notified = await notifyN8n(lead)

    return NextResponse.json({ ok: true, id: lead.id, storedVia: via, notified })
  } catch (error: unknown) {
    // Logged server-side with its context, per CLAUDE.md's error-handling
    // rule, and answered with something a person can act on.
    console.error('[niche-scan] could not store the request', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'We could not save that just now. Please try again, or email us directly.',
      },
      { status: 500 },
    )
  }
}

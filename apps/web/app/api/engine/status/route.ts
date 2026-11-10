/**
 * Can this machine run the engine.
 *
 * The upload screen asks before it offers an upload button. On a Vercel
 * preview the answer is always no, and the screen falls back to its demo
 * states rather than offering something that cannot work.
 *
 * Checked on every request rather than cached: `uv sync` can happen between
 * two page loads.
 */

import { NextResponse } from 'next/server'

import { engineAvailability } from '@/lib/engine/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const availability = await engineAvailability()
  return NextResponse.json(availability)
}

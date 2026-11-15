/**
 * POST /api/copilot/site — "Ask about Mirrorline" (spec 18 §3).
 *
 * The public bot. It answers only from our own published pages and refuses
 * everything else, and both halves of that are the adapter's job; this handler
 * validates the request, holds the rate limit and streams the result.
 *
 * **It answers with no API key.** §4 makes that a supported mode, so a
 * preview with no key gets scripted replies labelled as samples rather than a
 * 500. There is no configuration to check and no availability probe: unlike
 * `/api/engine/status`, which has to ask whether ffmpeg exists, this surface
 * always works.
 *
 * The workspace id is a constant, because a visitor has no workspace. It
 * still exists so the spend lands in a bucket rather than nowhere — the
 * public bot's month is a thing somebody will want to read.
 */

import { respond } from '../respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Everyone who is not signed in shares one month's spend. */
const PUBLIC_WORKSPACE = 'public-site'

export async function POST(request: Request): Promise<Response> {
  return respond(request, 'site', PUBLIC_WORKSPACE)
}

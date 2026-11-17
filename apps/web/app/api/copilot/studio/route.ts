/**
 * POST /api/copilot/studio — "Ask Mirrorline" (spec 18 §2).
 *
 * The signed-in bot, about one client's own account. It explains and it
 * proposes; it executes nothing. §2.3 is the rule that shapes the response:
 * a proposal comes back as inert data with `requiresApproval` on it, and the
 * only thing that can carry out a change is the screen the client presses
 * Approve on. **There is no mutation anywhere in this route or below it**, and
 * a test asserts the adapter contains none either.
 *
 * ## The workspace id is a constant, and that is a stub worth naming
 *
 * There is no auth yet — `/sign-in` has no backend (D53) — so there is no
 * signed-in client to read a workspace from, and the demo workspace is the
 * only one that exists. The spend therefore all lands in one bucket.
 *
 * When auth arrives this is the line that changes, and the shape is already
 * right: `respond` takes the workspace as an argument precisely so that
 * reading it from a session is a one-line edit rather than a refactor. Until
 * then it is written down here rather than hidden, because a per-workspace
 * cap keyed to a constant is a cap on everybody at once.
 */

import { respond } from '../respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The demo workspace, until there is a session to read one from. */
const DEMO_WORKSPACE = 'demo'

export async function POST(request: Request): Promise<Response> {
  return respond(request, 'studio', DEMO_WORKSPACE)
}

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

import { readWeekSchedule } from '@/lib/workspace/read-week-schedule'

import { respond } from '../respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The demo workspace, until there is a session to read one from. */
const DEMO_WORKSPACE = 'demo'

/**
 * ## The week is read here, because a proposal has to name a real post (B2.2)
 *
 * The co-pilot can propose moving a post, and the screen performs it through
 * `movePostToSlot`. Before B2.2 the proposal was built from `@mirrorline/mock`,
 * which was also what the calendar drew — so the two agreed by construction.
 * The calendar now reads `scheduled_posts`, and the fixtures stopped being the
 * calendar: the proposal named an id that did not exist, and Approve answered
 * "We could not find that post".
 *
 * So the route reads the client's own week and hands it down. Read here rather
 * than sent by the client, for two reasons: the panel opens from any screen
 * under `/app/*` and only the calendar has the week in hand, and a post id
 * arriving from the browser would be a client telling the server which post to
 * propose moving — the policy would still refuse a foreign one, but there is no
 * reason to ask the question.
 */
export async function POST(request: Request): Promise<Response> {
  const { posts } = await readWeekSchedule()

  return respond(request, 'studio', DEMO_WORKSPACE, posts)
}

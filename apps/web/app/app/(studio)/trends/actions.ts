'use server'

/**
 * Starting a Niche Scan, from the studio (V1 §2.5, D119).
 *
 * ============================================================================
 * This starts a scan. It does not run one.
 * ============================================================================
 *
 * It used to `await runNicheScan(...)` and hand back the finished outcome,
 * which worked on a laptop and could not work anywhere we deploy: the first
 * live scan took six minutes against a 300-second function ceiling, and driven
 * through the real UI it ended in a client-side exception after 237 seconds
 * (D118).
 *
 * So the action writes a job and returns in milliseconds. A worker claims it
 * and does the minutes, and the screen polls until the report lands. The
 * research itself is unchanged — `runNicheScan` is the same function, called
 * from a process allowed to take as long as it takes. Nothing was turned down
 * to fit a limit.
 *
 * ============================================================================
 * The workspace is never taken from the form
 * ============================================================================
 *
 * Same rule as `settings/actions.ts`: the id comes from `getOwnedWorkspace()`,
 * so a tampered request cannot start a scan — or spend money — against
 * somebody else's workspace. The only thing the form supplies is the niche,
 * and that is text to research, not an identifier.
 *
 * ============================================================================
 * The cap still lives below this, and now it answers later
 * ============================================================================
 *
 * This action does no spend arithmetic. `runNicheScan` counts the real tokens,
 * reads the month from `agent_runs`, and refuses before calling — putting a
 * second, looser check here would create two answers to "may this run" and the
 * looser one would eventually win.
 *
 * **What changed is when the client hears about a refusal.** The cap is
 * checked in the worker now, so it cannot be the answer to the button press.
 * It arrives as the job's outcome instead, and the screen renders it as
 * information rather than as an error — the distinction `18 §6` asks for
 * survives the move, it just travels through `jobs.result` to get there.
 */

import { revalidatePath } from 'next/cache'

import { enqueueJob } from '@/lib/jobs/enqueue'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'

import type { ScanActionResult } from './scan-form-state'

/** Long enough for a real niche, short enough that it cannot carry a prompt. */
const MAX_NICHE_LENGTH = 120

export type { ScanActionResult }

/**
 * `_previous` is `useActionState`'s first argument, and is deliberately unused.
 *
 * The outcome depends only on this submission. A scan the cap refused a minute
 * ago says nothing about whether this one may run — `runNicheScan` re-reads the
 * month's spend every time — so carrying the old state forward would be caching
 * a decision that is meant to be re-made.
 */
export async function runNicheScanAction(
  _previous: ScanActionResult,
  formData: FormData,
): Promise<ScanActionResult> {
  const workspace = await getOwnedWorkspace()
  if (!workspace) {
    // An ordinary answer, not a failure: somebody who arrived by magic link
    // without finishing sign-up has a session and no workspace.
    return { status: 'failed', message: 'Finish setting up your workspace first.' }
  }

  const raw = formData.get('niche')
  const niche = typeof raw === 'string' ? raw.trim().slice(0, MAX_NICHE_LENGTH) : ''
  if (!niche) {
    return { status: 'failed', message: 'Tell us the niche to research.' }
  }

  const outcome = await enqueueJob({
    workspaceId: workspace.id,
    kind: 'niche-scan',
    payload: { niche },
  })

  if (outcome.status === 'failed') {
    return { status: 'failed', message: outcome.message }
  }

  /*
   * Re-render, because the screen's own progress state is a server read.
   *
   * `page.tsx` calls `readLatestScanJob()`, so the "Scanning…" panel only
   * appears once the route is re-rendered with the row this action just wrote.
   * Without this the button would return, the client would see nothing
   * different, and the honest conclusion would be that the press did nothing.
   */
  revalidatePath('/app/trends')

  if (outcome.status === 'already-pending') {
    // Not an error, and not a second job. Somebody pressed twice, or has two
    // tabs open — the right answer is to point at the scan already running.
    return { status: 'queued', message: 'A scan is already running for this workspace.' }
  }

  return { status: 'queued', message: `Scanning ${niche}.` }
}

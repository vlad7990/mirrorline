'use server'

/**
 * Running a Niche Scan, from the studio (V1, §2.5).
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
 * The cap lives below this, not here
 * ============================================================================
 *
 * This action does no spend arithmetic. `runNicheScan` counts the real tokens,
 * reads the month from `agent_runs`, and refuses before calling — putting a
 * second, looser check here would create two answers to "may this run" and the
 * looser one would eventually win.
 *
 * What this does own is the *shape* of the answer the screen gets: a scan the
 * cap refused is not an error, and must not render as one. The three outcomes
 * stay distinct all the way to the UI.
 */

import { revalidatePath } from 'next/cache'

import { runNicheScan } from '@/lib/niche-scan/scan'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'

/** Long enough for a real niche, short enough that it cannot carry a prompt. */
const MAX_NICHE_LENGTH = 120

export interface ScanActionResult {
  readonly status: 'complete' | 'refused' | 'failed'
  readonly message: string
}

export async function runNicheScanAction(formData: FormData): Promise<ScanActionResult> {
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

  const outcome = await runNicheScan({ workspaceId: workspace.id, niche })

  if (outcome.status === 'complete') {
    // The screen reads the latest report, so it has to be re-rendered rather
    // than served from the route cache.
    revalidatePath('/app/trends')
    return {
      status: 'complete',
      message: outcome.isSample
        ? 'Saved a sample report. Add an API key to run real research.'
        : `Scanned ${niche}.`,
    }
  }

  return { status: outcome.status, message: outcome.message }
}

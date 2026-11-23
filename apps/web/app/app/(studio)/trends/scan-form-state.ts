/**
 * The scan form's state, in a module a client component may import.
 *
 * **Its own file for the same reason `goals/target-form-state.ts` is.**
 * `actions.ts` is `'use server'`, so everything it exports becomes a server
 * reference. A type survives that — types are erased — but a *value* does not:
 * importing `IDLE_SCAN_STATE` from the action module into a client component
 * would mean asking the client bundle for a server export.
 *
 * So the shape and the idle value live here, and `actions.ts` imports them too.
 * One definition, usable from both sides.
 */

/**
 * The outcomes of *pressing the button*, kept distinct all the way to the
 * screen.
 *
 * ============================================================================
 * `complete` became `queued`, and `refused` moved house (D119)
 * ============================================================================
 *
 * The action no longer runs the scan — it writes a job and returns, because a
 * scan takes four to six minutes against a 300-second function ceiling
 * (D118). So a press can no longer report a finished scan, and the two
 * statuses that described one are gone from here:
 *
 * - **`complete` → `queued`.** The honest answer to the press is "it has
 *   started". Keeping `complete` would have had the form claim a report
 *   existed minutes before one did.
 * - **`refused` is now the *job's* outcome**, not the press's. The spend cap
 *   is checked in the worker, so the button cannot know. It still reaches the
 *   client and still as information rather than as an error — `18 §6`'s rule
 *   that a working cap must be *seen* working is unchanged — but it travels
 *   through `jobs.result` and the progress panel renders it. The type for it
 *   is `JobOutcome` in `lib/jobs/types.ts`.
 *
 * `failed` stayed, narrower than it was: an enqueue can genuinely fail, and
 * that is still our fault rather than the cap's.
 */
export type ScanStatus = 'idle' | 'queued' | 'failed'

export interface ScanActionResult {
  readonly status: ScanStatus
  readonly message: string
}

/** Before anything has been submitted. No message, because nothing happened. */
export const IDLE_SCAN_STATE: ScanActionResult = { status: 'idle', message: '' }

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
 * The outcomes, kept distinct all the way to the screen.
 *
 * `refused` is the one that matters: a scan the spend cap declined is **not an
 * error**, and rendering it as one would teach the reader to distrust a control
 * that is working exactly as `18 §6` asks. The cap exists to be seen working.
 */
export type ScanStatus = 'idle' | 'complete' | 'refused' | 'failed'

export interface ScanActionResult {
  readonly status: ScanStatus
  readonly message: string
}

/** Before anything has been submitted. No message, because nothing happened. */
export const IDLE_SCAN_STATE: ScanActionResult = { status: 'idle', message: '' }

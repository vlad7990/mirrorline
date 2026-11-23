/**
 * The profile form's state, in a module a client component may import.
 *
 * Its own file for the reason `scan-form-state.ts` is: `actions.ts` is
 * `'use server'`, so every value it exports becomes a server reference. A type
 * survives that — types are erased — but `IDLE_PROFILE_STATE` would not.
 */

export type ProfileStatus = 'idle' | 'saved' | 'failed'

export interface ProfileActionResult {
  readonly status: ProfileStatus
  readonly message: string
}

export const IDLE_PROFILE_STATE: ProfileActionResult = { status: 'idle', message: '' }

/**
 * The shape the target form and its action agree on.
 *
 * Separate from `actions.ts` for the reason `app/(auth)/auth-form-state.ts`
 * records: a `'use server'` file may export only async functions, and an
 * exported object there becomes a callable endpoint or a build error.
 *
 * `keyResultId` travels back with the state because one screen renders many
 * targets and they share a single action. Without it, a message about one key
 * result would appear under all of them.
 */

export type TargetStatus = 'idle' | 'saved' | 'error'

export interface TargetFormState {
  readonly status: TargetStatus
  readonly message: string | null
  /** Which key result this state belongs to; null while idle. */
  readonly keyResultId: string | null
}

export const IDLE_TARGET_STATE: TargetFormState = {
  status: 'idle',
  message: null,
  keyResultId: null,
}

/**
 * The shape the delete dialog and its action agree on.
 *
 * Separate from `actions.ts` for the reason `app/(auth)/auth-form-state.ts`
 * records: a `'use server'` file may only export async functions, and the build
 * refuses an exported object with *"A 'use server' file can only export async
 * functions, found object"*. `IDLE_DELETE_STATE` is that object.
 */

export type DeleteWorkspaceStatus = 'idle' | 'error'

export interface DeleteWorkspaceState {
  readonly status: DeleteWorkspaceStatus
  /**
   * Shown inside the dialog, above the confirmation field. Always a sentence
   * written here — never a Postgres message, which for this function would be
   * "only an owner may delete a workspace".
   */
  readonly message: string | null
}

export const IDLE_DELETE_STATE: DeleteWorkspaceState = { status: 'idle', message: null }

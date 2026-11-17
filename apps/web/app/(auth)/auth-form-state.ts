/**
 * The shape the auth forms and their actions agree on.
 *
 * **A separate module because `actions.ts` is `'use server'`, and such a file
 * may only export async functions.** These started there and the build refused
 * it — *"A 'use server' file can only export async functions, found object"* —
 * which turns out to be a good rule: anything exported from that file becomes
 * a callable server endpoint, and a constant masquerading as one would be a
 * quiet surprise.
 *
 * Importing these into a client component costs nothing: with no `'use server'`
 * boundary there is no serialisation, so the type travels at compile time and
 * the constant is inlined.
 */

export type AuthStatus = 'idle' | 'error' | 'check-email' | 'sent'

export interface AuthFormState {
  readonly status: AuthStatus
  /**
   * Shown to the person. **Never a provider's raw message** — `actions.ts`
   * flattens Supabase's `Invalid login credentials` into one sentence, so that
   * no reply tells "no such account" apart from "wrong password".
   */
  readonly message: string | null
}

export const IDLE_AUTH_STATE: AuthFormState = { status: 'idle', message: null }

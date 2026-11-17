/**
 * The shape the onboarding wizard and its action agree on.
 *
 * A separate module for the same reason as `app/(auth)/auth-form-state.ts`:
 * `actions.ts` is `'use server'`, and such a file may only export async
 * functions — anything else exported from it would become a callable endpoint.
 *
 * Deliberately **not** reusing `AuthFormState`. Its statuses are `check-email`
 * and `sent`, which are facts about an email provider; onboarding either saved
 * the answers or could not. Sharing the type would mean two screens reading
 * states that can never occur on them.
 */

export type OnboardingStatus = 'idle' | 'error'

export interface OnboardingFormState {
  readonly status: OnboardingStatus
  /**
   * Shown next to the fields. Written by `parseOnboardingSubmission`, which
   * names the field and says what to do — never a Postgres message.
   */
  readonly message: string | null
}

export const IDLE_ONBOARDING_STATE: OnboardingFormState = { status: 'idle', message: null }

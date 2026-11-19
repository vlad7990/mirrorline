'use client'

/**
 * Setting a new password, after the emailed link has been exchanged.
 *
 * By the time this renders, `/auth/callback` has swapped the link's one-time
 * code for a session — so the person is, briefly, signed in. That is what lets
 * `updatePassword` work without asking for the old one, and it is also why the
 * action checks for a session before trying: **no session means the link was
 * stale or already used**, which is a different problem from a bad password and
 * gets its own sentence rather than a generic failure.
 */

import { Button, Input, Label } from '@mirrorline/ui'
import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { updatePassword } from '../actions'
import { IDLE_AUTH_STATE, type AuthFormState } from '../auth-form-state'

const MIN_PASSWORD_LENGTH = 12

/** Matches the other auth screens: see the note on `LINK_CLASS` in `auth-forms.tsx`. */
const LINK_CLASS = 'text-gold-bright underline underline-offset-4'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="gold" size="lg" fullWidth className="press" disabled={pending}>
      Set the new password
    </Button>
  )
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    updatePassword,
    IDLE_AUTH_STATE,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Set a new password</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          Choose something you have not used elsewhere. Once it is saved you will be signed in.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.status === 'error' ? (
          <p
            id="set-password-error"
            role="alert"
            className="m-0 rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-meta font-semibold text-on-danger-soft"
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            aria-describedby={state.status === 'error' ? 'set-password-error' : undefined}
          />
          <span className="text-meta text-text-muted">
            At least {MIN_PASSWORD_LENGTH} characters. A short sentence works well.
          </span>
        </div>

        <SubmitButton />
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        Changed your mind?{' '}
        <Link href="/sign-in" className={LINK_CLASS}>
          Back to sign in
        </Link>
        .
      </p>
    </div>
  )
}

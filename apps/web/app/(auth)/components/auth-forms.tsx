'use client'

/**
 * The sign-in and sign-up forms.
 *
 * Wording follows docs/design/STITCH_REVIEW.md item 7: "Password", not "Studio
 * master password"; "Sign in", not "Sign In to Studio". F5 added the two
 * states 19 v2 asks for — the failed sign-in (★2) and the forgotten password
 * (★3) — and replaced the example address (★4).
 *
 * ============================================================================
 * B1: there is a server now
 * ============================================================================
 *
 * These forms used to validate what was on screen and walk into the studio.
 * Every note saying so is gone, because it would now be false: the actions in
 * `../actions.ts` sign people in, create accounts and send real mail.
 *
 * **The error states did not change, and that is the point.** ★2's rule —
 * "said plainly and without saying which half was wrong" — was a decision the
 * mock could keep for free. The server keeps it deliberately: one sentence for
 * an unknown address, a wrong password and an unconfirmed account alike,
 * because a form that says "wrong password" has confirmed the address is
 * registered.
 *
 * ============================================================================
 * What went, and what arrived
 * ============================================================================
 *
 * **The Google and Apple buttons are gone.** `BACKEND_PHASE.md` §1 rules out
 * social login — "it adds an OAuth app per provider for a product whose users
 * arrive from a sales conversation" — so neither could ever have worked. A
 * control that cannot do what it says is exactly what D80 was about, and two
 * of them sat at the top of this page.
 *
 * **A magic link took their place**, which gives the "or" divider something
 * true to divide: a password, or a link in the post. It is also the only way
 * in for somebody who never set a password.
 *
 * **"Remember me" (D58) is possible for the first time**, because until this
 * week there was no session to keep. `lib/supabase/cookie-policy.ts` says what
 * it changes; the short version is on the label.
 */

import { Button, Checkbox, Input, Label } from '@mirrorline/ui'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { NEXT_PARAM } from '@/lib/auth/redirect-rules'

import {
  requestPasswordReset,
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from '../actions'
import { IDLE_AUTH_STATE, type AuthFormState } from '../auth-form-state'

/**
 * The example address, and why it is this one.
 *
 * It used to be `maya@mayatorres.example` — the demo workspace's owner. 19 v2
 * ★/sign-in item 4 rules that out: "a **neutral example email** in every
 * placeholder. No real-looking person, no `@gmail`, nothing that reads as a
 * customer we have."
 *
 * `.example` is reserved by RFC 2606 and can never be registered, so this
 * placeholder cannot quietly become a real person's inbox.
 */
export const EXAMPLE_EMAIL = 'you@your-business.example'

/**
 * SC 1.4.1: a link inside a paragraph may not be told apart by colour alone,
 * so the underline is always on, not only on hover.
 *
 * **`text-gold-bright`, not `text-accent`, and that is the D40 trap again.**
 * `--color-accent` is one of the tokens the band utilities do *not* pin: it
 * resolves from `:root` or `.dark` depending on what the visitor's operating
 * system asked for, and D25 says the public site's bands are "art direction,
 * not a theme". `gold-bright` is fixed — 9.8:1 on ink, the same for everybody.
 */
const LINK_CLASS = 'text-gold-bright underline underline-offset-4'

const MIN_PASSWORD_LENGTH = 12

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <span className="text-meta text-text-muted">{hint}</span> : null}
    </div>
  )
}

function OrDivider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="eyebrow">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

/** The shape every error on these pages takes. */
function FormError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="m-0 rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-meta font-semibold text-on-danger-soft"
    >
      {children}
    </p>
  )
}

/** A confirmation. A different thing from an error, and it should not look like one. */
function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="m-0 text-meta text-text-muted">
      {children}
    </p>
  )
}

/**
 * The submit button, disabled while the action is in flight.
 *
 * Its own component because `useFormStatus` only reports on the form above it.
 * Without this a double click sends two sign-ups — which is the reason the
 * bootstrap RPC is called `ensure_…` rather than `create_…`.
 */
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="gold" size="lg" fullWidth className="press" disabled={pending}>
      {children}
    </Button>
  )
}

/** "Remember me" (D58), with the honest half of what it does on the label. */
function RememberMe({ id }: { id: string }) {
  const [isChecked, setIsChecked] = React.useState(false)

  return (
    <div className="flex items-start gap-1">
      {/* The hidden input is what reaches the action: a Radix checkbox renders
          a button, and a button submits no value. */}
      {isChecked ? <input type="hidden" name="remember" value="1" /> : null}
      <Checkbox
        id={id}
        checked={isChecked}
        onCheckedChange={(checked) => setIsChecked(checked === true)}
        className="-ml-3"
      />
      <Label htmlFor={id} className="pt-3 text-body font-normal">
        Keep me signed in on this device
      </Label>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                     */
/* -------------------------------------------------------------------------- */

type SignInView = 'sign-in' | 'forgot' | 'magic-link'

export function SignInForm() {
  const [view, setView] = React.useState<SignInView>('sign-in')

  if (view === 'forgot') return <ForgotPassword onBack={() => setView('sign-in')} />
  if (view === 'magic-link') return <MagicLink onBack={() => setView('sign-in')} />

  return <SignIn onForgot={() => setView('forgot')} onMagicLink={() => setView('magic-link')} />
}

function SignIn({ onForgot, onMagicLink }: { onForgot: () => void; onMagicLink: () => void }) {
  const searchParams = useSearchParams()
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signInWithPassword,
    IDLE_AUTH_STATE,
  )

  const next = searchParams.get(NEXT_PARAM)
  const hasStaleLink = searchParams.get('notice') === 'that-link-did-not-work'
  const hasFailed = state.status === 'error'

  return (
    <div className="flex flex-col gap-6">
      {/* The page's `<h1>` lives here rather than in the page, because the card
          has three states and they are not the same page. "Welcome back" over
          a password-reset form is the kind of leftover heading that makes a
          screen feel unfinished. */}
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Welcome back</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          Pick up where you left off: today&rsquo;s cuts, what needs your eye, and what is going out
          this evening.
        </p>
      </div>

      {hasStaleLink ? (
        <FormNotice>
          That link had already been used, or it expired. Sign in below, or ask for a new one.
        </FormNotice>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        {next !== null ? <input type="hidden" name={NEXT_PARAM} value={next} /> : null}

        {/* The error sits above both fields on purpose. ★2: "said plainly and
            without saying which half was wrong." Anchoring it under the
            password would answer the question the message refuses to answer —
            and that is also what makes addresses enumerable. */}
        {hasFailed ? <FormError id="sign-in-error">{state.message}</FormError> : null}

        <Field label="Email" htmlFor="sign-in-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={hasFailed || undefined}
            aria-describedby={hasFailed ? 'sign-in-error' : undefined}
          />
        </Field>

        <Field label="Password" htmlFor="sign-in-password">
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={hasFailed || undefined}
            aria-describedby={hasFailed ? 'sign-in-error' : undefined}
          />
        </Field>

        <RememberMe id="sign-in-remember" />

        <SubmitButton>Sign in</SubmitButton>

        {/* A button rather than a link: the state lives in this card, and a
            link whose href is the page it is already on is a control that lies
            about where it goes. */}
        <p className="m-0 text-meta text-text-muted">
          <button type="button" onClick={onForgot} className={`${LINK_CLASS} bg-transparent p-0`}>
            Forgot your password?
          </button>
        </p>
      </form>

      <OrDivider>Or get a link</OrDivider>

      <Button variant="secondary" size="lg" fullWidth className="press" onClick={onMagicLink}>
        Email me a sign-in link
      </Button>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        New here?{' '}
        <Link href="/sign-up" className={LINK_CLASS}>
          Create an account
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * The magic-link state.
 *
 * `shouldCreateUser: false` in the action, so this signs existing people in
 * and never creates an account — a link that quietly made one would skip the
 * rights confirmation non-negotiable 1 requires. The confirmation is the same
 * whether or not the address has an account, for the reason under the reset
 * form.
 */
function MagicLink({ onBack }: { onBack: () => void }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    sendMagicLink,
    IDLE_AUTH_STATE,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Get a sign-in link</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          We will email a link that signs you in without a password. It works once.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.status === 'error' ? (
          <FormError id="magic-link-error">{state.message}</FormError>
        ) : null}

        <Field label="Email" htmlFor="magic-link-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="magic-link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={state.status === 'error' ? 'magic-link-error' : undefined}
          />
        </Field>

        <SubmitButton>Email me a link</SubmitButton>

        {state.status === 'sent' ? <FormNotice>{state.message}</FormNotice> : null}
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        <button type="button" onClick={onBack} className={`${LINK_CLASS} bg-transparent p-0`}>
          Back to sign in
        </button>
      </p>
    </div>
  )
}

/**
 * The forgotten-password state (★3).
 *
 * The confirmation is deliberately the same whatever is typed. Telling
 * somebody "there is no account for that address" hands over a way to test
 * which addresses are registered, one submission at a time, and the cost of
 * refusing is one slightly vaguer sentence.
 */
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    IDLE_AUTH_STATE,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Reset your password</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          Give us the address you signed up with, and we will send a link to set a new one.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.status === 'error' ? <FormError id="reset-error">{state.message}</FormError> : null}

        <Field label="Email" htmlFor="reset-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-describedby={state.status === 'error' ? 'reset-error' : undefined}
          />
        </Field>

        <SubmitButton>Send the reset link</SubmitButton>

        {state.status === 'sent' ? <FormNotice>{state.message}</FormNotice> : null}
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        <button type="button" onClick={onBack} className={`${LINK_CLASS} bg-transparent p-0`}>
          Back to sign in
        </button>
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sign up                                                                     */
/* -------------------------------------------------------------------------- */

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'

export function SignUpForm() {
  const searchParams = useSearchParams()
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signUpWithPassword,
    IDLE_AUTH_STATE,
  )

  const [ownsRights, setOwnsRights] = React.useState(false)

  /**
   * The choices carried from the public site.
   *
   * `who` and `account` are the parameter names `lib/audience/account-type.ts`
   * already uses, so a visitor who picked "individual / new" out there is not
   * asked again in here. Anything unrecognised is dropped by the action and
   * onboarding asks — a default would be an answer we invented on their
   * behalf.
   */
  const carried: Readonly<Record<string, string | null>> = {
    who: searchParams.get('who'),
    account: searchParams.get('account'),
    goal: searchParams.get('goal'),
  }

  if (state.status === 'check-email') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="m-0 font-heading text-subtitle text-text">Check your email</h2>
        <FormNotice>{state.message}</FormNotice>
        <p className="m-0 text-meta text-text-muted">
          Already confirmed?{' '}
          <Link href="/sign-in" className={LINK_CLASS}>
            Sign in
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        {Object.entries(carried).map(([name, value]) =>
          value === null ? null : <input key={name} type="hidden" name={name} value={value} />,
        )}

        {state.status === 'error' ? (
          <FormError id="sign-up-rights-error">{state.message}</FormError>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="sign-up-name">
            <Input id="sign-up-name" name="name" autoComplete="name" required />
          </Field>

          <Field label="Work email" htmlFor="sign-up-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
            <Input id="sign-up-email" name="email" type="email" autoComplete="email" required />
          </Field>
        </div>

        <Field
          label="Workspace name"
          htmlFor="sign-up-workspace"
          hint="Usually your business or practice name. You can change it later."
        >
          <Input id="sign-up-workspace" name="workspace" autoComplete="organization" required />
        </Field>

        <Field
          label="Password"
          htmlFor="sign-up-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`}
        >
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1">
            {/* The checked state reaches the action as a value, and the server
                checks it again — that is the half a crafted request cannot
                skip. */}
            {ownsRights ? <input type="hidden" name="rights" value="1" /> : null}
            <Checkbox
              id="sign-up-rights"
              checked={ownsRights}
              onCheckedChange={(checked) => setOwnsRights(checked === true)}
              aria-describedby={state.status === 'error' ? 'sign-up-rights-error' : undefined}
              className="-ml-3"
            />
            <Label htmlFor="sign-up-rights" className="pt-3 text-body font-normal">
              {RIGHTS_LABEL}
            </Label>
          </div>
        </div>

        <RememberMe id="sign-up-remember" />

        <SubmitButton>Create your workspace</SubmitButton>

        <p className="m-0 text-meta text-text-muted">
          By creating a workspace you accept our{' '}
          <Link href="/terms" className={LINK_CLASS}>
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className={LINK_CLASS}>
            privacy notice
          </Link>
          . Both are drafts, and neither has been reviewed by a lawyer.
        </p>
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className={LINK_CLASS}>
          Sign in
        </Link>
        .
      </p>
    </div>
  )
}

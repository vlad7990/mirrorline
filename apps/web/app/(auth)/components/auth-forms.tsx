'use client'

/**
 * The sign-in and sign-up forms.
 *
 * There is no auth backend, so neither form sends anything: they validate what
 * is on screen and move you into the studio. That is honest in code as well as
 * in copy — nothing here pretends to check a password, and the note under the
 * sign-in form says so rather than leaving someone to assume the password they
 * actually use was just transmitted somewhere.
 *
 * Wording follows docs/design/STITCH_REVIEW.md item 7: "Password", not "Studio
 * master password"; "Sign in", not "Sign In to Studio".
 *
 * F5 adds the two states 19 v2 asks for — the failed sign-in (★2) and the
 * forgotten password (★3) — and replaces the example address (★4).
 */

import { Button, Checkbox, Input, Label } from '@mirrorline/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ONBOARDING, STUDIO_HOME } from '@/lib/routes'

/**
 * The example address, and why it changed.
 *
 * It used to be `maya@mayatorres.example` — the demo workspace's owner. 19 v2
 * ★/sign-in item 4 rules that out: "a **neutral example email** in every
 * placeholder. No real-looking person, no `@gmail`, nothing that reads as a
 * customer we have." A plausible full name in the sign-in field of a product
 * with no customers is the smallest possible version of inventing one, and it
 * costs nothing to not do.
 *
 * `.example` is reserved by RFC 2606 and cannot be registered by anybody, so
 * this placeholder can never quietly become a real person's inbox.
 */
export const EXAMPLE_EMAIL = 'you@your-business.example'

/**
 * Addresses that cannot be accounts, which is what makes the error state real.
 *
 * ★2 asks for a failed sign-in, and a form with no backend cannot fail one
 * honestly — every password is as right as every other. This is the one case
 * where the answer is genuinely knowable: `.example` is a reserved domain, so
 * no address under it is ever a real account, and handing the example address
 * back as a working credential would be its own small lie.
 *
 * So copying the placeholder shows the error. It is deterministic, it is
 * true, and it makes the state reachable by anybody looking at the page.
 */
function cannotBeAnAccount(email: string): boolean {
  return email.trim().toLowerCase().endsWith('.example')
}

/**
 * SC 1.4.1: a link inside a paragraph may not be told apart by colour alone,
 * so the underline is always on, not only on hover. Matches the links on the
 * results page and in the upload dropzone.
 *
 * **`text-gold-bright`, not `text-accent`, and that is the D40 trap one more
 * time.** These pages were light, so the old value was `text-primary
 * dark:text-accent`. They are `band-ink` now, and `--color-accent` is one of
 * the tokens the band utilities do *not* pin: it resolves to `#c8a24a` from
 * `:root` or `#f5b83d` from `.dark` depending on what the visitor's operating
 * system asked for. Both happen to clear AA on ink, so nothing would have
 * failed — which is exactly why it is worth naming. D25 says the public
 * site's bands are "art direction, not a theme … `.dark` does not reach it",
 * and a link that changes colour with the OS on an ink band has let it reach.
 * `gold-bright` is a fixed value: 9.8:1 on ink, and the same for everybody.
 */
const LINK_CLASS = 'text-gold-bright underline underline-offset-4'

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

/**
 * Google and Apple sign-in, as plain labelled buttons. DESIGN.md: "Don't show
 * ... real brand logos", so the provider is named in words rather than drawn.
 */
function ProviderButtons() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button variant="secondary" size="lg" fullWidth className="press">
        Continue with Google
      </Button>
      <Button variant="secondary" size="lg" fullWidth className="press">
        Continue with Apple
      </Button>
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

/* -------------------------------------------------------------------------- */
/* Sign in                                                                     */
/* -------------------------------------------------------------------------- */

/** Which of the two things this card is showing. */
type SignInView = 'sign-in' | 'forgot'

export function SignInForm() {
  const router = useRouter()
  const [view, setView] = React.useState<SignInView>('sign-in')

  return view === 'forgot' ? (
    <ForgotPassword onBack={() => setView('sign-in')} />
  ) : (
    <SignIn onForgot={() => setView('forgot')} onDone={() => router.push(STUDIO_HOME)} />
  )
}

function SignIn({ onForgot, onDone }: { onForgot: () => void; onDone: () => void }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [hasFailed, setHasFailed] = React.useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (cannotBeAnAccount(email)) {
      setHasFailed(true)
      return
    }

    onDone()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The page's `<h1>` lives in here rather than in the page, because the
          card has two states and they are not the same page. "Welcome back"
          over a password-reset form is the kind of leftover heading that
          makes a screen feel unfinished. */}
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Welcome back</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          Pick up where you left off: today&rsquo;s cuts, what needs your eye, and what is going
          out this evening.
        </p>
      </div>

      <ProviderButtons />
      <OrDivider>Or use your email</OrDivider>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* The error sits above both fields on purpose. ★2: "said plainly and
            without saying which half was wrong." Anchoring it under the
            password would answer the question the message is refusing to
            answer, and it is also what makes addresses enumerable — a form
            that says "wrong password" has confirmed the account exists. */}
        {hasFailed ? (
          <FormError id="sign-in-error">
            We could not sign you in with those details. Check the address and the password, then
            try again.
          </FormError>
        ) : null}

        <Field label="Email" htmlFor="sign-in-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={hasFailed || undefined}
            aria-describedby={hasFailed ? 'sign-in-error' : undefined}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setHasFailed(false)
            }}
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
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setHasFailed(false)
            }}
          />
        </Field>

        <Button type="submit" variant="gold" size="lg" fullWidth className="press">
          Sign in
        </Button>

        {/* A button rather than a link: there is no /forgot-password route to
            send anyone to, and a link whose href is the page it is already on
            is a control that lies about where it goes. */}
        <p className="m-0 text-meta text-text-muted">
          <button type="button" onClick={onForgot} className={`${LINK_CLASS} bg-transparent p-0`}>
            Forgot your password?
          </button>
        </p>
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        There are no accounts yet, so nothing here is checked against anything and no password is
        sent anywhere. Signing in opens the sample studio.
      </p>

      <p className="m-0 text-meta text-text-muted">
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
 * The forgotten-password state (★3).
 *
 * The confirmation is deliberately the same whatever is typed. Telling
 * somebody "there is no account for that address" hands an attacker a way to
 * test which addresses are registered, one submission at a time, and the cost
 * of refusing to is one slightly vaguer sentence.
 */
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = React.useState('')
  const [isSent, setIsSent] = React.useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSent(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Reset your password</h1>
        <p className="m-0 max-w-[48ch] text-body text-text-muted">
          Give us the address you signed up with, and we will send a link to set a new one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="reset-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="gold" size="lg" fullWidth className="press">
          Send the reset link
        </Button>

        {isSent ? (
          <p role="status" className="m-0 text-meta text-text-muted">
            If an account exists for that address, a reset link is on its way. We say it that way
            round on purpose: confirming which addresses are registered would be a way to find
            out, one guess at a time.
          </p>
        ) : null}
      </form>

      <p className="m-0 border-t border-border pt-4 text-meta text-text-muted">
        Nothing is sent today. No mail goes out from this build, and no address typed here is
        stored.
      </p>

      <p className="m-0 text-meta text-text-muted">
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

interface SignUpValues {
  readonly name: string
  readonly email: string
  readonly workspace: string
  readonly password: string
}

const EMPTY_SIGN_UP: SignUpValues = { name: '', email: '', workspace: '', password: '' }

const RIGHTS_LABEL = 'I own or have the rights to everything I upload.'
const MIN_PASSWORD_LENGTH = 12

export function SignUpForm() {
  const router = useRouter()
  const [values, setValues] = React.useState<SignUpValues>(EMPTY_SIGN_UP)
  const [ownsRights, setOwnsRights] = React.useState(false)
  const [showRightsError, setShowRightsError] = React.useState(false)

  function update(field: keyof SignUpValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Non-negotiable 1: we cannot take an upload without this confirmation.
    if (!ownsRights) {
      setShowRightsError(true)
      return
    }
    router.push(ONBOARDING)
  }

  return (
    <div className="flex flex-col gap-6">
      <ProviderButtons />
      <OrDivider>Or use your email</OrDivider>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="sign-up-name">
            <Input
              id="sign-up-name"
              name="name"
              autoComplete="name"
              required
              value={values.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </Field>

          <Field label="Work email" htmlFor="sign-up-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
            <Input
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Workspace name"
          htmlFor="sign-up-workspace"
          hint="Usually your business or practice name. You can change it later."
        >
          <Input
            id="sign-up-workspace"
            name="workspace"
            autoComplete="organization"
            required
            value={values.workspace}
            onChange={(event) => update('workspace', event.target.value)}
          />
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
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1">
            <Checkbox
              id="sign-up-rights"
              checked={ownsRights}
              onCheckedChange={(checked) => {
                setOwnsRights(checked === true)
                if (checked === true) setShowRightsError(false)
              }}
              aria-describedby={showRightsError ? 'sign-up-rights-error' : undefined}
              className="-ml-3"
            />
            <Label htmlFor="sign-up-rights" className="pt-3 text-body font-normal">
              {RIGHTS_LABEL}
            </Label>
          </div>
          {showRightsError ? (
            <FormError id="sign-up-rights-error">
              We can only work from material you own or hold the rights to, so we need this one.
            </FormError>
          ) : null}
        </div>

        <Button type="submit" variant="gold" size="lg" fullWidth className="press">
          Create your workspace
        </Button>

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

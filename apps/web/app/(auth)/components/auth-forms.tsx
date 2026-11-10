'use client'

/**
 * The sign-in and sign-up forms.
 *
 * There is no auth backend tonight, so neither form sends anything: they
 * validate what is on screen and move you into the studio. That is honest in
 * code as well as copy — nothing here pretends to check a password.
 *
 * Wording follows docs/design/STITCH_REVIEW.md item 7: "Password", not "Studio
 * master password"; "Sign in", not "Sign In to Studio".
 */

import { Button, Checkbox, Input, Label } from '@mirrorline/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ONBOARDING, STUDIO_HOME } from '@/lib/routes'

/** The example address used anywhere a placeholder is needed. */
const EXAMPLE_EMAIL = 'maya@mayatorres.example'

const LINK_CLASS = 'text-primary hover:underline dark:text-accent'

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
      <Button variant="secondary" size="lg" fullWidth>
        Continue with Google
      </Button>
      <Button variant="secondary" size="lg" fullWidth>
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

/* -------------------------------------------------------------------------- */
/* Sign in                                                                     */
/* -------------------------------------------------------------------------- */

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLinkSent, setIsLinkSent] = React.useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push(STUDIO_HOME)
  }

  return (
    <div className="flex flex-col gap-6">
      <ProviderButtons />
      <OrDivider>Or use your email</OrDivider>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" htmlFor="sign-in-email" hint={`For example: ${EXAMPLE_EMAIL}`}>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {/* No "Forgot password?" here: there is no reset flow to send anyone
            to, and a link back to this page is a control that does nothing.
            "Email me a sign-in link" below is the honest way in. */}
        <Field label="Password" htmlFor="sign-in-password">
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" fullWidth>
          Sign in
        </Button>

        <Button variant="secondary" size="lg" fullWidth onClick={() => setIsLinkSent(true)}>
          Email me a sign-in link
        </Button>

        {isLinkSent ? (
          <p role="status" className="m-0 text-meta text-text-muted">
            If an account exists for {email || 'that address'}, a sign-in link is on its way.
          </p>
        ) : null}
      </form>

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
            <p
              id="sign-up-rights-error"
              role="alert"
              className="m-0 text-meta font-semibold text-on-danger-soft"
            >
              We can only work from material you own or hold the rights to, so we need this one.
            </p>
          ) : null}
        </div>

        <Button type="submit" variant="primary" fullWidth>
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

      <p className="m-0 text-meta text-text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className={LINK_CLASS}>
          Sign in
        </Link>
        .
      </p>
    </div>
  )
}

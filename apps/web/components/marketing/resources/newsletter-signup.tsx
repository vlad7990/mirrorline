'use client'

/**
 * The newsletter signup (19 v2 ★/resources item 5).
 *
 * The spec's wording is the specification: "**Newsletter signup with explicit
 * consent, and the form sends nothing: no address is stored and no email is
 * sent. The screen says so before anyone types.**" Three separate commitments,
 * and each shows up here as something structural rather than as copy:
 *
 *   - **Explicit consent.** The checkbox starts unticked and submitting
 *     without it fails with a visible error. A pre-ticked box is not consent
 *     in any regime that uses the word, and "by subscribing you agree" is the
 *     thing explicit consent exists to rule out.
 *   - **It sends nothing.** There is no fetch in this file, no action and no
 *     endpoint. The address lives in React state for as long as the tab is
 *     open, and goes nowhere. That is checkable by reading the file, which is
 *     the point — a promise in copy is only ever as good as the network tab.
 *   - **It says so first.** The notice renders *above* the field, not in the
 *     confirmation. Telling someone what happened to their address after they
 *     have typed it is not the same as telling them before.
 */

import { Button, Checkbox, Input, Label } from '@mirrorline/ui'
import * as React from 'react'

/**
 * The example address, and why it is this one.
 *
 * 19 v2 ★/sign-in item 4 asks for "a neutral example email … no real-looking
 * person, no `@gmail`, nothing that reads as a customer we have". The same
 * reasoning applies here, so the same address is used: `.example` is reserved
 * by RFC 2606 for exactly this and cannot be registered by anyone, so a
 * placeholder can never quietly become a real person's inbox.
 */
export const EXAMPLE_EMAIL = 'you@your-business.example'

export function NewsletterSignup() {
  const [email, setEmail] = React.useState('')
  const [hasConsented, setHasConsented] = React.useState(false)
  const [showConsentError, setShowConsentError] = React.useState(false)
  const [isDone, setIsDone] = React.useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasConsented) {
      setShowConsentError(true)
      return
    }

    // There is no request here, and there is not meant to be one. The list
    // does not exist yet; building the form that would join it is in scope,
    // and quietly collecting addresses against the day it does is not.
    setIsDone(true)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Before the field, not after it. */}
      <p className="m-0 max-w-[60ch] text-body text-text-muted">
        <strong className="font-semibold text-text">This form does not send anything yet.</strong>{' '}
        There is no list to join: nothing you type is stored, nothing leaves this page, and no
        email will arrive. It is here so that the thing we would build is visible before it is
        built.
      </p>

      <form onSubmit={handleSubmit} className="flex max-w-[34rem] flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newsletter-email">Email</Label>
          <Input
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={EXAMPLE_EMAIL}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-1">
            <Checkbox
              id="newsletter-consent"
              checked={hasConsented}
              onCheckedChange={(checked) => {
                setHasConsented(checked === true)
                if (checked === true) setShowConsentError(false)
              }}
              aria-describedby={showConsentError ? 'newsletter-consent-error' : undefined}
              className="-ml-3"
            />
            <Label htmlFor="newsletter-consent" className="pt-3 text-body font-normal">
              Email me when there is something worth reading. I can stop at any time, and the
              address is used for nothing else.
            </Label>
          </div>

          {showConsentError ? (
            <p
              id="newsletter-consent-error"
              role="alert"
              className="m-0 text-meta font-semibold text-on-danger-soft"
            >
              Please tick the box. We will not add an address unless it has been asked for
              explicitly.
            </p>
          ) : null}
        </div>

        <div>
          <Button type="submit" variant="primary" className="press">
            Sign me up when it exists
          </Button>
        </div>

        {isDone ? (
          <p role="status" className="m-0 text-meta text-text-muted">
            Nothing was sent and nothing was saved — that is what this button does today. When
            there is a first issue, this page will say so.
          </p>
        ) : null}
      </form>
    </div>
  )
}

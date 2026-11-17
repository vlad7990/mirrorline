/**
 * /sign-in — the form, and nothing else.
 *
 * **The studio teaser is gone, and losing it is the point.** This page used to
 * put today's sample schedule and all seven agent pills in a panel beside the
 * form: the Stitch "live session teaser", rebuilt from the demo fixtures and
 * labelled "Sample data". It was honest, and it was in the wrong place. 19 v2
 * ★/sign-in item 5 says these two pages "have no reels and no final CTA —
 * they are a door, not a page of argument", and a panel of somebody else's
 * posting schedule is an argument. Anyone on this page has already decided;
 * what they want is the field.
 *
 * The heading lives in `SignInForm`, because the card has two states and
 * "Welcome back" is wrong over the password-reset one.
 */

import type { Metadata } from 'next'
import * as React from 'react'

import { SignInForm } from '../components/auth-forms'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Mirrorline studio.',
}

export default function SignInPage() {
  // The form reads `next` and `notice` from the URL, so it calls
  // `useSearchParams` — which Next requires inside a Suspense boundary on a
  // statically rendered page. The page stays static; only the form waits.
  return (
    <React.Suspense fallback={<div className="min-h-[30rem]" aria-hidden="true" />}>
      <SignInForm />
    </React.Suspense>
  )
}

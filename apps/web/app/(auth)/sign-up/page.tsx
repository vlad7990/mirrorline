/**
 * /sign-up — the form, then what happens after the button.
 *
 * The Stitch screen puts a testimonial beside this form. It is fictional, so
 * it does not ship (docs/design/STITCH_REVIEW.md item 1). What replaced it was
 * the only thing we can honestly promise at this point — the three steps that
 * follow — and F5 keeps those while moving them under the form rather than
 * into a second column.
 *
 * **Under, not beside, because the page is one column now.** 19 v2 ★/sign-in
 * item 1 puts the shared image down one side, which is where the second
 * column used to be. Three short steps are not an argument for signing up
 * (★5 rules those out); they are a description of the next five minutes, and
 * someone about to hand over a password is entitled to it beforehand rather
 * than after.
 *
 * `Card tone="ink"` came off the rights note. Inside `band-ink` that is a
 * component pinning its own palette on top of a band that has already
 * remapped the tokens — exactly the shape D52 names — and it buys nothing
 * here, because the band is already ink.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { SignUpForm } from '../components/auth-forms'

export const metadata: Metadata = {
  title: 'Create an account',
  description:
    'Create your Mirrorline workspace: brand voice, your own accounts, your first video.',
}

interface OnboardingStep {
  readonly id: string
  readonly title: string
  readonly line: string
}

const STEPS: readonly OnboardingStep[] = [
  {
    id: 'brand',
    title: 'Set your brand voice and caption style',
    line: 'Colours, fonts, caption look, the words you always use and the ones you never do. About five minutes.',
  },
  {
    id: 'accounts',
    title: 'Connect your own accounts',
    line: 'Instagram, TikTok and YouTube, through their official APIs. You can disconnect any of them at any time. TikTok posts and YouTube uploads stay private until those platforms have approved our app.',
  },
  {
    id: 'upload',
    title: 'Upload your first long video',
    line: 'A podcast episode, a webinar or a talk. The Multiplier cuts it, and Compliance checks every cut before anything can be scheduled.',
  },
]

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-heading text-headline text-text">Set up your studio</h1>
          <p className="m-0 max-w-[48ch] text-body text-text-muted">
            One workspace for your brand, your accounts and your videos. Nothing posts until you
            approve it.
          </p>
        </div>
        {/* The form reads `who`, `account` and `goal` from the URL, so it
            calls `useSearchParams` — which Next requires inside a Suspense
            boundary on a statically rendered page, and the build says so
            rather than letting it slide. The page stays static; only the form
            waits for the parameters.

            The fallback is empty space the form's own height rather than a
            spinner: it resolves in the same tick, and a flash of "Loading…"
            above a sign-up form reads as something broken. */}
        <React.Suspense fallback={<div className="min-h-[34rem]" aria-hidden="true" />}>
          <SignUpForm />
        </React.Suspense>
      </div>

      <section aria-labelledby="next-heading" className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <h2 id="next-heading" className="m-0 font-heading text-title text-text">
            What happens next
          </h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {STEPS.map((step, index) => (
              <li
                key={step.id}
                className="log-in stagger flex gap-3"
                style={{ '--index': index } as React.CSSProperties}
              >
                <span
                  aria-hidden="true"
                  className="machine grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-on-accent-soft"
                >
                  {index + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-label text-text">{step.title}</span>
                  <span className="text-meta text-text-muted">{step.line}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="rounded-lg border border-border-strong p-4 sm:p-5">
          <h3 className="m-0 font-heading text-label font-semibold text-text">Before you upload</h3>
          <p className="m-0 mt-1.5 text-meta text-text-muted">
            We can only work from video you own, or footage you hold the rights to. That is what
            the checkbox is for, and it is the one rule we cannot bend.
          </p>
        </div>
      </section>
    </div>
  )
}

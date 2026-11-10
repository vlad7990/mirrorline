/**
 * /sign-up — form on the left, "what happens next" on the right.
 *
 * The Stitch screen puts a testimonial in this column. It is fictional, so it
 * does not ship (docs/design/STITCH_REVIEW.md item 1). What replaces it is the
 * only thing we can honestly promise at this point: the three steps that
 * follow the button.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'

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
    line: 'Instagram, TikTok and YouTube, through their official APIs. You can disconnect any of them at any time.',
  },
  {
    id: 'upload',
    title: 'Upload your first long video',
    line: 'A podcast episode, a webinar or a talk. The Multiplier cuts it, and Compliance checks every cut before anything can be scheduled.',
  },
]

export default function SignUpPage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
      {/* Form ----------------------------------------------------------- */}
      <Card padding="lg" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Create an account</span>
          <h1 className="m-0 font-heading text-headline text-text">Set up your studio</h1>
          <p className="m-0 max-w-[48ch] text-body text-text-muted">
            One workspace for your brand, your accounts and your videos. Nothing posts until you
            approve it.
          </p>
        </div>
        <SignUpForm />
      </Card>

      {/* Context panel --------------------------------------------------- */}
      <aside aria-labelledby="next-heading" className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <h2 id="next-heading" className="m-0 font-heading text-title text-text">
            What happens next
          </h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {STEPS.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-on-accent-soft">
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

        <Card tone="ink" className="flex flex-col gap-2">
          <h2 className="m-0 font-heading text-subtitle text-on-ink">Before you upload</h2>
          <p className="m-0 text-meta text-on-ink">
            We can only work from video you own, or footage you hold the rights to. That is what the
            checkbox is for, and it is the one rule we cannot bend.
          </p>
        </Card>
      </aside>
    </div>
  )
}

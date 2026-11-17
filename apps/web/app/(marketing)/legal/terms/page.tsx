/**
 * /terms — a short, readable placeholder.
 *
 * Same shape as /privacy: the draft notice first, then the obvious headings.
 * Nothing here is a guarantee, because the product does not make any.
 */

import type { Metadata } from 'next'

import { DocContents } from '@/components/marketing/doc-contents'
import { DraftNotice, Prose, Section } from '@/components/marketing/primitives'

export const metadata: Metadata = {
  title: 'Terms (draft)',
  description:
    'A plain-language draft of the terms for using Mirrorline. Not reviewed by a lawyer, and not legal advice.',
}

const LAST_UPDATED = '9 November 2026'

interface TermsSection {
  readonly id: string
  readonly heading: string
  readonly paragraphs: readonly string[]
}

const SECTIONS: readonly TermsSection[] = [
  {
    id: 'what-this-covers',
    heading: 'What this covers',
    paragraphs: [
      'These terms would cover using the Mirrorline studio and the service we deliver through it. “Mirrorline” is a placeholder product name while we build.',
      'Where a signed engagement letter says something different, the engagement letter wins.',
    ],
  },
  {
    id: 'your-material',
    heading: 'Your material',
    paragraphs: [
      'You keep ownership of everything you upload, and of the videos we make from it.',
      'You confirm that you own, or hold the rights to, everything you upload. If you do not, we cannot work with it, and we will stop as soon as we find out.',
      'You give us permission to process your material in order to deliver the service: to transcribe it, cut it, caption it, check it and publish it on your instruction.',
    ],
  },
  {
    id: 'what-we-do',
    heading: 'What we do',
    paragraphs: [
      'We make short videos from your material, check each one against our compliance rules, and post approved videos to the accounts you connect, through the official platform APIs.',
      'We remake formats, not footage: new script, your footage, your voice. We do not copy another creator’s video, audio, wording, face, voice or name.',
      'AI-generated scenes are labelled, in the studio and on the platform.',
    ],
  },
  {
    id: 'what-you-do',
    heading: 'What you do',
    paragraphs: [
      'You connect your own accounts, and you can disconnect them at any time.',
      'You approve posts, or you turn auto-approve on yourself and accept that posts then go out without a further check from you.',
      'You tell us promptly if a post needs taking down.',
    ],
  },
  {
    id: 'no-guarantees',
    heading: 'No guarantees',
    paragraphs: [
      'We do not guarantee views, followers, leads, sales or any other result, and nothing on our website or in a call should be read as promising one.',
      'Our compliance gate is our own check. It is not legal clearance, and it is not a promise that a platform will agree with it.',
      'Platforms change their rules and their APIs. Where that affects what we can do, we will tell you and adjust.',
    ],
  },
  {
    id: 'payment',
    heading: 'Payment',
    paragraphs: [
      'Pilots are paid up front. Monthly plans are billed monthly in advance.',
      'You can stop a monthly plan at the end of a paid month. We do not lock anyone into a year.',
    ],
  },
  {
    id: 'ending-it',
    heading: 'Ending it',
    paragraphs: [
      'Either of us can end the arrangement with notice. On request we hand back the videos we made for you.',
      'We can stop work immediately if we are asked to use material you do not have the rights to, or to post in a way that breaks a platform’s rules.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes',
    paragraphs: [
      'When these terms are replaced by a reviewed version, the date at the top will change and we will tell clients by email before it takes effect.',
    ],
  },
]

export default function TermsPage() {
  return (
    <Section size="lg">
      <div className="flex max-w-[68ch] flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Terms</span>
          <h1 className="m-0 font-heading text-headline text-text">Terms of service</h1>
          <p className="m-0 text-meta text-text-muted">Last updated {LAST_UPDATED}.</p>
        </div>

        <DraftNotice documentName="terms" />

        {/* See the note on `/legal/privacy`: the same list, the same reason,
            and the same single column — so not sticky. */}
        <DocContents
          headingLevel={2}
          items={SECTIONS.map((section) => ({ href: `#${section.id}`, title: section.heading }))}
        />

        {SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={section.id} className="flex flex-col gap-3">
            <h2 id={section.id} className="m-0 font-heading text-title text-text">
              {section.heading}
            </h2>
            <Prose>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="m-0">
                  {paragraph}
                </p>
              ))}
            </Prose>
          </section>
        ))}
      </div>
    </Section>
  )
}

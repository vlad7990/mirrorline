/**
 * /privacy — a short, readable placeholder.
 *
 * It opens with the draft notice and covers only the obvious headings. No
 * claim about encryption, certification or model training appears here:
 * docs/design/STITCH_REVIEW.md item 3 rules out saying things we have not
 * built.
 */

import type { Metadata } from 'next'

import { DraftNotice, Prose, Section } from '@/components/marketing/primitives'

export const metadata: Metadata = {
  title: 'Privacy notice (draft)',
  description:
    'A plain-language draft of how Mirrorline would handle your data. Not reviewed by a lawyer, and not legal advice.',
}

/** The date this wording was written, so a reader can tell how old it is. */
const LAST_UPDATED = '9 November 2026'

interface PolicySection {
  readonly id: string
  readonly heading: string
  readonly paragraphs: readonly string[]
}

const SECTIONS: readonly PolicySection[] = [
  {
    id: 'who-we-are',
    heading: 'Who we are',
    paragraphs: [
      'Mirrorline is an AI content studio for coaches, consultants and local service businesses. “Mirrorline” is a placeholder product name while we build.',
      'If you want to reach a person about anything on this page, write to hello@mirrorline.example.',
    ],
  },
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    paragraphs: [
      'Account details: your name, your work email, your workspace name and your password, stored hashed.',
      'The videos you upload, and what we derive from them: transcripts, cuts, captions and scripts.',
      'Access tokens for the social accounts you connect, so we can post on your instruction.',
      'Consent records, where you have signed a release for your voice or likeness.',
      'Results for the posts we publish: views, profile visits, link clicks and conversions, as the platforms report them.',
      'Anything you type into a form on this website, such as the demo request.',
    ],
  },
  {
    id: 'why-we-use-it',
    heading: 'Why we use it',
    paragraphs: [
      'To make your videos, to check them before they post, to post them to the accounts you connected, and to report back on what they did.',
      'To bill you, to answer you, and to keep a log of what each agent did on your behalf.',
      'We do not sell your data, and we do not share it with anyone who is not helping us deliver your work.',
    ],
  },
  {
    id: 'who-else-sees-it',
    heading: 'Who else sees it',
    paragraphs: [
      'The services we build on: our hosting and database provider, our publishing provider, the AI models that write and render, and the platforms you asked us to post to. Each sees only what it needs for its part of the job.',
      'We will keep a current list of these providers in this notice once the stack is settled.',
    ],
  },
  {
    id: 'how-long',
    heading: 'How long we keep it',
    paragraphs: [
      'Your uploads and the videos we make from them stay while your workspace is open. Ask us to delete them and we will, apart from anything we have to keep for billing or legal records.',
      'Logs and consent records are kept longer, because the point of them is to be able to show what happened.',
    ],
  },
  {
    id: 'your-choices',
    heading: 'Your choices',
    paragraphs: [
      'You can disconnect any social account at the platform or in the studio, at any time, without asking us.',
      'You can withdraw a voice or likeness release, and we stop using it.',
      'You can ask for a copy of your data, or ask us to delete your workspace.',
    ],
  },
  {
    id: 'security',
    heading: 'Security',
    paragraphs: [
      'We use the standard protections our hosting and database providers offer, and we keep access to client material to the people who need it.',
      'We hold no security certification. We are new, and we are not going to claim an audit we have not had.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes',
    paragraphs: [
      'When this notice is replaced by a reviewed version, the date at the top will change and we will tell clients by email.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <Section size="lg">
      <div className="flex max-w-[68ch] flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="eyebrow">Privacy</span>
          <h1 className="m-0 font-heading text-headline text-text">Privacy notice</h1>
          <p className="m-0 text-meta text-text-muted">Last updated {LAST_UPDATED}.</p>
        </div>

        <DraftNotice documentName="privacy notice" />

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

/**
 * /trust — our rules, written plainly, and the things we refuse to claim.
 *
 * Each section is one of CLAUDE.md's non-negotiables. The closing section is
 * the point of the page: docs/design/STITCH_REVIEW.md item 2 strips out every
 * certification and guarantee Stitch invented, and saying so out loud is the
 * differentiator, not a disclaimer.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'

import { Section, SectionHeading } from '@/components/marketing/primitives'

import { LeadDialogButton } from '../components/lead-form'

export const metadata: Metadata = {
  title: 'Our rules',
  description:
    'Your footage only. Format not footage. AI scenes labelled. Consent for voice and likeness. Official platform APIs. Every video through the compliance gate. Honest numbers.',
}

interface Rule {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
}

const RULES: readonly Rule[] = [
  {
    id: 'own-footage',
    title: 'Only your footage',
    paragraphs: [
      'Everything we make starts from video you own, or footage we hold a written licence for. You confirm that when you upload, and we keep the record.',
      'We do not download, store or reuse another creator’s video or audio. Not as a source, not as a reference file, not as B-roll.',
    ],
  },
  {
    id: 'format-not-footage',
    title: 'We remake the format, never the footage',
    paragraphs: [
      'When a format is rising in your niche, what we take from it is its structure: the hook pattern, the beats, the pacing, the length. That is the part that travels.',
      'The script is new, the footage is yours, the voice is yours or a stock voice. We never copy another creator’s wording, face, voice or name, and we do not use their handle or their brand.',
    ],
  },
  {
    id: 'ai-labelled',
    title: 'AI scenes are labelled',
    paragraphs: [
      'Where a scene is generated rather than filmed, it carries an “AI scene” badge in the studio, and the platform’s own AI label on the post where one exists.',
      'You can see which scenes are generated before you approve anything, and you can ask for a video without them.',
    ],
  },
  {
    id: 'consent',
    title: 'Consent for your voice and your likeness',
    paragraphs: [
      'We do not do face swaps. Not for you, not for anyone else, under any circumstances.',
      'A voice clone or a likeness is only made with a signed release that we store against your workspace, and you can withdraw it. Without a release we use what you actually recorded.',
    ],
  },
  {
    id: 'official-apis',
    title: 'Official platform APIs only',
    paragraphs: [
      'Posts go out through the Instagram, TikTok and YouTube APIs, to accounts you connected yourself and can disconnect yourself, at any time, without asking us.',
      'No device automation, no app clones, no proxies, no bought or borrowed accounts, no scraping. We start well below the platforms’ posting limits and stay there. While our TikTok app is still being reviewed, TikTok posts stay private.',
    ],
  },
  {
    id: 'gate',
    title: 'Every video passes the compliance gate',
    paragraphs: [
      'Before anything can be scheduled, the Compliance agent checks it against its source, checks the rights and consent records, checks the licence list and checks the AI labels. It answers passed, needs review, or blocked, with the reason in plain words.',
      'You see the same result we do. You can override a block, and the override is logged with your name on it.',
    ],
  },
  {
    id: 'honest-numbers',
    title: 'Honest numbers',
    paragraphs: [
      'The report shows what the platforms reported: views, profile visits, link clicks, leads, calls. Nothing is projected, modelled or rounded up into a better week than you had.',
      'Where a figure is a demo rather than yours, it says “Sample data” next to it. Every number on this website is sample data from a fictional client.',
    ],
  },
]

const NOT_CLAIMED: readonly string[] = [
  'We do not guarantee views, followers, leads or sales. Nobody honestly can.',
  'We do not guarantee a compliance outcome. Our gate is our own check, not legal clearance, and a platform or a rights holder can still disagree with it.',
  'We hold no security certification. No SOC 2, no ISO, no audit of any kind. We are new, and claiming otherwise would be the first lie.',
  'We have no customer results to show you yet, so there are no testimonials, ratings or case studies on this site.',
  'We are not your lawyer. The privacy notice and the terms here are drafts, not reviewed legal documents.',
]

export default function TrustPage() {
  return (
    <>
      <Section size="lg">
        <div className="flex max-w-[52rem] flex-col gap-5">
          <span className="eyebrow">Our rules</span>
          <h1 className="m-0 font-heading text-headline text-text sm:text-display">
            The rules we work by, and the ones we will not pretend to
          </h1>
          <p className="m-0 max-w-[62ch] text-body text-text-muted">
            This page is the whole of it. Seven rules that are built into the product, and a list of
            things we are not claiming, written plainly, because an agency that is vague here is
            telling you something.
          </p>
        </div>
      </Section>

      <Section tone="subtle" aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="sr-only">
          Our rules
        </h2>
        <ol className="flex list-none flex-col gap-4 p-0">
          {RULES.map((rule, index) => (
            <Card as="li" key={rule.id} padding="lg" className="flex flex-col gap-3">
              <span className="tabular text-caption font-semibold text-text-muted">
                Rule {index + 1} of {RULES.length}
              </span>
              <h3 className="m-0 font-heading text-title text-text">{rule.title}</h3>
              {rule.paragraphs.map((paragraph) => (
                <p key={paragraph} className="m-0 max-w-[68ch] text-body text-text-muted">
                  {paragraph}
                </p>
              ))}
            </Card>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="not-claimed-heading">
        <SectionHeading
          id="not-claimed-heading"
          eyebrow="Plainly"
          title="What we don’t claim"
          lead="Most of what gets promised in this market cannot be promised. Here is where we stop."
        />
        <Card tone="ink" padding="lg" className="mt-8">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {NOT_CLAIMED.map((line) => (
              <li key={line} className="max-w-[68ch] text-body text-on-ink">
                {line}
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          If any of that changes, it will appear here with a date on it. That means a real
          certification, or a real client result we are allowed to share.
        </p>
      </Section>

      <Section tone="subtle" size="md" aria-labelledby="trust-cta-heading">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <h2 id="trust-cta-heading" className="m-0 font-heading text-headline text-text">
              Ask us the hard question
            </h2>
            <p className="m-0 text-body text-text-muted">
              If something on this page is not clear enough, say so on the call. We would rather
              lose the work than talk around it.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LeadDialogButton intent="demo" />
            <LeadDialogButton intent="pilot" variant="secondary" size="lg" />
          </div>
        </Card>
      </Section>
    </>
  )
}

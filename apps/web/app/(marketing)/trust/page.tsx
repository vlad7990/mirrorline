/**
 * /trust — our rules, written plainly, and the things we refuse to claim.
 *
 * Each section is one of CLAUDE.md's non-negotiables. The closing section is
 * the point of the page: docs/design/STITCH_REVIEW.md item 2 strips out every
 * certification and guarantee Stitch invented, and saying so out loud is the
 * differentiator, not a disclaimer.
 */

import { cuts, todaySchedule, weekPosts } from '@mirrorline/mock'
import { AiLabel, Card, VideoThumb, ViewerPanel } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { PageHero } from '@/components/marketing/page-hero'
import { SampleDataLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'


export const metadata: Metadata = {
  title: 'Our rules',
  description:
    'Your footage only. Format not footage. AI scenes labelled. Consent for voice and likeness. Official platform APIs. Every video through the compliance gate. Honest numbers.',
}

interface Rule {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  /** The machine's half of the rule: a limit, a cap, a figure you can audit. */
  readonly readout?: React.ReactNode
}

/** The rule whose claim is shown on a frame rather than only described. */
const AI_LABEL_RULE_ID = 'ai-labelled'

/**
 * CLAUDE.md non-negotiable 4. Which cuts carry a generated scene is a property
 * of the schedule, so it is read back from the posts rather than restated.
 */
const AI_LABELLED_CUT = (() => {
  const labelledIds = new Set(
    [...todaySchedule, ...weekPosts].flatMap((post) =>
      post.hasAiScenes && post.cutId !== null ? [post.cutId] : [],
    ),
  )
  return cuts.find((cut) => labelledIds.has(cut.id)) ?? null
})()

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
    readout: 'similarity limit 30%',
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
      {/* The headline was thirteen words, which is four lines at the size a
          public page wants. The clause it lost opens the lead instead, so
          nothing in the argument went missing. */}
      <PageHero
        title="The rules we work by"
        lead={
          <>
            And the ones we will not pretend to. <span className="machine">{RULES.length}</span>{' '}
            rules built into the product, <span className="machine">{NOT_CLAIMED.length}</span>{' '}
            things we are not claiming, written plainly, because an agency that is vague here is
            telling you something.
          </>
        }
        shot="calendar-16x10"
        shotAlt="The approvals queue: a scheduled post with its AI label locked on and the reason it cannot be removed."
        shotCaption="The approvals queue, on sample data from a fictional demo client."
      />

      <Section className="band-snow" aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="sr-only">
          Our rules
        </h2>
        <ol className="flex list-none flex-col gap-4 p-0">
          {RULES.map((rule) => (
            <Card
              as="li"
              key={rule.id}
              padding="lg"
              /* Two columns from lg: the rule on the left, what it means on
                 the right. As one stack the body ran to 68ch and left the
                 right half of every card empty, so seven rules read as seven
                 identical slabs — the "plain stacks" complaint in
                 DESIGN_BACKLOG.md. A rules page is the one place a
                 name-and-definition column is the natural shape rather than
                 decoration. Single column below lg, where there is no room
                 for two and the stack is the right answer anyway. */
              className="grid gap-x-10 gap-y-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
            >
              {/* No "Rule N of 7" counter: the <ol> carries the count for
                  assistive tech, and the rules are not ranked. */}
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-balance font-heading text-title text-text">{rule.title}</h3>
                {rule.readout ? (
                  <p className="machine m-0 text-mono text-text-muted">{rule.readout}</p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                {rule.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="m-0 max-w-[68ch] text-body text-text-muted">
                    {paragraph}
                  </p>
                ))}
                {rule.id === AI_LABEL_RULE_ID && AI_LABELLED_CUT ? (
                  /* The claim, shown. DESIGN.md: a 9:16 frame sits on the
                     viewer surface, identical in both themes, and the AI label
                     sits on the frame rather than in the small print. */
                  <ViewerPanel
                    className="mt-1"
                    footnote={
                      <>
                        Sample data, from Maya Torres Coaching, a fictional demo client. The badge
                        is the same one you see in the studio.
                      </>
                    }
                    readout={
                      <>
                        cut <span className="machine">{AI_LABELLED_CUT.index}</span>, length{' '}
                        <span className="machine">{AI_LABELLED_CUT.lengthLabel}</span>
                      </>
                    }
                    title="How a generated scene is labelled"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-[132px] shrink-0">
                        <VideoThumb
                          aiScene
                          caption={AI_LABELLED_CUT.hook}
                          cutNumber={AI_LABELLED_CUT.index}
                          highlight={AI_LABELLED_CUT.highlightPhrase}
                          index={AI_LABELLED_CUT.index}
                          length={AI_LABELLED_CUT.lengthLabel}
                        />
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <AiLabel />
                        <p className="m-0 text-meta text-on-viewer">
                          The badge rides with the post. Where the platform has its own AI label, we
                          set that too, and you can ask for the video without the generated scene.
                        </p>
                      </div>
                    </div>
                  </ViewerPanel>
                ) : null}
              </div>
            </Card>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SampleDataLabel />
          <p className="m-0 text-meta text-text-muted">
            Every figure and frame on this website belongs to a fictional demo client.
          </p>
        </div>
      </Section>

      <Section className="band-ink-alt" aria-labelledby="not-claimed-heading">
        <SectionHeading
          headingClassName="text-site-h2 font-serif"
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

      <SiteCta next={{ href: '/pricing', label: 'Pricing' }} />
    </>
  )
}

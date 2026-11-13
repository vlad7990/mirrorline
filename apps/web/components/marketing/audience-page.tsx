/**
 * The shared body of `/businesses` and `/individuals` (16 §4).
 *
 * **These are the only two audience pages there will ever be.** They exist
 * because 13 §1 segments by *account type*, and a visitor arriving from a
 * post aimed at one of them should land somewhere that recognises them. They
 * are emphatically not the industry pages 16 §1 forbids: neither page names a
 * trade, and what differs between them is the plan, the input mix and the
 * cadence — which is the whole of what actually differs.
 *
 * One component rather than two near-identical pages, because two copies of a
 * layout is how they drift until one quietly stops matching the product.
 */

import { Card } from '@mirrorline/ui'
import * as React from 'react'

import { GOALS, type GoalKey } from '@/lib/audience/account-type'

import { GOAL_EXAMPLES } from './home/problem-content'
import { PageHero } from './page-hero'
import { Section, SectionHeading } from './primitives'
import { SiteCta } from './site-cta'

export interface AudienceStage {
  readonly id: string
  /** "You already have an account", "You are starting from zero". */
  readonly title: string
  readonly body: string
  /** From 13 §1. The things that genuinely differ. */
  readonly plan: string
  readonly inputMix: string
  readonly cadence: string
}

export interface AudienceConcern {
  readonly question: string
  readonly answer: string
}

export interface AudiencePageContent {
  readonly eyebrow: string
  readonly title: React.ReactNode
  readonly lead: string
  readonly marginNote: string
  /** The two account stages for this audience. */
  readonly stages: readonly AudienceStage[]
  /** Which of the seven goals this audience most often picks. */
  readonly commonGoals: readonly GoalKey[]
  /** What this audience usually worries about, answered plainly. */
  readonly concerns: readonly AudienceConcern[]
  readonly next: { readonly href: string; readonly label: string }
}

export function AudiencePage({ content }: { content: AudiencePageContent }) {
  const goals = GOALS.filter((goal) => content.commonGoals.includes(goal.key))

  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        lead={content.lead}
        index={content.stages.map((stage, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: stage.title,
          description: stage.plan,
        }))}
        marginNote={content.marginNote}
      />

      {/* The two stages --------------------------------------------------- */}
      <Section aria-labelledby="stages-heading">
        <SectionHeading
          id="stages-heading"
          eyebrow="Where you are starting"
          title={
            <>
              Two starting points, <span className="gold-phrase">two different first months.</span>
            </>
          }
          lead="This is the only question that changes the work. Not what you do for a living — whether there is already an account with something on it."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
          {content.stages.map((stage, position) => (
            <li
              key={stage.id}
              className="reveal-item"
              style={{ '--index': position } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-3">
                <h3 className="m-0 font-heading text-title text-text">{stage.title}</h3>
                <p className="m-0 text-body text-text-muted">{stage.body}</p>
                <dl className="m-0 mt-auto grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                  {[
                    { label: 'Plan', value: stage.plan },
                    { label: 'Mostly', value: stage.inputMix },
                    { label: 'Cadence', value: stage.cadence },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-0.5">
                      <dt className="text-caption text-text-muted">{item.label}</dt>
                      <dd className="machine m-0 text-mono text-text">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Goals ------------------------------------------------------------ */}
      <Section className="band-snow" aria-labelledby="goals-heading">
        <SectionHeading
          id="goals-heading"
          eyebrow="What you are aiming at"
          title={
            <>
              The goal decides <span className="gold-phrase">what we measure.</span>
            </>
          }
          lead="You pick one in onboarding and the KPI set follows it. These are the ones chosen most often here, but all seven are open to you."
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-4">
          {goals.map((goal, position) => (
            <li
              key={goal.key}
              className="reveal-item"
              style={{ '--index': position % 4 } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <h3 className="m-0 font-heading text-subtitle text-text">{goal.label}</h3>
                <p className="m-0 text-meta text-text-muted">{GOAL_EXAMPLES[goal.key]}</p>
                <p className="machine m-0 mt-auto border-t border-border pt-3 text-mono text-gold-text">
                  {goal.headlineKpi}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Concerns --------------------------------------------------------- */}
      <Section tone="subtle" aria-labelledby="concerns-heading">
        <SectionHeading
          id="concerns-heading"
          eyebrow="The usual worries"
          title={
            <>
              Answered plainly, <span className="gold-phrase">including the awkward ones.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
        />
        <dl className="m-0 mt-10 flex flex-col gap-0">
          {content.concerns.map((concern, position) => (
            <div
              key={concern.question}
              className="reveal-item grid gap-2 border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-8"
              style={{ '--index': position } as React.CSSProperties}
            >
              <dt className="font-heading text-subtitle text-text lg:col-span-4">
                {concern.question}
              </dt>
              <dd className="m-0 max-w-[72ch] text-body text-text-muted lg:col-span-8">
                {concern.answer}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <SiteCta next={content.next} />
    </>
  )
}

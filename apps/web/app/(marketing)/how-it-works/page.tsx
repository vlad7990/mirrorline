/**
 * /how-it-works — the seven-agent loop in depth, then the client's side of it.
 *
 * The agent copy lives in @/components/marketing/agents, transcribed from
 * docs/specs/04_AGENTS_SPEC.md. Each agent gets what it does, what it will not
 * do (the spec's "Limits" column) and where it sits in the loop. The page ends
 * on the compliance gate, because that is the rule everything else depends on.
 */

import { agents, cuts } from '@mirrorline/mock'
import { Card, cn, StatusChip, VideoThumb, ViewerPanel } from '@mirrorline/ui'
import { BarChart3, CalendarDays, Check, Scissors, ShieldCheck, Upload } from 'lucide-react'
import type { Metadata } from 'next'
import * as React from 'react'

import { LOOP_CLOSING_LINE, PUBLIC_AGENTS } from '@/components/marketing/agents'
import {
  ComingSoonLabel,
  SampleDataLabel,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives'
import { PageHero } from '@/components/marketing/page-hero'

import { LeadDialogButton } from '../components/lead-form'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Seven agents, one loop: Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher and Performance Analyst. What each one does, and what it will not do.',
}

/**
 * DESIGN.md "Components": the spend cap "shows wherever an agent can spend
 * money, not only in Settings". The figures belong to the demo client, so this
 * reads them back from @mirrorline/mock rather than restating them.
 */
const AGENT_BUDGETS: ReadonlyMap<string, { spendUsd: number; capUsd: number }> = new Map(
  agents.map((agent) => [agent.id, { spendUsd: agent.spendUsd, capUsd: agent.capUsd }]),
)

/** The cuts the gate did not wave through. The honest half of the output. */
const HELD_CUTS = cuts.filter((cut) => cut.compliance !== 'passed')

interface ClientStep {
  readonly id: string
  readonly title: string
  readonly line: string
  readonly Icon: typeof Upload
}

const CLIENT_STEPS: readonly ClientStep[] = [
  {
    id: 'upload',
    title: 'Upload',
    line: 'Drop in one long video: a podcast episode, a webinar, a talk, a demo. One a week is enough to keep the studio fed.',
    Icon: Upload,
  },
  {
    id: 'cuts',
    title: 'Cuts',
    line: 'Within the day you have 8 to 15 short vertical videos, captioned in your style, each with its own hook and format tag.',
    Icon: Scissors,
  },
  {
    id: 'approve',
    title: 'Approve',
    line: 'You see every cut with its compliance result. Approve, send one back, or block it. Any cut the gate flagged says why.',
    Icon: Check,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    line: 'Approved videos land on a calendar across Instagram, TikTok and YouTube Shorts. You can move or cancel any of them.',
    Icon: CalendarDays,
  },
  {
    id: 'report',
    title: 'Report',
    line: 'Once a week you get the same week read from views to profile visits to link clicks to calls, with the real figures.',
    Icon: BarChart3,
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Seven agents, one loop"
        lead="A format found on Monday becomes your own videos, posted through the week, and the results shape what gets made next. Each agent has one job, its own spend cap and its own log."
        shot="agents-16x10"
        shotAlt="The agents board: each agent with its own switch, spend cap and log, and Compliance locked on."
        shotCaption="The agents board, on sample data from a fictional demo client."
      />

      <Section tone="subtle" aria-labelledby="agents-heading">
        <SectionHeading
          id="agents-heading"
          eyebrow="The loop"
          title="What each agent does"
          lead="In order, with the limit that comes with it. Every limit below is a rule in the product, not a preference, and every cap is one you set."
          aside={<SampleDataLabel />}
        />
        <ol className="mt-8 flex list-none flex-col gap-4 p-0">
          {PUBLIC_AGENTS.map((agent) => {
            const budget = AGENT_BUDGETS.get(agent.id)

            return (
              <Card as="li" key={agent.id} padding="lg" className="flex flex-col gap-4">
                {/* No "Step N of 7" counter: the <ol> already carries the order
                    for assistive tech, and the agents are introduced in sequence
                    on the page. A counter on every card is furniture. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="m-0 font-heading text-title text-text">{agent.name}</h3>
                  {budget ? (
                    <p className="m-0 text-meta text-text-muted">
                      spend cap{' '}
                      <span className="machine text-text">
                        ${budget.spendUsd} / ${budget.capUsd}
                      </span>
                    </p>
                  ) : null}
                </div>

                <p className="m-0 max-w-[68ch] text-body text-text-muted">{agent.does}</p>

                <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-subtle p-4">
                  <h4 className="eyebrow m-0">What it will not do</h4>
                  <p className="m-0 max-w-[68ch] text-meta text-text">{agent.limit}</p>
                </div>

                <p className="m-0 max-w-[68ch] text-meta text-text-muted">
                  <span className="font-semibold text-text">In the loop: </span>
                  {agent.inLoop}
                </p>
              </Card>
            )
          })}
        </ol>
        {/* The automated re-plan is post-MVP. DESIGN.md keeps ink panels to one
            or two per screen, and this page spends its one on the closing call
            to action, so the hand-off is a hairline note instead. */}
        <div className="mt-4 flex flex-col items-start gap-2 border-t border-border pt-5">
          <ComingSoonLabel />
          <p className="m-0 max-w-[68ch] text-body text-text-muted">{LOOP_CLOSING_LINE}</p>
        </div>
      </Section>

      <Section aria-labelledby="client-heading">
        <SectionHeading
          id="client-heading"
          title="What you actually do"
          lead="Five steps. The longest one is the upload, and the only one you cannot skip is the approval."
        />
        {/* A sequence read down the page, not five equal tiles: the rail and the
            mono step number carry the order, and each step keeps a full line of
            prose instead of being squeezed into a column. */}
        <ol className="mt-8 flex list-none flex-col p-0">
          {CLIENT_STEPS.map((step, index) => {
            const isLast = index === CLIENT_STEPS.length - 1

            return (
              <li
                key={step.id}
                className="log-in stagger flex gap-4 sm:gap-5"
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-on-accent-soft">
                    <step.Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                  </span>
                  {isLast ? null : <span aria-hidden="true" className="w-px flex-1 bg-border" />}
                </div>
                <div className={cn('flex min-w-0 flex-col gap-1.5', isLast ? 'pb-0' : 'pb-6')}>
                  <div className="flex items-baseline gap-2.5">
                    {/* The <ol> already carries the order for assistive tech,
                        so the number is the machine's counter, for the eye. */}
                    <span aria-hidden="true" className="machine text-caption text-text-muted">
                      {index + 1}
                    </span>
                    <h3 className="m-0 font-heading text-subtitle text-text">{step.title}</h3>
                  </div>
                  <p className="m-0 max-w-[68ch] text-meta text-text-muted">{step.line}</p>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <ComingSoonLabel>Coming soon</ComingSoonLabel>
          <p className="m-0 max-w-[68ch] text-meta text-text-muted">
            The learning loop that re-plans your week on its own, the self-serve Studio, LinkedIn
            publishing and the mobile app. Today the Performance Analyst writes the plan and a
            person puts it into effect with you.
          </p>
        </div>
      </Section>

      <Section tone="subtle" aria-labelledby="gate-heading">
        <Card padding="lg" className="flex flex-col gap-4">
          <span className="grid size-11 place-items-center rounded-md bg-success-soft text-on-success-soft">
            <ShieldCheck aria-hidden="true" className="size-6" strokeWidth={1.8} />
          </span>
          <h2 id="gate-heading" className="m-0 font-heading text-headline text-text">
            Nothing posts without passing Compliance
          </h2>
          <div className="flex max-w-[68ch] flex-col gap-3 text-body text-text-muted">
            <p className="m-0">
              Every video goes through the same gate before it can reach the calendar. That means a
              cut from your own upload, a remake of a rising format, and anything with a generated
              scene in it. There is no path around it, for us or for you.
            </p>
            <p className="m-0">
              The gate checks the video against its source, checks your rights and consent records,
              checks the licence list, and checks that AI scenes carry their label. It returns
              passed, needs review, or blocked, with the reason written out.
            </p>
            <p className="m-0">
              It is our own check, not a legal clearance, and we hold no security certification. You
              can override a block; the override is logged with your name against it.
            </p>
          </div>

          {/* The honest half of the output. DESIGN.md: 9:16 frames sit on the
              viewer surface, in both themes, so a held cut looks the same to
              everyone who has to decide about it. */}
          <ViewerPanel
            className="mt-2"
            footnote={
              <>
                Sample data, from Maya Torres Coaching, a fictional demo client:{' '}
                <span className="machine">{HELD_CUTS.length}</span> of{' '}
                <span className="machine">{cuts.length}</span> cuts did not pass on the first run.
              </>
            }
            readout={
              <>
                held <span className="machine">{HELD_CUTS.length}</span>, limit{' '}
                <span className="machine">30%</span> similarity
              </>
            }
            title="What the gate held back"
          >
            <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-3">
              {HELD_CUTS.map((cut, index) => (
                <li
                  key={cut.id}
                  className="log-in stagger flex gap-3 sm:flex-col"
                  style={{ '--index': index } as React.CSSProperties}
                >
                  <div className="w-[88px] shrink-0 sm:w-full">
                    <VideoThumb
                      caption={cut.hook}
                      cutNumber={cut.index}
                      highlight={cut.highlightPhrase}
                      index={index}
                      length={cut.lengthLabel}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    <StatusChip status={cut.compliance === 'blocked' ? 'blocked' : 'needs-review'} />
                    <p className="m-0 text-meta text-on-viewer">
                      {cut.complianceReason ?? 'Waiting for your decision.'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ViewerPanel>

          <div className="flex flex-wrap items-center gap-3">
            <SampleDataLabel />
            <p className="m-0 text-meta text-text-muted">
              Nothing above is a customer result. It is the demo client&rsquo;s week.
            </p>
          </div>
        </Card>
      </Section>

      <Section size="md" aria-labelledby="how-cta-heading">
        <Card tone="ink" padding="lg" className="flex flex-col gap-5">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <h2 id="how-cta-heading" className="m-0 font-heading text-headline text-on-ink">
              See it with your own footage
            </h2>
            <p className="m-0 text-body text-on-ink">
              Bring one long video. We will show you what the Multiplier and the gate make of it.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LeadDialogButton intent="pilot" />
            <LeadDialogButton intent="demo" variant="secondary" size="lg" />
          </div>
        </Card>
      </Section>
    </>
  )
}

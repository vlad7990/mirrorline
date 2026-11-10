/**
 * /how-it-works — the seven-agent loop in depth, then the client's side of it.
 *
 * The agent copy lives in @/components/marketing/agents, transcribed from
 * docs/specs/04_AGENTS_SPEC.md. Each agent gets what it does, what it will not
 * do (the spec's "Limits" column) and where it sits in the loop. The page ends
 * on the compliance gate, because that is the rule everything else depends on.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'

import { LOOP_CLOSING_LINE, PUBLIC_AGENTS } from '@/components/marketing/agents'
import {
  IconCalendar,
  IconChart,
  IconCheck,
  IconScissors,
  IconShieldCheck,
  IconUpload,
} from '@/components/marketing/icons'
import { Section, SectionHeading } from '@/components/marketing/primitives'

import { LeadDialogButton } from '../components/lead-form'

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Seven agents, one loop: Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher and Performance Analyst. What each one does, and what it will not do.',
}

interface ClientStep {
  readonly id: string
  readonly title: string
  readonly line: string
  readonly Icon: typeof IconUpload
}

const CLIENT_STEPS: readonly ClientStep[] = [
  {
    id: 'upload',
    title: 'Upload',
    line: 'Drop in one long video — a podcast episode, a webinar, a talk, a demo. One a week is enough to keep the studio fed.',
    Icon: IconUpload,
  },
  {
    id: 'cuts',
    title: 'Cuts',
    line: 'Within the day you have 8 to 15 short vertical videos, captioned in your style, each with its own hook and format tag.',
    Icon: IconScissors,
  },
  {
    id: 'approve',
    title: 'Approve',
    line: 'You see every cut with its compliance result. Approve, send one back, or block it. Any cut the gate flagged says why.',
    Icon: IconCheck,
  },
  {
    id: 'schedule',
    title: 'Schedule',
    line: 'Approved videos land on a calendar across Instagram, TikTok and YouTube Shorts. You can move or cancel any of them.',
    Icon: IconCalendar,
  },
  {
    id: 'report',
    title: 'Report',
    line: 'Once a week you get the same week read from views to profile visits to link clicks to calls, with the real figures.',
    Icon: IconChart,
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <Section size="lg">
        <div className="flex max-w-[52rem] flex-col gap-5">
          <span className="eyebrow">How it works</span>
          <h1 className="m-0 font-heading text-headline text-text sm:text-display">
            Seven agents, one loop
          </h1>
          <p className="m-0 max-w-[62ch] text-body text-text-muted">
            A format found on Monday becomes your own videos, posted through the week, and the
            results shape what gets made next. Each agent has one job, its own spending cap and its
            own log, and you can override any decision it makes.
          </p>
        </div>
      </Section>

      <Section tone="subtle" aria-labelledby="agents-heading">
        <SectionHeading
          id="agents-heading"
          eyebrow="The loop"
          title="What each agent does"
          lead="In order. Every limit below is a rule in the product, not a preference."
        />
        <ol className="mt-8 flex list-none flex-col gap-4 p-0">
          {PUBLIC_AGENTS.map((agent) => (
            <Card as="li" key={agent.id} padding="lg" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="tabular text-caption font-semibold text-on-accent-soft">
                  Step {agent.step} of {PUBLIC_AGENTS.length}
                </span>
                <h3 className="m-0 font-heading text-title text-text">{agent.name}</h3>
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
          ))}
        </ol>
        <Card tone="ink" className="mt-4">
          <p className="m-0 text-body text-on-ink">{LOOP_CLOSING_LINE}</p>
        </Card>
      </Section>

      <Section aria-labelledby="client-heading">
        <SectionHeading
          id="client-heading"
          eyebrow="Your side"
          title="What you actually do"
          lead="Five steps. The longest one is the upload."
        />
        <ol className="mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
          {CLIENT_STEPS.map((step, index) => (
            <Card as="li" key={step.id} className="flex flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-on-accent-soft">
                <step.Icon size={20} />
              </span>
              <span className="tabular text-caption font-semibold text-text-muted">
                {index + 1} of {CLIENT_STEPS.length}
              </span>
              <h3 className="m-0 font-heading text-subtitle text-text">{step.title}</h3>
              <p className="m-0 text-meta text-text-muted">{step.line}</p>
            </Card>
          ))}
        </ol>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          The learning loop that re-plans your week on its own, the self-serve Studio and the mobile
          app are coming soon. Today the Performance Analyst writes the plan and a person puts it
          into effect with you.
        </p>
      </Section>

      <Section tone="subtle" aria-labelledby="gate-heading">
        <Card padding="lg" className="flex flex-col gap-4">
          <span className="grid size-11 place-items-center rounded-md bg-success-soft text-on-success-soft">
            <IconShieldCheck size={22} />
          </span>
          <h2 id="gate-heading" className="m-0 font-heading text-headline text-text">
            Nothing posts without passing Compliance
          </h2>
          <div className="flex max-w-[68ch] flex-col gap-3 text-body text-text-muted">
            <p className="m-0">
              Every video — a cut from your own upload, a remake of a rising format, anything with a
              generated scene in it — goes through the same gate before it can reach the calendar.
              There is no path around it, for us or for you.
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

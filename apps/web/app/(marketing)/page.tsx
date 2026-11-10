/**
 * The landing page.
 *
 * The spine is honesty: the limits come before the loop, because the limits
 * are the only reason we can say any of this. The proof is the output: the
 * twelve cuts one episode became, on the viewer surface, with their hooks,
 * lengths, formats, compliance verdicts and AI labels.
 *
 * Every figure comes from @mirrorline/mock, the fictional demo client in
 * docs/specs/08_MOCK_DATA.md, and carries a visible "Sample data" label, as
 * CLAUDE.md non-negotiable 7 requires. There are no testimonials, no ratings,
 * no customer results, no certifications and no guarantees anywhere on this
 * page: see docs/design/STITCH_REVIEW.md, item 1.
 */

import { cutSummary, cuts, funnel, metrics, sourceVideo } from '@mirrorline/mock'
import { Button, Card, cn, FunnelBar } from '@mirrorline/ui'
import { ArrowRight, Film, Plug, Repeat, Tag } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { LOOP_CLOSING_LINE, PUBLIC_AGENTS } from '@/components/marketing/agents'
import { CutWall } from '@/components/marketing/cut-wall'
import { Faq, type FaqItem } from '@/components/marketing/faq'
import { GateReadout } from '@/components/marketing/gate-readout'
import {
  ComingSoonLabel,
  SampleDataLabel,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives'
import { SELLABLE_TIERS } from '@/components/marketing/pricing-tiers'

import { LeadDialogButton } from './components/lead-form'

export const metadata: Metadata = {
  title: 'Turn one long video into daily short-form growth',
  description:
    'Mirrorline is an AI content studio for coaches, consultants and local service businesses. Your own footage becomes short vertical videos, posted to your own accounts through the official platform APIs.',
}

/* -------------------------------------------------------------------------- */
/* The limits — CLAUDE.md "Non-negotiables", written for a visitor             */
/* -------------------------------------------------------------------------- */

interface Limit {
  readonly id: string
  readonly title: string
  readonly line: string
  readonly Icon: typeof Film
}

const LIMITS: readonly Limit[] = [
  {
    id: 'own-footage',
    title: 'We will not touch another creator’s video',
    line: 'We work from footage you own, or footage we hold the rights to. Nothing is downloaded, stored or reused from anyone else.',
    Icon: Film,
  },
  {
    id: 'format-not-footage',
    title: 'We will not repost a format’s footage',
    line: 'When a format rises in your niche we rebuild its structure, then write a new script and shoot it with your material.',
    Icon: Repeat,
  },
  {
    id: 'ai-labelled',
    title: 'We will not hide a generated scene',
    line: 'Where a scene is made by a model, it says so in the studio and on the platform. No face swaps, and no voice without a signed release.',
    Icon: Tag,
  },
  {
    id: 'official-apis',
    title: 'We will not post from anywhere but the official APIs',
    line: 'Instagram, TikTok and YouTube’s own APIs, to accounts you connect and can disconnect without asking us. No device automation, proxies or app clones.',
    Icon: Plug,
  },
]

/* -------------------------------------------------------------------------- */
/* FAQ                                                                         */
/* -------------------------------------------------------------------------- */

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'do-you-post',
    question: 'Do you post for me?',
    answer: (
      <>
        <p className="m-0">
          Yes, once you approve. The Publisher puts approved posts out through the official APIs of
          Instagram, TikTok and YouTube, at the times that have worked for your audience.
        </p>
        <p className="m-0">
          You can leave every post on manual approval, or turn auto-approve on yourself. Nothing is
          posted on your behalf until you choose one.
        </p>
      </>
    ),
  },
  {
    id: 'whose-accounts',
    question: 'Whose accounts do the posts go to?',
    answer: (
      <>
        <p className="m-0">
          Yours. You connect each account, and you can disconnect it at any time without asking us.
        </p>
        <p className="m-0">
          We do not create accounts for you, we do not run accounts on your behalf, and we do not
          use device automation, proxies or app clones.
        </p>
      </>
    ),
  },
  {
    id: 'copyright',
    question: 'What about copyright?',
    answer: (
      <>
        <p className="m-0">
          We only work from material you own or we hold rights to. When a format is rising in your
          niche we take its structure (the hook pattern, the beats, the pacing) and nothing else:
          new script, your footage, your voice.
        </p>
        <p className="m-0">
          Before a video can be scheduled, the Compliance agent compares it with its source and
          holds the wording under our <span className="machine">30%</span> similarity limit, checks
          the rights and consent records, and checks the AI labels.
        </p>
        <p className="m-0">
          That is our own check, not legal clearance. We cannot promise a platform or a rights
          holder will always agree with it, so you see the result and can decide for yourself.
        </p>
      </>
    ),
  },
  {
    id: 'face-and-voice',
    question: 'Do you use my face or voice?',
    answer: (
      <>
        <p className="m-0">
          Only if you ask us to, and only with a signed release we keep on file. No face swaps,
          ever.
        </p>
        <p className="m-0">
          Without a release we use the footage you recorded and a stock voice, and any generated
          scene carries its AI label.
        </p>
      </>
    ),
  },
  {
    id: 'platform-rule',
    question: 'What if a video breaks a platform rule?',
    answer: (
      <>
        <p className="m-0">
          Compliance blocks it before it reaches the calendar and tells you why in plain words. For
          example: background music from a venue, or a claim with nothing behind it.
        </p>
        <p className="m-0">
          You can fix it and send it back through, or override the block yourself; the override is
          logged either way. If something does slip through, tell us and we take it down.
        </p>
      </>
    ),
  },
  {
    id: 'results',
    question: 'When do I see results?',
    answer: (
      <>
        <p className="m-0">
          We do not promise numbers, and we will not quote you any. Short-form growth is slow and
          uneven, it depends on your niche, your footage and your offer, and no agency can honestly
          predict it.
        </p>
        <p className="m-0">
          What we can tell you is what you get and when: in a two-week pilot you get{' '}
          <span className="machine">12</span> videos, a posting schedule and one report. After that
          you get posts out on time, every week, and a report that runs from views to clicks to
          calls. The figures in it are the real ones, including the weeks that go badly.
        </p>
        <p className="m-0">
          Judge us on that. If the posts stop or the reporting goes quiet, leave.
        </p>
      </>
    ),
  },
]

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * CLAUDE.md non-negotiable 6: "every video passes the Compliance agent before
 * it can be scheduled." That makes one agent in the loop different from the
 * other six, so the ladder marks it instead of treating all seven alike.
 */
const GATE_AGENT_ID = 'compliance'

/** The demo week is Monday to Sunday, so the funnel note can say how long. */
const DEMO_WEEK_DAYS = 7

export default function LandingPage() {
  const funnelSteps = funnel.map((stage) => ({ label: stage.label, count: stage.value }))

  return (
    <>
      {/* Hero ----------------------------------------------------------- */}
      <Section size="lg">
        <div className="flex max-w-[52rem] flex-col gap-6">
          <h1 className="m-0 font-heading text-headline text-text sm:text-display">
            Turn one long video into daily short-form growth, without losing your voice.
          </h1>
          <p className="m-0 max-w-[58ch] text-body text-text-muted sm:text-subtitle sm:font-normal">
            We rebuild the format, never the footage. Your own video, your own accounts, every cut
            checked.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <LeadDialogButton intent="pilot" />
            <LeadDialogButton intent="demo" variant="secondary" size="lg" />
          </div>
        </div>
      </Section>

      {/* The output, as proof ------------------------------------------- */}
      <Section aria-labelledby="proof-heading">
        <SectionHeading
          id="proof-heading"
          eyebrow="The output"
          title="One episode, twelve cuts"
          lead={`A ${sourceVideo.durationLabel} talk became ${cuts.length} short videos, each with its own moment, hook, length and format. None of them is the same clip with a new title, and the ones that did not pass say so on the frame.`}
          aside={<SampleDataLabel />}
        />
        <div className="mt-8">
          <CutWall />
        </div>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          Sample data. These frames belong to Maya Torres Coaching, a fictional demo client: a
          leadership coach with a weekly podcast. They show the shape of the work. They are not a
          customer result and they are not an average.
        </p>
      </Section>

      {/* The limits ----------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="limits-heading">
        <SectionHeading
          id="limits-heading"
          title="Four things we will not do"
          lead="These are limits, not features we can switch off for a bigger account. They are also the only reason we can say any of this."
        />
        {/* One bordered band with hairline dividers, not four cards. DESIGN.md
            "Elevation & Depth": depth comes from 1px borders and the contrast
            between surface and background, so a limit does not need a card of
            its own to read as a separate thing. */}
        <ul className="mt-8 flex list-none flex-col divide-y divide-border rounded-lg border border-border bg-surface p-0 lg:flex-row lg:divide-x lg:divide-y-0">
          {LIMITS.map((limit) => (
            <li key={limit.id} className="flex flex-1 items-start gap-4 p-5 lg:flex-col lg:gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-on-accent-soft">
                <limit.Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="m-0 font-heading text-subtitle text-text">{limit.title}</h3>
                <p className="m-0 text-meta text-text-muted">{limit.line}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 mb-0 max-w-[68ch] text-meta text-text-muted">
          None of these is a certification and none of them is a guarantee. They describe how the
          studio is built, and you can hold us to them.
        </p>
      </Section>

      {/* The gate ------------------------------------------------------- */}
      <Section aria-labelledby="gate-heading">
        <SectionHeading
          id="gate-heading"
          title="Nothing reaches your calendar unchecked"
          lead="Every cut goes through the Compliance agent before it can be scheduled. It compares the wording with its source, checks the rights, the consent records and the AI labels, then writes down what it did and what it cost."
          aside={<SampleDataLabel />}
        />
        <Card padding="lg" className="mt-8">
          <GateReadout />
        </Card>
      </Section>

      {/* The seven-agent loop ------------------------------------------- */}
      <Section tone="subtle" aria-labelledby="loop-heading">
        <SectionHeading
          id="loop-heading"
          eyebrow="The studio"
          title="Seven agents, one loop"
          lead="Each agent has one job, its own spend cap and its own log. A format found on Monday becomes your videos, posted all week, and the results shape the next week."
          aside={
            <Button asChild variant="secondary" className="press">
              <Link href="/how-it-works">
                How it works
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        {/* A ladder, not seven tiles: the rail draws the hand-off from one agent
            down to the next, so the order is in the layout rather than on a
            counter, and Compliance is marked because nothing gets past it.
            One column at every width, so all seven are always visible and
            nothing hides behind a scrollbar. */}
        <ol className="mt-8 flex list-none flex-col p-0">
          {PUBLIC_AGENTS.map((agent, index) => {
            const isGate = agent.id === GATE_AGENT_ID
            const isLast = index === PUBLIC_AGENTS.length - 1

            return (
              <li key={agent.id} className="flex gap-4 sm:gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  {/* The step number repeats what the <ol> already says, so it
                      is decoration for the eye only. It is the machine's own
                      counter, so it is set in the machine's voice. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'machine grid size-8 shrink-0 place-items-center rounded-full border',
                      'text-caption font-semibold',
                      isGate
                        ? 'border-success bg-success-soft text-on-success-soft'
                        : 'border-border-strong bg-surface text-text-muted',
                    )}
                  >
                    {agent.step}
                  </span>
                  {isLast ? null : <span aria-hidden="true" className="w-px flex-1 bg-border" />}
                </div>
                <div className={cn('flex min-w-0 flex-col gap-1', isLast ? 'pb-0' : 'pb-6')}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="m-0 font-heading text-subtitle text-text">{agent.name}</h3>
                    {isGate ? (
                      <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-on-success-soft">
                        The gate
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 max-w-[68ch] text-meta text-text-muted">{agent.short}</p>
                </div>
              </li>
            )
          })}
        </ol>
        {/* The automated re-plan is post-MVP, so the loop's closing hand-off is
            labelled rather than sold. CLAUDE.md non-negotiable 7. */}
        <div className="mt-2 flex flex-col items-start gap-2 border-t border-border pt-5">
          <ComingSoonLabel />
          <p className="m-0 max-w-[68ch] text-body text-text-muted">{LOOP_CLOSING_LINE}</p>
        </div>
      </Section>

      {/* From views to calls -------------------------------------------- */}
      <Section aria-labelledby="funnel-heading">
        <SectionHeading
          id="funnel-heading"
          title="From views to calls"
          lead="The weekly report does not stop at views. It follows the same week all the way to the thing you actually sell, including the weeks that go badly."
          aside={<SampleDataLabel />}
        />
        <Card className="mt-8 flex flex-col gap-4">
          {/* The section heading already carries the "Sample data" label, and
              the paragraph below the funnel carries the full disclosure. One
              label per section is enough to read; two is noise. */}
          <h3 className="m-0 font-heading text-subtitle text-text">
            One week for a fictional demo client
          </h3>
          <div className="scroll-x">
            <div className="min-w-[560px]">
              <FunnelBar steps={funnelSteps} />
            </div>
          </div>
          <p className="m-0 max-w-[68ch] text-meta text-text-muted">
            Sample data. Illustrative figures from Maya Torres Coaching, a fictional demo client:{' '}
            <span className="machine">{metrics.posts}</span> posts over{' '}
            <span className="machine">{DEMO_WEEK_DAYS}</span> days, built from{' '}
            <span className="machine">{cutSummary.total}</span> cuts. They are not an average, a
            benchmark or anything we promise. Your own numbers will look different.
          </p>
        </Card>
      </Section>

      {/* Pricing teaser -------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="pricing-heading">
        <SectionHeading
          id="pricing-heading"
          title="Start with a pilot, then pick a month"
          lead="Flat prices, set per engagement in writing before any work starts. No setup fee, no annual lock-in, and you can stop after the pilot."
          aside={
            <Button asChild variant="secondary" className="press">
              <Link href="/pricing">
                See what each tier includes
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        <dl className="m-0 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10">
          {SELLABLE_TIERS.map((tier) => (
            <div key={tier.id} className="flex items-baseline gap-2">
              <dt className="text-label text-text">{tier.name}</dt>
              <dd className="m-0 flex items-baseline gap-1.5">
                <span className="machine text-title text-text">{tier.price}</span>
                <span className="text-meta text-text-muted">{tier.period}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* FAQ ------------------------------------------------------------- */}
      <Section aria-labelledby="faq-heading">
        <SectionHeading
          id="faq-heading"
          title="The six we are asked most"
          lead="Short answers, including the ones where the honest answer is that we cannot promise."
        />
        <div className="mt-8">
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* Closing CTA ----------------------------------------------------- */}
      <Section tone="subtle" size="md" aria-labelledby="cta-heading">
        <Card tone="ink" padding="lg" className="flex flex-col gap-5">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <h2 id="cta-heading" className="m-0 font-heading text-headline text-on-ink">
              Start with two weeks
            </h2>
            <p className="m-0 text-body text-on-ink">
              A <span className="machine">$750</span> pilot: <span className="machine">12</span>{' '}
              videos from your own footage, a posting schedule and one report. If it is not worth
              the next month, stop there.
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

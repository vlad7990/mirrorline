/**
 * The two sections a price list is usually missing: what else costs, and what
 * the billing will not do to you.
 *
 * Both are on 16 §4's own list for `/pricing` ("no credits, cancel anytime")
 * and answer 11 §2's complaints P3 and P7, which had nowhere to land on this
 * page until now. Neither invents anything: the market ranges are transcribed
 * from 11 §2a with their sources, and our own figure is divided out of the
 * price list two sections above.
 *
 * Server components. There is nothing to interact with here — a comparison
 * that needs a click to show its worst number is a comparison arranged to be
 * missed.
 */

import { cn } from '@mirrorline/ui'
import Link from 'next/link'

import { BILLING_DETAIL_HREF, BILLING_PROMISES } from './billing-promises-content'
import {
  BENCHMARKS_READ_ON,
  COST_ROUTES,
  ourRangeLabel,
  ourRowNote,
} from './cost-comparison-content'
import { Section, SectionHeading } from './primitives'

/* -------------------------------------------------------------------------- */
/* What the same job costs elsewhere                                           */
/* -------------------------------------------------------------------------- */

interface RouteRowProps {
  readonly label: string
  readonly range: string
  readonly buys: string
  readonly leavesUndone: string
  readonly isUs?: boolean
}

function RouteRow({ label, range, buys, leavesUndone, isUs = false }: RouteRowProps) {
  return (
    <li
      className={cn(
        'grid grid-cols-1 gap-3 border-t border-border py-5 md:grid-cols-[minmax(0,13rem)_minmax(0,11rem)_minmax(0,1fr)] md:items-baseline md:gap-6',
        isUs && 'border-t-2 border-t-gold-500',
      )}
    >
      <p className="m-0 text-label text-text">{label}</p>
      {/* `machine` is the site's figure face, used wherever a number is meant
          to be read as a measurement rather than as copy. */}
      <p className="machine m-0 text-mono text-text">{range}</p>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-body text-text-muted">{buys}</p>
        <p className="m-0 text-meta text-text-muted">{leavesUndone}</p>
      </div>
    </li>
  )
}

export function CostComparison() {
  return (
    <Section className="band-white" aria-labelledby="cost-heading">
      <SectionHeading
        id="cost-heading"
        eyebrow="What else this costs"
        rail
        title={
          <>
            The same job, <span className="gold-phrase">bought other ways.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="Published market rates for the other routes to daily short video, next to what our plans divide out at. Categories rather than companies, and the whole range rather than the end that suits us."
      />

      <ul className="mt-8 flex list-none flex-col p-0">
        {COST_ROUTES.map((route) => (
          <RouteRow
            key={route.id}
            label={route.label}
            range={route.range}
            buys={route.buys}
            leavesUndone={route.leavesUndone}
          />
        ))}
        <RouteRow
          label="Us"
          range={ourRangeLabel()}
          buys={ourRowNote()}
          leavesUndone="Written, checked by the Compliance agent, posted through the official APIs to accounts you own, and reported on in enquiries rather than views."
          isUs
        />
      </ul>

      <p className="mb-0 mt-6 max-w-[72ch] text-meta text-text-muted">
        Market ranges read in {BENCHMARKS_READ_ON} and recorded with their sources in our research
        notes. They are what those routes publish, not what anybody paid us — we have no clients
        yet, and no result of ours is on this page. Our own figure is the plan price divided by the
        posts it delivers.
      </p>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* Plain billing                                                               */
/* -------------------------------------------------------------------------- */

export function BillingPromises() {
  return (
    <Section className="band-snow" size="md" aria-labelledby="billing-heading">
      <SectionHeading
        id="billing-heading"
        eyebrow="Plain billing"
        rail
        title={
          <>
            Four things this <span className="gold-phrase">will never do.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="The billing complaints people leave about this category are specific — credits that expire, charges after cancelling, files that leave with the vendor. So these are specific too."
      />

      <ul className="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {BILLING_PROMISES.map((promise) => (
          <li
            key={promise.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
          >
            <h3 className="m-0 text-label text-text">{promise.title}</h3>
            <p className="m-0 text-body text-text-muted">{promise.body}</p>
          </li>
        ))}
      </ul>

      <p className="mb-0 mt-6 text-meta text-text-muted">
        The version you could hold us to is on{' '}
        <Link href={BILLING_DETAIL_HREF} className="underline underline-offset-4 hover:text-text">
          the cancellation and refunds page
        </Link>
        , which says the same four things in the words that bind.
      </p>
    </Section>
  )
}

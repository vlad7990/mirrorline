/**
 * The two sections `/how-it-works` was missing: your side of the week, and
 * who does what.
 *
 * The page walked Scan → Make → Post & prove and then showed the first week —
 * all of it in the third person. A reader finishing it still did not know the
 * thing they came to find out, which is **how much of their week this costs
 * them**. 11 §2 P8 has had the answer since the research pass: about fifteen
 * minutes.
 *
 * The figure is drawn from the four items rather than printed over them, so
 * the headline and the list cannot disagree. See `client-effort-content.ts`.
 */

import { CLIENT_EFFORT, DIVISION_OF_LABOUR, totalEffortMinutes } from './client-effort-content'
import { Section, SectionHeading } from './primitives'

export function ClientEffort() {
  const total = totalEffortMinutes()

  return (
    <Section className="band-snow" aria-labelledby="effort-heading">
      <SectionHeading
        id="effort-heading"
        eyebrow="Your side of it"
        rail
        title={
          <>
            About fifteen minutes <span className="gold-phrase">a week, itemised.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="Any service can claim it takes none of your time. Here is where the time actually goes, broken into the four things only you can do — the total is the sum of this list, not a number written over it."
      />

      <ul className="mt-8 flex list-none flex-col p-0">
        {CLIENT_EFFORT.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-4 border-t border-border py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]"
          >
            {/* `machine` is the figure face: this is a measurement, not copy. */}
            <p className="machine m-0 text-mono text-text">{item.minutes} min</p>
            <div className="flex flex-col gap-1">
              <p className="m-0 text-body text-text">{item.task}</p>
              <p className="m-0 text-meta text-text-muted">{item.when}</p>
            </div>
          </li>
        ))}
        <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-4 border-t-2 border-t-gold-500 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
          <p className="machine m-0 text-mono text-text">{total} min</p>
          <p className="m-0 text-body text-text">
            A week. Less in the weeks you have nothing to send, and none at all if you turn
            auto-approve on — though we would rather you did not for the first month.
          </p>
        </li>
      </ul>
    </Section>
  )
}

export function DivisionOfLabour() {
  return (
    <Section className="band-ink-alt" aria-labelledby="division-heading">
      <SectionHeading
        id="division-heading"
        eyebrow="Who does what"
        rail
        title={
          <>
            Agents do the work. <span className="gold-phrase">People make the calls.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="Every row below splits the same way, and it is the split that decides whether this is a service or a piece of software you now have to operate."
      />

      <ul className="mt-8 flex list-none flex-col p-0">
        <li
          aria-hidden="true"
          className="hidden gap-6 border-b border-ink-line pb-3 md:grid md:grid-cols-2"
        >
          <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
            The seven agents
          </p>
          <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-gold-400">
            You
          </p>
        </li>

        {DIVISION_OF_LABOUR.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-1 gap-3 border-b border-ink-line py-5 md:grid-cols-2 md:gap-6"
          >
            <p className="m-0 text-body text-on-ink-muted">
              <span className="md:hidden">Agents: </span>
              {row.agents}
            </p>
            <p className="m-0 text-body text-on-ink-900">
              <span className="md:hidden">You: </span>
              {row.person}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/**
 * The long-form YouTube add-on card on /pricing (19's page table, PR D).
 *
 * ## The card 19 v2 refused, and what changed
 *
 * F3 left this out on an argument worth keeping: "a card for an add-on whose
 * API audit has not started would be an invented product." The audit still
 * has not started. What makes the card honest is not that something got
 * built — it is that the limit is on the card, in the same breath as the
 * price, rather than in a footnote under it.
 *
 * So the order on screen is deliberate: what it is, what it costs, **that you
 * cannot buy it and why**, then what it includes. A reader who stops halfway
 * down has still met the limit.
 *
 * ## No new imagery, and the budget decided it
 *
 * Five Higgsfield credits remain (D53), which is the regeneration reserve
 * rather than a budget for a new section. The visual is the existing
 * `studio-cuts-16x10` screenshot — the upload screen showing one long video
 * already cut into shorts, which is the add-on's own subject: this card sells
 * publishing *that* long video too. A generated long-form clip would have
 * been better and is left as an optional item for Vlad rather than spent into
 * from a reserve.
 *
 * There is also no `<video>`, and D50 is why: a page hero loop put /product
 * at Lighthouse 57, and /pricing is one of the three pages held to ≥ 90.
 *
 * Server component. Nothing here is interactive — a waitlist you have to
 * click to discover is a limit arranged to be missed.
 */

import { BrowserFrame } from '@/components/marketing/kit/frames'
import {
  ADDON_FACTS,
  ADDON_NAME,
  ADDON_PERIOD,
  ADDON_PRICE,
  ADDON_SUMMARY,
  PRIVATE_UNTIL_APPROVED,
  WAITLIST_LABEL,
  WHY_NOT_OPEN,
} from './long-form-addon'
import { Section, SectionHeading } from './primitives'

export function LongFormAddon() {
  return (
    <Section className="band-snow" aria-labelledby="addon-heading">
      <SectionHeading
        id="addon-heading"
        eyebrow="One add-on"
        rail
        title={
          <>
            The long video too, <span className="gold-phrase">not only the cuts.</span>
          </>
        }
        headingClassName="text-site-h2"
        lead="Every plan posts the shorts. This publishes the recording they were cut from, to the channel they point at. It is the only add-on there is, and it is not open yet."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        {/* The offer ------------------------------------------------------- */}
        <div className="rounded-lg border border-border bg-surface p-6 sm:p-7">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h3 className="m-0 text-site-h3 text-text">{ADDON_NAME}</h3>
            {/* Studio's treatment at 09 §11, for the same reason: a label
                that says it cannot be bought, sitting where a buy button
                would be rather than underneath one. */}
            <span className="rounded-full border border-border-strong px-2.5 py-0.5 text-caption text-text-muted">
              {WAITLIST_LABEL}
            </span>
          </div>

          <p className="mt-3 mb-0 text-body text-text-muted">{ADDON_SUMMARY}</p>

          <p className="mt-5 mb-0 flex flex-wrap items-baseline gap-x-2">
            <span className="machine text-metric text-text">{ADDON_PRICE}</span>
            <span className="text-meta text-text-muted">{ADDON_PERIOD}</span>
          </p>

          {/* The limit, before the feature list rather than after it. */}
          <div className="mt-5 rounded-md border border-border-strong bg-background p-4">
            <p className="m-0 text-label text-text">{PRIVATE_UNTIL_APPROVED}</p>
            <p className="mt-2 mb-0 text-meta text-text-muted">{WHY_NOT_OPEN}</p>
          </div>

          <ul className="mt-6 flex list-none flex-col gap-4 p-0">
            {ADDON_FACTS.map((fact) => (
              <li key={fact.label}>
                <p className="m-0 text-label text-text">{fact.label}</p>
                <p className="mt-1 mb-0 text-body text-text-muted">{fact.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* What it attaches to --------------------------------------------- */}
        <BrowserFrame
          shot="studio-cuts-16x10"
          path="/app/upload"
          alt="The upload screen after a run: one long video cut into twelve vertical shorts, each with its hook, length and compliance verdict."
          caption="Sample data. The add-on publishes the long recording on the left of this screen, as well as the cuts taken out of it."
          sizes="(min-width: 1024px) 560px, 100vw"
        />
      </div>
    </Section>
  )
}

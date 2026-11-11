/**
 * The one line above the header: how many pilot places are actually open.
 *
 * Borrowed from beCreatives, which runs "5 dedicated editor spots open this
 * week" full-bleed above its nav (docs/design/COMPETITOR_REFERENCES.md §2.2).
 * The device suits a done-for-you retainer, which is what we sell on Day 0.
 *
 * Why this and not the thing the other four reference sites do: every one of
 * them opens with volume proof — "20M+ creators", "980,434+ creators", "Loved
 * by 4M+ businesses", Trustpilot 4.8/5. We have no customers, and CLAUDE.md
 * non-negotiable 7 forbids inventing any of it. A capacity line is the one
 * piece of urgency that is *ours to state*: it is a fact about how many
 * clients we are willing to take, not a claim about how many we have. It
 * reads as confidence rather than as an empty leaderboard.
 *
 * It deliberately does not stick. The header is already `sticky top-0`; this
 * scrolls away above it, as beCreatives' does, so the viewport is not paying
 * for two fixed bars.
 */

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

/**
 * How many pilot clients we will take in the current intake.
 *
 * **This must track reality.** It is the only number on the public site that
 * is a commitment rather than sample data, so it cannot drift into a
 * permanent "only 3 left!" — that would be the manufactured scarcity
 * non-negotiable 7 exists to prevent. Change it here when the intake changes;
 * set it to zero to close intake and the bar removes itself.
 */
// Annotated `number` rather than left to infer the literal `4`: the whole
// point is that this gets edited, and a literal type makes the zero check and
// the plural branch look like dead code to the compiler.
export const PILOT_PLACES: number = 4

export function CapacityBar() {
  if (PILOT_PLACES <= 0) return null

  return (
    // `aside`, not a bare div: it sits above the header and outside <main>,
    // so without a landmark its text belongs to no region and axe reports it
    // (moderate, "all page content should be contained by landmarks"). It is
    // genuinely complementary to the page, which is what `aside` means.
    //
    // Accent rather than the primary: the primary action in view is the
    // header's own button, and DESIGN.md allows one primary per section.
    <aside aria-label="Pilot availability" className="border-b border-border bg-accent-soft">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2.5 text-center sm:px-8">
        <p className="m-0 text-label text-text">
          {/* A count is a figure, so it goes in the machine's voice — the same
              rule the cut lengths and costs follow. */}
          Taking <span className="machine">{PILOT_PLACES}</span>{' '}
          {PILOT_PLACES === 1 ? 'pilot client' : 'pilot clients'} this month.
        </p>
        <LeadDialogButton intent="pilot" variant="ghost" size="md">
          Ask for a place →
        </LeadDialogButton>
      </div>
    </aside>
  )
}

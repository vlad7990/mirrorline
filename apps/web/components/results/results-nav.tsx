/**
 * The Results tab strip.
 *
 * Links rather than a tab widget — the reasoning is in
 * `lib/studio/results-tabs.ts`. A server component, so arriving at your
 * numbers costs no JavaScript.
 *
 * DESIGN.md "Components — Sidebar nav item" is the nearest existing pattern
 * and this borrows its resting and active treatment rather than inventing a
 * second one: accent-soft fill with `on-accent-soft` text when current, muted
 * label otherwise. The strip scrolls sideways rather than wrapping to three
 * rows on a phone, which is what DESIGN.md "Layout" asks of anything wider
 * than 390px.
 */

import { cn } from '@mirrorline/ui'
import Link from 'next/link'

import { SlidingIndicator } from '@/components/shell/sliding-indicator'
import { RESULTS_TABS, type ResultsTabSlug, resultsTabHref } from '@/lib/studio/results-tabs'

export function ResultsNav({ current }: { current: ResultsTabSlug }) {
  return (
    <nav aria-label="Results sections" className="scroll-x -mx-[18px] px-[18px] sm:mx-0 sm:px-0">
      <ul className="relative m-0 flex list-none gap-1 p-0">
        {/* 17 §2. The strip stays a server component — arriving at your
            numbers still costs no JavaScript — and only the marker is a
            client island, because the tabs are different widths so the
            position has to be measured rather than counted. */}
        <SlidingIndicator axis="x" activeKey={current} className="nav-indicator" />
        {RESULTS_TABS.map((tab) => {
          const isCurrent = tab.slug === current
          return (
            <li key={tab.slug} className="shrink-0">
              <Link
                href={resultsTabHref(tab.slug)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  // `relative`, so the link paints above the marker behind it.
                  'press relative flex min-h-touch items-center whitespace-nowrap rounded-md px-3 text-label',
                  isCurrent
                    ? // The fill comes from the marker now; the current tab
                      // contributes only its text treatment.
                      'font-semibold text-on-accent-soft'
                    : 'font-medium text-text-muted hover:bg-surface-subtle hover:text-text',
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

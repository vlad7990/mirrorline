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

import { RESULTS_TABS, type ResultsTabSlug, resultsTabHref } from '@/lib/studio/results-tabs'

export function ResultsNav({ current }: { current: ResultsTabSlug }) {
  return (
    <nav aria-label="Results sections" className="scroll-x -mx-[18px] px-[18px] sm:mx-0 sm:px-0">
      <ul className="m-0 flex list-none gap-1 p-0">
        {RESULTS_TABS.map((tab) => {
          const isCurrent = tab.slug === current
          return (
            <li key={tab.slug} className="shrink-0">
              <Link
                href={resultsTabHref(tab.slug)}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'press flex min-h-touch items-center whitespace-nowrap rounded-md px-3 text-label',
                  isCurrent
                    ? 'bg-accent-soft font-semibold text-on-accent-soft'
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

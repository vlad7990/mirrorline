/**
 * The category filter (19 v2 ★/resources item 3): "a filter that works
 * without JavaScript where it can".
 *
 * So it is links, not buttons. Each category is a real URL the server can
 * answer — `/resources?category=measuring#articles` — which means it works
 * with scripting off, survives a reload, can be bookmarked and sent to
 * someone, and is reachable from a keyboard with nothing wired up. The page
 * reads `searchParams` and renders the filtered list.
 *
 * **This is not the thing D46 forbids, and the distinction is worth stating
 * because the two look alike.** D46 is about `useSearchParams`, the *client*
 * hook: calling it puts the component under a Suspense boundary, and the whole
 * marketing tree once became that boundary's fallback and shipped empty HTML.
 * A server component reading the `searchParams` prop is a different mechanism
 * with none of that behaviour — the filtering happens before any HTML is sent,
 * and the filtered list is in the document. The cost is that /resources
 * renders per request rather than at build time, which is the honest price of
 * a filter that works with scripting off.
 *
 * A server component.
 */

import { cn } from '@mirrorline/ui'
import Link from 'next/link'

import { ARTICLE_CATEGORIES, type ArticleCategoryKey } from './articles'

/** Where the filter links point. The fragment lands the reader on the list. */
const LIST_ANCHOR = '#articles'

export interface CategoryFilterProps {
  /** The category in force, or `undefined` for the unfiltered view. */
  readonly active: ArticleCategoryKey | undefined
}

export function CategoryFilter({ active }: CategoryFilterProps) {
  const options: readonly {
    readonly key: ArticleCategoryKey | undefined
    readonly label: string
    readonly href: string
  }[] = [
    { key: undefined, label: 'Everything', href: `/resources${LIST_ANCHOR}` },
    ...ARTICLE_CATEGORIES.map((category) => ({
      key: category.key as ArticleCategoryKey | undefined,
      label: category.label,
      href: `/resources?category=${category.key}${LIST_ANCHOR}`,
    })),
  ]

  return (
    <nav aria-label="Filter articles by category">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {options.map((option) => {
          const isActive = option.key === active

          return (
            <li key={option.label}>
              <Link
                href={option.href}
                /* `aria-current="page"` rather than a visual state alone: the
                   selected chip is told apart by its background and its
                   weight, and neither of those reaches a screen reader. */
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-full border px-4 text-label no-underline transition-colors',
                  isActive
                    ? 'border-border-strong bg-surface font-semibold text-text'
                    : 'border-border text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

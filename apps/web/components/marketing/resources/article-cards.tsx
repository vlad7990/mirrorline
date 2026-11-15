/**
 * The article cards (19 v2 ★/resources item 2): labelled AI cover, reading
 * time, hover lift.
 *
 * A server component. The lift is `.card-lift` in globals.css — a transform on
 * hover and focus-within, inside the `prefers-reduced-motion: no-preference`
 * guard, the same shape `.reel-push` uses and for the same reason.
 *
 * **The whole card is not a link.** A card-sized hit area reads as one
 * enormous link to a screen reader, and the accessible name it ends up with is
 * every word in the card run together. The title is the link; the cover and
 * the summary sit outside it. Carried over from the page this replaces, which
 * had it right and said so.
 */

import { AiLabel, Card, cn } from '@mirrorline/ui'
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

import { ARTICLE_CATEGORIES, type Article } from './articles'

/** The label for a category key, for the small line above a card's title. */
function labelFor(key: Article['category']): string {
  // Non-null: `key` is the union of the keys in ARTICLE_CATEGORIES, so the
  // find cannot miss. `articles.test.ts` asserts it for all six articles.
  return ARTICLE_CATEGORIES.find((category) => category.key === key)!.label
}

export interface ArticleCardGridProps {
  readonly articles: readonly Article[]
  /**
   * What the list is, for a screen reader. "Six articles" tells a reader
   * nothing the count already told them; "Articles on measuring" does.
   */
  readonly label: string
  /**
   * Two across rather than three, for the related block at the foot of an
   * article: there are only ever three there, and a third column would leave
   * the last card alone on a row of its own below.
   */
  readonly columns?: 2 | 3
  readonly className?: string
}

export function ArticleCardGrid({ articles, label, columns = 3, className }: ArticleCardGridProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'm-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2',
        columns === 3 ? 'lg:grid-cols-3' : undefined,
        className,
      )}
    >
      {articles.map((article, position) => (
        <li
          key={article.slug}
          className="card-lift reveal-item"
          style={{ '--index': position % 3 } as React.CSSProperties}
        >
          <Card padding="none" className="flex h-full flex-col overflow-hidden">
            <figure className="relative m-0 aspect-[16/9] w-full overflow-hidden bg-surface-subtle">
              {/* Decorative: the title under it is the real text, and the
                  cover illustrates rather than informs. `sizes` is what stops
                  a phone fetching the 1600px file for a 358px card — the
                  convention this app keeps everywhere, and the reason no call
                  site carries an eslint-disable. */}
              <Image
                src={article.cover.src}
                alt=""
                aria-hidden="true"
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 368px, (min-width: 640px) 45vw, calc(100vw - 2.5rem)"
                className="object-cover"
              />

              {/* The label needs a ground. A white-on-ink badge over an
                  arbitrary generated frame is not legible the way it is over
                  a fixed colour, and two of these covers are brightest in
                  exactly the top-left corner. Unconditional, because
                  non-negotiable 4 is a rule about every surface and a label
                  behind a prop goes missing the first time one is forgotten. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-viewer/75 to-transparent"
              />
              <span className="absolute left-3 top-3">
                <AiLabel>AI-generated cover</AiLabel>
              </span>
            </figure>

            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="eyebrow">{labelFor(article.category)}</span>

              <h3 className="m-0 font-heading text-title text-text">
                <Link
                  href={`/resources/${article.slug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {article.title}
                </Link>
              </h3>

              <p className="m-0 text-meta text-text-muted">{article.summary}</p>

              <p className="machine m-0 mt-auto border-t border-border pt-3 text-mono text-text-muted">
                <span className="sr-only">Reading time: </span>
                {article.readingMinutes} min read
              </p>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

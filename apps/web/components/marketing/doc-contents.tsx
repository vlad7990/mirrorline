/**
 * "On this page" — the contents list a reading page opens with.
 *
 * It lived inside `DocPage` until `/legal/privacy` and `/legal/terms` needed
 * one too. Those two are bespoke layouts rather than `DocPage` consumers, so
 * F6d never reached them, and they are the two documents a reader is most
 * likely to arrive at looking for one specific paragraph.
 *
 * One component rather than three copies, because the e2e suite asserts the
 * shape of this thing — a single `nav` labelled by `toc-heading`, every
 * anchor resolving to a heading that exists — and three copies is how one of
 * them drifts out of that shape without anyone noticing.
 *
 * The `nav` carries its own label: a page with a second set of links has to
 * say what they are, or a screen reader meets two unlabelled navigations and
 * has to read both to find out which is which.
 */

import * as React from 'react'

export interface DocContentsItem {
  /** `#section-id`, pointing at a heading that exists on the page. */
  readonly href: string
  readonly title: string
}

export interface DocContentsProps {
  readonly items: readonly DocContentsItem[]
  /**
   * Follow the reader down the page.
   *
   * True where the list has a column of its own beside the prose — `position:
   * sticky` inside a grid column needs no JavaScript, because the column is
   * already as tall as the document beside it. False in a single column,
   * where a sticky list would pin itself over the text it is pointing at.
   */
  readonly sticky?: boolean
  /**
   * Where this list sits in the page's heading order — not how big it looks.
   *
   * `DocPage` puts an `sr-only` `h2` above the document, so the list is an
   * `h3` there. `/legal/privacy` and `/legal/terms` have no such heading:
   * their sections are `h2`s directly under the `h1`, and an `h3` here would
   * skip a level. Lighthouse caught that on both pages (accessibility 98,
   * `heading-order`) where the axe gate did not, because axe files
   * `heading-order` as *moderate* and the gate fails on serious and critical.
   *
   * The two render identically: the size comes from `text-caption`, not from
   * the tag.
   */
  readonly headingLevel?: 2 | 3
  /** Column placement, for the grid layouts. */
  readonly className?: string
}

export function DocContents({
  items,
  sticky = false,
  headingLevel = 3,
  className,
}: DocContentsProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <nav aria-labelledby="toc-heading" className={className}>
      <div className={sticky ? 'lg:sticky lg:top-24' : undefined}>
        <Heading
          id="toc-heading"
          className="m-0 mb-3 font-heading text-caption uppercase tracking-wide text-text-muted"
        >
          On this page
        </Heading>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item, position) => (
            <li key={item.href} className="flex gap-3">
              <span className="machine text-mono text-text-muted">
                {String(position + 1).padStart(2, '0')}
              </span>
              <a href={item.href} className="text-meta text-text underline-offset-4 hover:underline">
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}

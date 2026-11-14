/**
 * The public site's footer. One row at desktop, three columns on a tablet,
 * collapsible groups on a phone.
 *
 * It carries four things the brief asks for: the links, the lead magnet, the
 * line saying "Mirrorline" is a placeholder product name (CLAUDE.md, first
 * line), and the draft-document note, so nobody mistakes the legal pages for
 * reviewed policy.
 *
 * **Why it was rebuilt (D45).** The old footer ran to about 950px — a brand
 * block and three link columns stacked above a four-line block of notes, with
 * every link given a 44px row. On a laptop that is most of a screen of chrome
 * under every page on the site. The rebuild changes three things and nothing
 * else: the brand block joins the link columns in one five-column row instead
 * of sitting above them, link rows drop from 44px to 36px (still well clear
 * of WCAG 2.2's 24px target minimum), and the notes move into the bottom bar
 * beside the copyright instead of owning a band of their own.
 *
 * **The groups are `<details>`, and that is the whole mobile behaviour.** No
 * client component, no state, no hydration: a phone gets four collapsed
 * groups it can open, and from `md` up the CSS in globals.css forces the
 * content open and takes the toggle away, leaving a plain heading over a
 * list. A footer is the last place on the site that should ship JavaScript.
 */

import { Button, LogoWordmark } from '@mirrorline/ui'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { ThemeSwitch } from '@/components/shell/theme-switch'
import { FOOTER_COLUMNS, NICHE_SCAN, liveLinks, type FooterColumn } from '@/lib/site-map'

/**
 * Frozen rather than read from the clock.
 *
 * `new Date()` in a server component is evaluated once at build time anyway,
 * so a dynamic year would not be dynamic — it would be "whenever this was
 * last deployed", which is worse than a number somebody has to change,
 * because nothing would ever tell you it had gone stale.
 */
const COPYRIGHT_YEAR = 2026

/**
 * The legal entity's name.
 *
 * This was a visible `[COMPANY LEGAL NAME]` placeholder, on the reasoning that
 * a real-looking company name under a copyright line is a claim and
 * non-negotiable 7 does not allow one we cannot stand behind. Vlad has now
 * given the entity, so the claim is one we can stand behind and the
 * placeholder is the thing it would be wrong to ship. "Mirrorline" above it
 * stays a placeholder product name until that is settled.
 */
const COMPANY_LEGAL_NAME = 'VN & MN Product Group Inc'

/**
 * 16 §4's footer, minus routes that have not landed.
 *
 * A column whose links are all still unbuilt would render as a heading over
 * nothing, so empty columns drop out entirely.
 */
const COLUMNS = FOOTER_COLUMNS.map((column) => ({
  ...column,
  links: liveLinks(column.links),
})).filter((column) => column.links.length > 0)

/** The three notes that used to be a band of their own. */
const NOTES: readonly React.ReactNode[] = [
  <>
    <strong className="font-semibold text-text">
      &ldquo;Mirrorline&rdquo; is a placeholder product name.
    </strong>{' '}
    It is a working title for this build and may change before launch.
  </>,
  <>
    The privacy notice and the terms are drafts. They have not been reviewed by a lawyer and are
    not legal advice.
  </>,
  <>
    Every figure shown on this site is sample data from a fictional demo client, not a customer
    result.
  </>,
]

function FooterGroup({ column }: { column: FooterColumn }) {
  return (
    <nav aria-label={column.heading}>
      {/* `group` is what lets the chevron answer the open state without a
          stylesheet rule of its own; `footer-group` is what globals.css
          targets to force the content open from `md` up. */}
      <details className="footer-group group border-b border-border pb-1 md:border-0 md:pb-0">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 md:cursor-default">
          <h2 className="eyebrow m-0">{column.heading}</h2>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-180 md:hidden"
            strokeWidth={1.8}
          />
        </summary>
        <ul className="m-0 flex list-none flex-col p-0 pb-1 md:pb-0">
          {column.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-9 items-center text-meta text-text-muted hover:text-text"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8">
        {/* One row of five at lg, three columns at md, one on a phone. The
            brand block takes half again the width of a link column, because
            it holds a sentence and the others hold single words.

            At md the brand block is a cell in the three-column grid rather
            than a banner spanning it. Spanning was the first draft and it
            cost 300px: the brand went full width, and the four link groups
            then needed two rows of three below it. As a cell it shares row
            one with Product and Company, and only Account and Legal fall to
            row two — where the Legal column is the tallest thing on the page
            anyway and the row is free. */}
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-x-10">
          <div className="flex max-w-[34ch] flex-col items-start gap-3">
            <LogoWordmark size={24} />
            {/* Industry-agnostic, per 16 §1 and 10 §1. This line used to name
                coaches, consultants and local service businesses, which is
                the positioning D38 retired. One sentence now rather than
                three: the long version is on every page above this. */}
            {/* `text-meta`, not `text-caption`: caption is 12px/600 by token,
                which is right for the notes in the bottom bar and too heavy
                for a sentence sitting beside a column of 400-weight links. */}
            <p className="m-0 text-meta text-text-muted">
              Short-video growth for any business or individual, in any industry — posted to
              accounts you own, through the official platform APIs.
            </p>
            <Button asChild variant="gold" className="press">
              <Link href={NICHE_SCAN.href}>{NICHE_SCAN.label}</Link>
            </Button>
          </div>

          {COLUMNS.map((column) => (
            <FooterGroup column={column} key={column.heading} />
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <p className="m-0 shrink-0 text-caption text-text-muted">
            © {COPYRIGHT_YEAR} {COMPANY_LEGAL_NAME}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:justify-end lg:gap-8">
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-caption text-text-muted lg:max-w-[68ch] lg:text-right">
              {NOTES.map((note, position) => (
                // A static list, so the index is the only stable key there is
                // — and it is a real one here: nothing reorders or filters.
                <li key={position}>{note}</li>
              ))}
            </ul>
            {/* Light / dark / system. It was only ever in the studio shell,
                which left a reader who prefers one of them no way to say so
                on the pages they see first. */}
            <ThemeSwitch className="m-0 w-[132px] shrink-0 border-0 p-0" />
          </div>
        </div>
      </div>
    </footer>
  )
}

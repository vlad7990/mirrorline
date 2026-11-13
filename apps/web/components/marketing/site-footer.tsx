/**
 * The public site's footer.
 *
 * It carries three things the brief asks for: the links, the line saying
 * "Mirrorline" is a placeholder product name (CLAUDE.md, first line), and the
 * draft-document links, each marked as a draft so nobody mistakes them for
 * reviewed policy.
 */

import { LogoWordmark } from '@mirrorline/ui'
import Link from 'next/link'

import { FOOTER_COLUMNS, liveLinks } from '@/lib/site-map'

/**
 * 16 §4's footer, minus routes that have not landed.
 *
 * A column whose links are all still unbuilt would render as a heading over
 * nothing, so empty columns drop out entirely. The Legal column is empty until
 * PR7, and the existing drafts stand in for it until then.
 */
const COLUMNS = FOOTER_COLUMNS.map((column) => ({
  ...column,
  links: liveLinks(column.links),
})).filter((column) => column.links.length > 0)

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex max-w-[34ch] flex-col gap-3">
            <LogoWordmark size={26} />
            {/* Industry-agnostic, per 16 §1 and 10 §1. This line used to name
                coaches, consultants and local service businesses, which is
                the positioning D38 retired. */}
            <p className="m-0 text-meta text-text-muted">
              Short-video growth for any business or individual, in any industry. Your own footage or
              originals we make for you, posted to your own accounts through the official platform
              APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:gap-12">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-2">
                <h2 className="eyebrow m-0">{column.heading}</h2>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-meta text-text-muted hover:text-text"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-meta text-text-muted">
          <p className="m-0">
            <strong className="font-semibold text-text">
              &ldquo;Mirrorline&rdquo; is a placeholder product name.
            </strong>{' '}
            It is a working title for this build and may change before launch.
          </p>
          <p className="m-0">
            The privacy notice and the terms are drafts. They have not been reviewed by a lawyer and
            are not legal advice.
          </p>
          <p className="m-0">
            Every figure shown on this site is sample data from a fictional demo client, not a
            customer result.
          </p>
        </div>
      </div>
    </footer>
  )
}

/**
 * Chrome for sign-in and sign-up.
 *
 * The Stitch screens put a slim bar at the top, the form on the left and a
 * context panel on the right. That layout is kept; the jargon on it is not —
 * docs/design/STITCH_REVIEW.md item 7 replaces "Studio Access · Secure Vault"
 * and "Auth Node 04 Online" with plain words, and item 2 removes the
 * certification badges along the bottom.
 */

import { LogoWordmark } from '@mirrorline/ui'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center rounded-md"
            aria-label="Mirrorline, home"
          >
            <LogoWordmark size={26} />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-md px-3 text-label text-text-muted hover:text-text"
          >
            Back to the website
          </Link>
        </div>
      </header>

      {/* tabIndex -1: Safari scrolls to a skip-link target without moving
          focus, so the next Tab would start again from the top of the page. */}
      <main id="main" tabIndex={-1} className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">{children}</div>
      </main>

      <footer className="border-t border-border bg-surface-subtle">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-6 text-meta text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="m-0">&ldquo;Mirrorline&rdquo; is a placeholder product name.</p>
          <span className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-text">
              Privacy notice (draft)
            </Link>
            <Link href="/terms" className="hover:text-text">
              Terms (draft)
            </Link>
            <Link href="/trust" className="hover:text-text">
              Our rules
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

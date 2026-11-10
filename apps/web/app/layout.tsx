import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { ThemeProvider, THEME_SCRIPT } from '@mirrorline/ui'

import './globals.css'

/* DESIGN.md "Typography": the product has two voices. Geist is the studio
   speaking to the user; Geist Mono is the machine reporting — agent logs,
   costs, timings, similarity percentages, spend caps. Both are self-hosted by
   the `geist` package, so no font is fetched from a third party.
   theme.css consumes --font-geist-sans and --font-geist-mono. */

export const metadata: Metadata = {
  title: {
    default: 'Mirrorline',
    template: '%s · Mirrorline',
  },
  // The one-liner from docs/specs/01_PRODUCT_BRIEF.md.
  description:
    "Mirrorline turns a brand's own videos, and the formats going viral in its niche, into a steady stream of original short videos, published several times a day to the brand's own accounts by a team of AI agents that learns from every post. Mirrorline is a placeholder name.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // SC 2.4.11: `scroll-pt-20` (80px) keeps whatever Tab scrolls into view clear
  // of the sticky bars — the 64px marketing header and the ~49px studio top bar
  // — instead of parking the newly focused control underneath one of them.
  return (
    <html
      lang="en"
      className={`scroll-pt-20 ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-background font-body text-text">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-touch focus:items-center focus:rounded-md focus:border focus:border-border-strong focus:bg-surface focus:px-4 focus:text-label focus:font-semibold focus:text-text"
          >
            Skip to content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

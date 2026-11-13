import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { GeistSerifRegular } from 'geist/font/serif/regular'
import { ThemeProvider, TooltipProvider, THEME_SCRIPT } from '@mirrorline/ui'

import './globals.css'

/* DESIGN.md "Typography": the product has two voices. Geist is the studio
   speaking to the user; Geist Mono is the machine reporting — agent logs,
   costs, timings, similarity percentages, spend caps. Both are self-hosted by
   the `geist` package, so no font is fetched from a third party.
   theme.css consumes --font-geist-sans and --font-geist-mono.

   Geist Serif is the third voice and belongs to the PUBLIC SITE ONLY (D25):
   display headlines and the gold accent phrase. The studio stays entirely
   sans, because a serif inside an instrument reads as decoration. It is
   declared here because next/font must be called at module scope in a layout
   and the root is the one every route shares; the file is still only fetched
   where `font-serif` is actually used. */

export const metadata: Metadata = {
  title: {
    default: 'Mirrorline',
    template: '%s · Mirrorline',
  },
  // The one-liner from docs/specs/01_PRODUCT_BRIEF.md, with one phrase
  // changed: it said "the formats going viral in its niche". True of what the
  // Niche Scan finds, and still the wrong words in the sentence a search
  // result shows — read quickly it is a promise about your account rather
  // than a description of someone else's. "Growing fastest" is what we
  // actually measure, by views per follower over 30 days. The banned-phrase
  // test holds it.
  description:
    "Mirrorline turns a brand's own videos, and the formats growing fastest in its niche, into a steady stream of original short videos, published several times a day to the brand's own accounts by a team of AI agents that learns from every post. Mirrorline is a placeholder name.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // SC 2.4.11: `scroll-pt-20` (80px) keeps whatever Tab scrolls into view clear
  // of the sticky bars — the 64px marketing header and the ~49px studio top bar
  // — instead of parking the newly focused control underneath one of them.
  return (
    <html
      lang="en"
      className={`scroll-pt-20 ${GeistSans.variable} ${GeistMono.variable} ${GeistSerifRegular.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-background font-body text-text">
        <ThemeProvider>
          {/* Radix requires a provider above every tooltip, so the one the
              library exports is unusable without this. It belongs at the root
              rather than per tooltip for a second reason: skipDelayDuration is
              shared state. Once one tooltip is open, moving along a row of
              controls opens the rest instantly, which is what makes a toolbar
              feel quick. Per-instance providers would lose that. */}
          <TooltipProvider delayDuration={200} skipDelayDuration={300}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:h-touch focus:items-center focus:rounded-md focus:border focus:border-border-strong focus:bg-surface focus:px-4 focus:text-label focus:font-semibold focus:text-text"
            >
              Skip to content
            </a>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

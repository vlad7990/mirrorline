import type { Metadata } from 'next'
import { Inter, Inter_Tight } from 'next/font/google'
import { ThemeProvider, THEME_SCRIPT } from '@mirrorline/ui'

import './globals.css'

/* DESIGN.md "Typography": body is Inter, headings are Inter Tight. The CSS
   variables are consumed by the @theme inline block in globals.css. */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
})

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
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
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

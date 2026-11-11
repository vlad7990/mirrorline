/**
 * Chrome for every public page: sticky header, one <main>, footer.
 *
 * The root layout (apps/web/app/layout.tsx) already renders the skip link that
 * targets #main, so this layout owns the landmark it points at.
 */

import { SiteFooter } from '@/components/marketing/site-footer'
// From site-chrome, NOT from site-header: that module is `'use client'`, and
// a constant imported from one into a server component comes back as a
// throwing stub rather than a number. See site-chrome.ts.
import { HEADER_HEIGHT_PX } from '@/components/marketing/site-chrome'
import { SiteHeader } from '@/components/marketing/site-header'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    // The site is ink by default and lights up band by band (D25). Setting it
    // here rather than per page means a short page's empty space below the
    // fold is still the site's colour and not the studio's.
    <div className="band-ink flex min-h-dvh flex-col">
      {/* The header is `fixed`, so it is out of flow and the page has to
          reserve its height. Its announcement bar carries the capacity line
          that used to be a separate strip above the header (D21). */}
      <SiteHeader />
      {/* tabIndex -1: Safari scrolls to a skip-link target without moving
          focus, so the next Tab would start again from the top of the page. */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1"
        style={{ paddingTop: `${HEADER_HEIGHT_PX}px` }}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

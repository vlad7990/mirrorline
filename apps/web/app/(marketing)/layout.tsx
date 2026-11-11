/**
 * Chrome for every public page: sticky header, one <main>, footer.
 *
 * The root layout (apps/web/app/layout.tsx) already renders the skip link that
 * targets #main, so this layout owns the landmark it points at.
 */

import { CapacityBar } from '@/components/marketing/capacity-bar'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Above the header and not sticky, so it scrolls away and only one bar
          is ever pinned. */}
      <CapacityBar />
      <SiteHeader />
      {/* tabIndex -1: Safari scrolls to a skip-link target without moving
          focus, so the next Tab would start again from the top of the page. */}
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

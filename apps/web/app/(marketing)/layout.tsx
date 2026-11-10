/**
 * Chrome for every public page: sticky header, one <main>, footer.
 *
 * The root layout (apps/web/app/layout.tsx) already renders the skip link that
 * targets #main, so this layout owns the landmark it points at.
 */

import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

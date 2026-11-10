import { MobileNav } from '@/components/shell/mobile-nav'
import { Sidebar } from '@/components/shell/sidebar'

/**
 * The studio shell: every signed-in screen under /app except onboarding, which
 * has no sidebar and so sits outside this route group.
 *
 * DESIGN.md "Layout": "Desktop at 1440px: a fixed 240px left sidebar and a
 * fluid content area with 32–40px padding" and "Mobile at 390 × 844: single
 * column, 18px side padding".
 */

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-sidebar">
      {/* The wrapper owns the responsive display, so the sidebar's own
          `flex` and a `hidden` utility never fight over one element. */}
      <div className="fixed inset-y-0 left-0 z-20 hidden lg:block">
        <Sidebar />
      </div>

      <MobileNav />

      <main id="main" className="min-w-0 px-[18px] py-6 sm:px-8 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  )
}

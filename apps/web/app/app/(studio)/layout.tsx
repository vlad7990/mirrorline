import { MobileNav } from '@/components/shell/mobile-nav'
import { Sidebar } from '@/components/shell/sidebar'
import { StudioCopilot } from '@/components/studio/copilot/studio-copilot'
import { ScheduleMovesProvider } from '@/lib/studio/schedule-moves-context'

/**
 * The studio shell: every signed-in screen under /app except onboarding, which
 * has no sidebar and so sits outside this route group.
 *
 * DESIGN.md "Layout": "Desktop at 1440px: a fixed 240px left sidebar and a
 * fluid content area with 32–40px padding" and "Mobile at 390 × 844: single
 * column, 18px side padding".
 *
 * ## Two things live here rather than on a screen
 *
 * **The co-pilot**, because 18 §2.4 gives it "⌘K from anywhere in `/app/*`".
 * Anywhere means the layout; mounting it per screen would mean a shortcut
 * that worked on the pages somebody remembered to add it to.
 *
 * **Reschedules**, because approving a `move-post` proposal has to perform the
 * calendar's own move rather than a second copy of it, and the co-pilot can be
 * open on any screen when it happens. They were local state in
 * `calendar-view.tsx` until C3.
 *
 * Since B2.2 they are **persisted** — `movePostToSlot` writes the two columns a
 * member may write — and the provider's map is the optimistic layer over that
 * write, which it rolls back if the write is refused. The map still dies with
 * the page; that no longer means the move did.
 */

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <ScheduleMovesProvider>
      <div className="min-h-dvh lg:pl-sidebar">
        {/* The wrapper owns the responsive display, so the sidebar's own
            `flex` and a `hidden` utility never fight over one element. */}
        <div className="fixed inset-y-0 left-0 z-20 hidden lg:block">
          <Sidebar />
        </div>

        <MobileNav />

        {/* tabIndex -1: Safari scrolls to a skip-link target without moving
            focus, so the next Tab would start again from the top of the page. */}
        <main id="main" tabIndex={-1} className="min-w-0 px-[18px] py-6 sm:px-8 lg:px-10 lg:py-8">
          {children}
        </main>

        <StudioCopilot />
      </div>
    </ScheduleMovesProvider>
  )
}

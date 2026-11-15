/**
 * Chrome for every public page: sticky header, one <main>, footer.
 *
 * The root layout (apps/web/app/layout.tsx) already renders the skip link that
 * targets #main, so this layout owns the landmark it points at.
 */

import * as React from 'react'

import { CookieBanner } from '@/components/marketing/cookie-banner'
import { SiteCopilot } from '@/components/marketing/copilot/site-copilot'
import { SiteFooter } from '@/components/marketing/site-footer'
// From site-chrome, NOT from site-header: that module is `'use client'`, and
// a constant imported from one into a server component comes back as a
// throwing stub rather than a number. See site-chrome.ts.
import { HEADER_HEIGHT_PX } from '@/components/marketing/site-chrome'
import { SiteHeader } from '@/components/marketing/site-header'
import { ViewTransitions } from '@/components/marketing/view-transitions'
import { AccountChoiceProvider } from '@/lib/audience/account-type-context'
import { CookieConsentProvider } from '@/lib/consent/cookie-consent-context'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    // The site is ink by default and lights up band by band (D25). Setting it
    // here rather than per page means a short page's empty space below the
    // fold is still the site's colour and not the studio's.
    //
    // **There is no Suspense boundary here any more, and that is the point.**
    // There used to be one wrapping all of this, because `useSearchParams`
    // opts its subtree out of static rendering without one. It did keep the
    // build passing — and it also meant the prerendered HTML of every public
    // page *was its fallback*: `curl /` returned no `<main>`, no header, no
    // footer and none of the copy, and the client rendered the lot after
    // hydration. The boundary now sits around the one component that reads
    // the query string, inside `AccountChoiceProvider`, so everything below
    // is static HTML again. D46; do not move it back up here.
    <AccountChoiceProvider>
      {/* One consent answer, read by the banner that asks for it and by the
          co-pilot launcher that may not appear until it exists (18 §3.3).
          It holds no state worth a boundary of its own, so it sits here
          rather than around the whole tree. */}
      <CookieConsentProvider>
        <div className="band-ink flex min-h-dvh flex-col">
          {/* The header is `fixed`, so it is out of flow and the page has to
              reserve its height. Its announcement strip is the one from D25,
              with the invented capacity figure removed (D39). */}
          <SiteHeader />
          {/* tabIndex -1: Safari scrolls to a skip-link target without moving
              focus, so the next Tab would start again from the top of the
              page. */}
          <main
            id="main"
            tabIndex={-1}
            className="flex-1"
            style={{ paddingTop: `${HEADER_HEIGHT_PX}px` }}
          >
            {children}
          </main>
          <SiteFooter />
          {/* Last in the tree, and fixed to the bottom: it must not be the
              first thing a keyboard user tabs into on every page. */}
          <CookieBanner />
          {/* The co-pilot (18 §3), after the banner for the same reason and
              one more: it renders nothing at all until the banner has been
              answered, so on a first visit this is an empty fragment. */}
          <SiteCopilot />
          {/* 17 §1 M11. Renders nothing — it is one delegated click
              listener — and it is mounted here rather than in the root
              layout so a studio navigation can never reach it.
              `studio-nav.tsx` keeps the arrival of those screens instant on
              purpose. */}
          <ViewTransitions />
        </div>
      </CookieConsentProvider>
    </AccountChoiceProvider>
  )
}

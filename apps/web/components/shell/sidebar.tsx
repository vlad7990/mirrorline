'use client'

import Link from 'next/link'
import { LogoWordmark } from '@mirrorline/ui'

import { StudioNav } from './studio-nav'
import { ThemeSwitch } from './theme-switch'
import { UsageMeter } from './usage-meter'
import { WorkspaceSwitcher } from './workspace-switcher'

/**
 * The studio sidebar: 240px, fixed, desktop only.
 *
 * DESIGN.md "Layout": "a fixed 240px left sidebar ... Sidebar contents, in
 * order: logo, workspace switcher, navigation, usage meter at the bottom."
 *
 * The theme switch sits just above the usage meter. DESIGN.md asks for a full
 * dark mode, and the sidebar is the only shell surface on every studio page.
 *
 * ## Ink, like the site's own chrome (D122)
 *
 * `band-ink` remaps the semantic tokens — background, surface, border, text —
 * to the ink set, which is how the public site paints a dark section without
 * any component knowing it exists. Reusing it is the whole point of the
 * restyle: a client walks from a gold-and-ink marketing page into a studio
 * whose frame is the same material, and `Card`, `Button` and the nav need no
 * studio-specific variants to come along.
 *
 * `chrome-ink` is the one pair `band-ink` does not cover — the nav's selected
 * state, which is `accent-soft` and would otherwise stay a cream pill from the
 * light theme.
 *
 * The content area is untouched and stays light by default. An instrument is
 * read for hours: the frame can be dark, the work cannot.
 */

const LOGO_SIZE = 26

export function Sidebar({ className }: { className?: string }) {
  return (
    // A landmark, not a bare <div>: the wordmark, the workspace switcher, the
    // theme radios and the usage meter all sit outside <main>, and content that
    // belongs to no landmark is content a screen-reader user cannot jump to.
    // The <nav aria-label="Studio"> stays nested inside it.
    <aside
      aria-label="Workspace"
      className={[
        'band-ink chrome-ink flex h-full w-sidebar flex-col gap-3.5 border-r border-border bg-background px-4 py-6',
        className ?? '',
      ].join(' ')}
    >
      <Link href="/app/home" className="inline-flex rounded-md px-2 pb-1">
        {/* The site's treatment, exactly: gold loop, light word (D25). */}
        <LogoWordmark size={LOGO_SIZE} markClassName="text-gold-bright" />
      </Link>

      <WorkspaceSwitcher />

      <StudioNav />

      {/* Pushes the footer to the bottom of a full-height sidebar. */}
      <div className="flex-1" />

      <div className="flex flex-col gap-4">
        <ThemeSwitch />
        <UsageMeter />
      </div>
    </aside>
  )
}

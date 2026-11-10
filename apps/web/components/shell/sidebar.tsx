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
 */

const LOGO_SIZE = 26

export function Sidebar({ className }: { className?: string }) {
  return (
    <div
      className={[
        'flex h-full w-sidebar flex-col gap-3.5 border-r border-border bg-surface px-4 py-6',
        className ?? '',
      ].join(' ')}
    >
      <Link href="/app/home" className="inline-flex rounded-md px-2 pb-1">
        <LogoWordmark size={LOGO_SIZE} />
      </Link>

      <WorkspaceSwitcher />

      <StudioNav />

      {/* Pushes the footer to the bottom of a full-height sidebar. */}
      <div className="flex-1" />

      <div className="flex flex-col gap-4">
        <ThemeSwitch />
        <UsageMeter />
      </div>
    </div>
  )
}

'use client'

/**
 * The public site's sticky header.
 *
 * Desktop: wordmark, three links, a "Sign in" text link and the one primary
 * action. At 390px the links collapse into a drawer, so nothing wraps and the
 * page never scrolls sideways. DESIGN.md: flat, 1px border, 44px targets, one
 * primary button per section.
 */

import { LogoWordmark, cn } from '@mirrorline/ui'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import { Modal } from './modal'

export interface NavLink {
  readonly href: string
  readonly label: string
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/trust', label: 'Trust' },
]

const LINK_CLASS =
  'inline-flex h-11 items-center rounded-md px-3 text-label text-text-muted transition-colors hover:text-text'

const DRAWER_LINK_CLASS =
  'inline-flex h-12 items-center rounded-md px-3 text-title text-text hover:bg-surface-subtle'

export function SiteHeader() {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center rounded-md" aria-label="Mirrorline, home">
          <LogoWordmark size={26} />
        </Link>

        {/* Desktop navigation. */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/sign-in" className={cn(LINK_CLASS, 'text-text')}>
            Sign in
          </Link>
          <LeadDialogButton intent="pilot" />
        </div>

        {/* 390px: one button that opens the drawer. */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="press inline-grid size-11 place-items-center rounded-md border border-border-strong bg-surface text-text md:hidden"
          aria-haspopup="dialog"
          aria-expanded={isDrawerOpen}
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.8} />
          <span className="sr-only">Open the menu</span>
        </button>
      </div>

      <Modal
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Menu"
        variant="drawer"
        closeLabel="Close the menu"
      >
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsDrawerOpen(false)}
              className={DRAWER_LINK_CLASS}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            onClick={() => setIsDrawerOpen(false)}
            className={DRAWER_LINK_CLASS}
          >
            Sign in
          </Link>
        </nav>
        <div className="mt-5 flex flex-col gap-2">
          <LeadDialogButton intent="pilot" fullWidth />
          <LeadDialogButton intent="demo" variant="secondary" fullWidth />
        </div>
      </Modal>
    </header>
  )
}

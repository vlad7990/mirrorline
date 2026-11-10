'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogoWordmark } from '@mirrorline/ui'

import { CloseIcon, MenuIcon } from '@/components/icons'
import { StudioNav } from './studio-nav'
import { ThemeSwitch } from './theme-switch'
import { UsageMeter } from './usage-meter'
import { WorkspaceSwitcher } from './workspace-switcher'

/**
 * The shell below 1024px: a top bar, and the sidebar as a drawer.
 *
 * The drawer is a native <dialog> opened with showModal(), which traps focus,
 * makes the page behind it inert and closes on Escape without any extra code.
 * @mirrorline/ui wraps Radix for in-page dialogs, but its Dialog is not
 * exported yet and @radix-ui/react-dialog does not resolve from this app.
 *
 * DESIGN.md "Layout": "Mobile at 390 × 844: single column, 18px side padding,
 * large touch targets."
 */

const LOGO_SIZE = 24
const ICON_SIZE = 22

export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface px-[18px] py-2.5 lg:hidden">
      <Link href="/app/home" className="inline-flex rounded-md">
        <LogoWordmark size={LOGO_SIZE} />
      </Link>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        className="press inline-flex h-touch w-touch items-center justify-center rounded-md border border-border text-text"
      >
        <MenuIcon size={ICON_SIZE} />
        <span className="sr-only">Open menu</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Studio menu"
        onClose={close}
        onClick={(event) => {
          // A click that lands on the dialog itself is a click on the backdrop:
          // every child covers the drawer's own box.
          if (event.target === dialogRef.current) close()
        }}
        // Deliberately not animated. DESIGN.md gives drawers `--ease-drawer`,
        // and @mirrorline/ui's `Drawer` is where that lives — the calendar's
        // review sheet uses it. This one is a native <dialog> put into the top
        // layer by showModal(), which cannot be transitioned without a
        // keyframe in theme.css, and theme.css is not this app's to edit. It
        // opens instantly, which is also the right call for a menu a person
        // taps many times a day.
        className="fixed top-0 bottom-0 left-0 m-0 h-full max-h-none w-[17.5rem] max-w-[86vw] overflow-y-auto border-r border-border bg-surface p-0 text-text backdrop:bg-ink/40"
      >
        <div className="flex min-h-full flex-col gap-3.5 px-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <LogoWordmark size={LOGO_SIZE} />
            <button
              type="button"
              onClick={close}
              className="press inline-flex h-touch w-touch items-center justify-center rounded-md border border-border text-text"
            >
              <CloseIcon size={ICON_SIZE} />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <WorkspaceSwitcher />

          <StudioNav onNavigate={close} />

          <div className="flex-1" />

          <div className="flex flex-col gap-4">
            <ThemeSwitch />
            <UsageMeter />
          </div>
        </div>
      </dialog>
    </header>
  )
}

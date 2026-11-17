'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { workspace } from '@mirrorline/mock'
import Link from 'next/link'

import { ChevronDownIcon } from '@/components/icons'
import { SAMPLE_PORTFOLIO, isCurrentBrand } from '@/lib/studio/portfolio'

/**
 * The workspace switcher at the top of the sidebar.
 *
 * DESIGN.md "Layout": "workspace switcher ("Maya Torres Coaching · Growth
 * plan")".
 *
 * **It lists the brands the portfolio lists.** This used to say "there is one
 * workspace in the demo, so the menu says so plainly rather than pretending
 * there are more" — which stopped being true the moment Portfolio shipped with
 * three. One screen claiming one workspace while another shows three is the
 * kind of disagreement nobody notices until a client does.
 *
 * Both now read `SAMPLE_PORTFOLIO`, so they cannot drift. Switching is not
 * wired, so the brands you are not in are disabled with the reason written
 * underneath, rather than quietly doing nothing when clicked.
 */

const INITIALS_COUNT = 2
/**
 * The sidebar is 240px and the switcher has to show "Maya Torres Coaching" and
 * "Growth plan" in full, as S02_Home.png does. The avatar, the two gaps, the
 * button padding and the chevron are the only things competing with the text,
 * so each is trimmed to the smallest size that still reads.
 */
const AVATAR_SIZE = 28
const CHEVRON_SIZE = 12
const SWITCHER_MIN_HEIGHT = 48

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, INITIALS_COUNT)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const initials = initialsOf(workspace.name)

  return (
    <div ref={containerRef} className="relative">
      {/* A disclosure button, not a menu button: aria-expanded plus
          aria-controls is the whole contract, and it is one we keep. */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-2 text-left transition-colors hover:border-border-strong"
        style={{ minHeight: SWITCHER_MIN_HEIGHT }}
      >
        <span
          aria-hidden="true"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-demo-teal text-caption font-bold text-demo-sand"
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          {initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-caption font-semibold text-text">{workspace.name}</span>
          <span className="truncate text-caption font-normal text-text-muted">
            {/* The fixture holds the plan's name; "plan" is the word that turns
                it into the sentence DESIGN.md asks for. */}
            {workspace.planName} plan
          </span>
        </span>
        <ChevronDownIcon size={CHEVRON_SIZE} className="shrink-0 text-text-muted" />
      </button>

      {/* SC 4.1.2: this used to claim role="menu" without ever moving focus
          into it and without arrow-key support, and its one disabled
          role="menuitem" was a <span> with no tabindex, so it could not be
          reached at all. A plain labelled group of real buttons promises only
          what it delivers: Tab walks it, Escape and an outside click close it. */}
      {isOpen ? (
        <div
          id={menuId}
          role="group"
          aria-label="Switch workspace"
          className="absolute top-full right-0 left-0 z-20 mt-1.5 rounded-lg border border-border bg-surface p-1"
        >
          {SAMPLE_PORTFOLIO.map((brand) =>
            isCurrentBrand(brand) ? (
              <button
                key={brand.id}
                type="button"
                aria-current="true"
                onClick={() => setIsOpen(false)}
                className="flex min-h-touch w-full items-center rounded-md bg-accent-soft px-3 text-left text-label text-on-accent-soft"
              >
                {brand.name}
                <span className="sr-only"> (current workspace)</span>
              </button>
            ) : (
              <button
                key={brand.id}
                type="button"
                disabled
                className="flex min-h-touch w-full items-center px-3 text-left text-label text-text-muted"
              >
                {brand.name}
              </button>
            ),
          )}

          <p className="m-0 px-3 py-1.5 text-caption text-text-muted">
            Switching brands is not wired in this preview. Their numbers are on{' '}
            <span className="text-text">All brands</span>.
          </p>
          {/* Where Portfolio is reached from, now the sidebar is back to the
              eight items DESIGN.md fixes. It belongs here rather than in the
              nav: it is the only screen that spans workspaces, and this is
              already the control for "which brand am I looking at". */}
          <Link
            href="/app/portfolio"
            onClick={() => setIsOpen(false)}
            className="flex min-h-touch w-full items-center rounded-md px-3 text-left text-label text-text-muted hover:bg-surface-subtle hover:text-text"
          >
            All brands
          </Link>
          <button
            type="button"
            disabled
            className="flex min-h-touch w-full items-center px-3 text-left text-meta text-text-muted"
          >
            Add workspace (coming soon)
          </button>
        </div>
      ) : null}
    </div>
  )
}

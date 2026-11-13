/**
 * The three devices the home hero introduced, as a system rather than one-offs.
 *
 * The cinematic rebuild (D34) gave the landing page a photographic backdrop, a
 * numbered index along its base and vertical type in the right margin. None of
 * them appeared anywhere else, so a visitor moving from the home page to any
 * sub-page dropped from cinematic to flat — two sites wearing the same
 * typeface. These are shared so all five heroes speak with one voice (D37).
 *
 * Everything here is decorative or duplicative and is hidden from assistive
 * technology accordingly, with one deliberate exception noted on `HeroIndex`.
 */

import Image from 'next/image'
import * as React from 'react'

/* -------------------------------------------------------------------------- */
/* Backdrop                                                                    */
/* -------------------------------------------------------------------------- */

export interface HeroBackdropProps {
  /** How far the scrim is pushed. `deep` all but hides it behind content. */
  readonly strength?: 'standard' | 'deep'
}

/**
 * The generated studio room, behind a hero.
 *
 * One image for every page rather than one per page: it is a *room*, not an
 * illustration of a topic, so it does not need to change when the subject
 * does — and five generated backdrops would be five things to label and five
 * more chances to imply something untrue.
 *
 * `strength` exists because the landing page sets its headline directly on the
 * image while sub-pages put a bright screenshot on top of it. One scrim cannot
 * serve both: what reads as atmosphere behind a headline reads as noise behind
 * a screenshot.
 *
 * Non-negotiable 4 applies wherever this is used. The caller carries the
 * label, because a label belongs beside the image rather than in this file.
 */
export function HeroBackdrop({ strength = 'standard' }: HeroBackdropProps) {
  const isDeep = strength === 'deep'

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <Image
        src="/hero/studio-1920.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Left to right, so the text column sits on near-black whatever the
          screens behind it are doing. */}
      <div
        className={
          isDeep
            ? 'absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/94 to-ink-900/70'
            : 'absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/35'
        }
      />
      {/* And a base lift, so whatever sits along the bottom edge reads. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-900 to-transparent" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Numbered index                                                              */
/* -------------------------------------------------------------------------- */

export interface HeroIndexItem {
  /** "01"–"04", or a step number. Shown in the machine's voice. */
  readonly number: string
  readonly title: string
  /** Omitted on longer lists, where seven captions would be a paragraph. */
  readonly description?: string
}

export interface HeroIndexProps {
  readonly items: readonly HeroIndexItem[]
}

/**
 * The row along a hero's base.
 *
 * A real `<ol>`, and deliberately not `aria-hidden`: unlike the backdrop and
 * the margin note, these are the page's actual contents in their actual
 * order. Hiding them would take a genuine summary away from a screen reader
 * to protect a visual effect.
 *
 * Wraps at four. Seven items become two rows rather than seven cramped
 * columns, which is why this wraps rather than scrolls.
 */
export function HeroIndex({ items }: HeroIndexProps) {
  if (items.length === 0) return null

  return (
    <ol className="m-0 grid list-none gap-x-6 gap-y-5 border-t border-ink-line p-0 pt-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, position) => (
        <li
          key={`${item.number}-${item.title}`}
          className="reveal-item flex gap-3"
          // Wrapped at the column count, or a long grid's last rows never
          // finish moving — the lesson from D30.
          style={{ '--index': position % 4 } as React.CSSProperties}
        >
          <span aria-hidden="true" className="machine text-mono text-gold">
            {item.number}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-heading text-meta font-semibold text-on-ink-900">
              {item.title}
            </span>
            {item.description ? (
              <span className="text-meta text-on-ink-faint">{item.description}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* Margin note                                                                 */
/* -------------------------------------------------------------------------- */

export interface HeroMarginNoteProps {
  readonly children: React.ReactNode
}

/**
 * Vertical type in the right margin.
 *
 * The reference site runs Japanese characters down the edge as pure
 * decoration. Ours carries a real figure in the machine's voice instead —
 * decoration that happens to be true. `aria-hidden` because it is marginal by
 * construction, and a screen reader reading it between a headline and a lead
 * would be reading furniture.
 *
 * Hidden below `lg`, where there is no margin to put it in.
 */
export function HeroMarginNote({ children }: HeroMarginNoteProps) {
  return (
    <p
      aria-hidden="true"
      className="machine m-0 hidden justify-self-end text-mono text-on-ink-faint lg:block lg:[writing-mode:vertical-rl]"
    >
      {children}
    </p>
  )
}

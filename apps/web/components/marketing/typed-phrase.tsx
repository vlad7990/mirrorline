'use client'

/**
 * The hero's second line, typing and retyping itself.
 *
 * From docs/design/handoff-v4 §Home: the headline reads "Turn one long video
 * into" and this cycles underneath it — 70ms a character to type, 1800ms
 * held, 35ms a character to delete, 300ms before the next one starts.
 *
 * Two things this gets right that a naive version does not.
 *
 * **It is not read aloud letter by letter.** The animated text is
 * `aria-hidden`, and a visually hidden sibling carries the full first phrase
 * as static text. A screen reader gets one clean sentence; without this it
 * would hear "a", "a w", "a we" … as the node mutates.
 *
 * **It stops entirely under `prefers-reduced-motion`.** Not slower — stopped,
 * showing the first phrase. The preference exists partly for vestibular
 * disorders and partly for people who cannot read moving text, and a faster
 * flicker serves neither.
 *
 * The caret is a real element rather than a CSS `::after` so it can sit
 * beside the gold gradient's clipping context without inheriting it.
 */

import * as React from 'react'

const TYPE_MS = 70
const DELETE_MS = 35
const HOLD_MS = 1800
const PAUSE_MS = 300

export interface TypedPhraseProps {
  /** Cycled in order, forever. The first is what static renders show. */
  readonly phrases: readonly string[]
  readonly className?: string
}

export function TypedPhrase({ phrases, className }: TypedPhraseProps) {
  const first = phrases[0] ?? ''
  // The server render and the reduced-motion case produce identical markup:
  // the whole first phrase, no caret. Hydration therefore never flashes.
  const [typed, setTyped] = React.useState(first)
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    if (phrases.length < 2) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    setIsAnimating(true)

    let index = 0
    let length = first.length
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const phrase = phrases[index] ?? ''

      if (!deleting && length === phrase.length) {
        deleting = true
        timer = setTimeout(tick, HOLD_MS)
        return
      }

      if (deleting && length === 0) {
        deleting = false
        index = (index + 1) % phrases.length
        timer = setTimeout(tick, PAUSE_MS)
        return
      }

      length += deleting ? -1 : 1
      setTyped(phrase.slice(0, length))
      timer = setTimeout(tick, deleting ? DELETE_MS : TYPE_MS)
    }

    timer = setTimeout(tick, HOLD_MS)
    return () => clearTimeout(timer)
  }, [phrases, first])

  return (
    <>
      {/* The sentence as assistive technology should receive it: once, whole,
          and not re-announced on every keystroke. */}
      <span className="sr-only">{first}</span>
      <span aria-hidden="true" className={className}>
        {typed}
        {isAnimating ? (
          <span className="animate-caret ml-1 inline-block w-1 self-stretch bg-gold">
            {/* A zero-width space gives the caret the line's height without
                adding a character anyone can select or copy. */}
            &#8203;
          </span>
        ) : null}
      </span>
    </>
  )
}

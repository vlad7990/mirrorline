'use client'

/**
 * The studio co-pilot, mounted once by the studio layout (18 §2.4).
 *
 * It owns four things and delegates the rest: the shortcut, whether the panel
 * is open, the transcript, and **what approving a proposal actually does**.
 *
 * ## ⌘K from anywhere in /app/*
 *
 * Which is why this is in the layout rather than on a screen. The listener is
 * on `document` because the shortcut has to work with focus anywhere — in the
 * sidebar, in a form field, on nothing at all. It is `metaKey || ctrlKey` so
 * the same key opens it on Windows, and `preventDefault` runs only on the
 * branch that handles it, so ⌘K keeps its browser meaning everywhere else.
 *
 * ## The transcript dies with the tab
 *
 * 18 §3.3's rule is written for the website and applies here for the same
 * reason: questions about an account are not less personal than questions
 * about a price list. React state and nothing else.
 *
 * An answer in flight is not cancelled when the panel closes — somebody who
 * asks, closes and reopens should find the answer waiting. The only abort is
 * on unmount.
 *
 * ## Approve performs the calendar's move, and nothing else performs anything
 *
 * §2.3: the co-pilot proposes and the person disposes. `move-post` carries a
 * structured payload and `useScheduleMoves` is the same reschedule the drag
 * uses. The other two kinds have no screen to perform them, and approving one
 * **says so** rather than reporting a success — a confirmation for a thing
 * that did not happen is the one failure a proposal card must not have.
 */

import * as React from 'react'

import { StudioCopilotPanel } from '@/components/studio/copilot/studio-copilot-panel'
import type { CopilotMode } from '@/lib/copilot/canned'
import { STUDIO_COPILOT_COPY } from '@/lib/copilot/studio-copilot-copy'
import { readCopilotMode, streamCopilotAnswer } from '@/lib/copilot/stream'
import {
  type Exchange,
  applyEvent,
  decideProposal,
  failExchange,
  startExchange,
} from '@/lib/copilot/transcript'
import { type MiloState, miloStateFor } from '@/lib/mascot/milo'
import { useIsWide } from '@/lib/motion/use-is-wide'
import { useScheduleMoves } from '@/lib/studio/schedule-moves-context'

export function StudioCopilot() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [exchanges, setExchanges] = React.useState<readonly Exchange[]>([])
  const [mode, setMode] = React.useState<CopilotMode | null>(null)
  const [isAsking, setIsAsking] = React.useState(false)
  const [miloState, setMiloState] = React.useState<MiloState>('idle')
  /** What each decided proposal came to, keyed `${exchangeId}:${index}`. */
  const [outcomes, setOutcomes] = React.useState<Readonly<Record<string, string>>>({})

  const panelId = `${React.useId()}-studio-copilot`
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)
  const askedCountRef = React.useRef(0)

  const isWide = useIsWide()
  const { movePost } = useScheduleMoves()

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  /**
   * ⌘K toggles it; Escape is the panel's own business.
   *
   * Bound to `document` rather than to a container because §2.4 says "from
   * anywhere in /app/*" and a container only covers what is inside it.
   */
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'k' && event.key !== 'K') return
      if (!event.metaKey && !event.ctrlKey) return

      event.preventDefault()
      setIsOpen((wasOpen) => !wasOpen)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  /** The mode comes from the server or not at all (§4). Asked on first open. */
  React.useEffect(() => {
    if (!isOpen || mode !== null) return undefined

    let isCurrent = true
    void readCopilotMode().then((next) => {
      if (isCurrent && isMountedRef.current) setMode(next)
    })

    return () => {
      isCurrent = false
    }
  }, [isOpen, mode])

  const update = React.useCallback((id: string, change: (exchange: Exchange) => Exchange) => {
    if (!isMountedRef.current) return
    setExchanges((current) =>
      current.map((exchange) => (exchange.id === id ? change(exchange) : exchange)),
    )
  }, [])

  const ask = React.useCallback(
    async (question: string) => {
      if (isAsking) return

      askedCountRef.current += 1
      const id = `studio-exchange-${askedCountRef.current}`

      setExchanges((current) => [...current, startExchange(id, question)])
      setIsAsking(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        for await (const event of streamCopilotAnswer({
          surface: 'studio',
          question,
          copy: STUDIO_COPILOT_COPY,
          signal: controller.signal,
        })) {
          update(id, (exchange) => applyEvent(exchange, event))

          const next = miloStateFor(event)
          if (next && isMountedRef.current) setMiloState(next)
        }

        // A stream that ends without a `done` or an `error` line is a
        // connection that died quietly. `failExchange` ignores one that
        // already finished, which is the ordinary case.
        update(id, (exchange) =>
          failExchange(exchange, {
            kind: 'failed',
            message: STUDIO_COPILOT_COPY.transportFailure,
          }),
        )
      } finally {
        if (isMountedRef.current) setIsAsking(false)
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [isAsking, update],
  )

  /**
   * Approve or Dismiss, and the one place a proposal can become an action.
   *
   * The order matters. `decideProposal` is asked **first**, and it returns the
   * same exchange when there is nothing to decide — an index that does not
   * exist, or a proposal already decided. Only a changed exchange gets as far
   * as `movePost`. That is how "nothing ran until Approve" survives a
   * double-click: the second press finds the decision already made and never
   * reaches the move.
   */
  const decide = React.useCallback(
    (exchangeId: string, index: number, decision: 'approved' | 'dismissed') => {
      const exchange = exchanges.find((candidate) => candidate.id === exchangeId)
      if (!exchange) return

      const next = decideProposal(exchange, index, decision)
      if (next === exchange) return

      const proposal = exchange.proposals[index]?.proposal

      let outcome: string = STUDIO_COPILOT_COPY.dismissed
      if (decision === 'approved') {
        if (proposal?.kind === 'move-post' && proposal.move) {
          const { postId, ...move } = proposal.move
          movePost(postId, move)
          outcome = STUDIO_COPILOT_COPY.approvedMove
        } else {
          // `swap-format` and `pause-account` have no screen that performs
          // them. Saying so is the honest answer; a confirmation here would
          // be the panel claiming to have done something it cannot.
          outcome = STUDIO_COPILOT_COPY.approvedNotBuilt
        }
      }

      setOutcomes((current) => ({ ...current, [`${exchangeId}:${index}`]: outcome }))
      setExchanges((current) =>
        current.map((candidate) => (candidate.id === exchangeId ? next : candidate)),
      )
    },
    [exchanges, movePost],
  )

  /**
   * Closing returns focus to the trigger, one render later.
   *
   * C2's lesson, applying here for a different reason: the trigger is hidden
   * while the panel is open, and `focus()` on a hidden element does nothing
   * and reports nothing. So the intent is recorded and an effect acts on it
   * once the trigger is back in the layout.
   */
  const restoreFocusRef = React.useRef(false)

  React.useEffect(() => {
    if (isOpen || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    triggerRef.current?.focus()
  }, [isOpen])

  const close = React.useCallback(() => {
    restoreFocusRef.current = true
    setIsOpen(false)
  }, [])

  /**
   * Tell the layout to make room, so the aside is beside the content.
   *
   * §2.4 asks for "an inline aside from `xl` up", and a `fixed` panel is an
   * overlay rather than an aside however it is styled — on `/app/calendar` it
   * covered the post panel it was supposed to sit alongside. The content has
   * to move.
   *
   * An attribute on `<html>` rather than a prop, because `StudioLayout` is a
   * server component and cannot hold this state. CSS in `globals.css` reads
   * it and pads `<main>` from `xl` up only, so the narrow shape — which is a
   * modal and *should* cover the page — is untouched.
   */
  React.useEffect(() => {
    const root = document.documentElement
    if (isOpen) root.dataset.copilotOpen = 'true'
    else delete root.dataset.copilotOpen

    return () => {
      delete root.dataset.copilotOpen
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={STUDIO_COPILOT_COPY.launcherAria}
        className={[
          'fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full print:hidden',
          'border border-gold-500/60 bg-ink-900/95 px-4 py-2.5 text-label text-on-ink-900',
          'shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)] backdrop-blur hover:border-gold-500',
          'sm:bottom-7 sm:right-7',
          isOpen ? 'hidden' : '',
        ].join(' ')}
      >
        {STUDIO_COPILOT_COPY.launcherLabel}
        {/* The shortcut is on the trigger's face so it is discoverable. A
            shortcut nobody is told about is a shortcut nobody uses. */}
        <kbd
          aria-hidden="true"
          className="rounded border border-ink-line px-1.5 py-0.5 text-[0.65rem] text-on-ink-muted"
        >
          {STUDIO_COPILOT_COPY.shortcutHint}
        </kbd>
      </button>

      {isOpen ? (
        <StudioCopilotPanel
          id={panelId}
          exchanges={exchanges}
          mode={mode}
          isAsking={isAsking}
          miloState={miloState}
          isWide={isWide}
          outcomes={outcomes}
          onAsk={(question) => void ask(question)}
          onDecide={decide}
          onClose={close}
        />
      ) : null}
    </>
  )
}

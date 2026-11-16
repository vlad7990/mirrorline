'use client'

/**
 * The website co-pilot, mounted once per public page.
 *
 * It owns three things and delegates everything else: when Milo waves, whether
 * the panel is open, and the transcript.
 *
 * ## There is no consent gate any more, and that is a reversal
 *
 * 18 §3.3 said the launcher was "not shown until the cookie banner is
 * dismissed", on the reasoning that a second floating thing over a consent
 * prompt is a dark pattern. **D74 overrides it**: a dark pattern is something
 * that pushes a decision, and Milo asks for nothing, sets nothing and reads
 * nothing about the visitor. What the old rule actually produced was an
 * assistant missing from the first screen of every first visit — the one
 * screen where somebody is still deciding whether to ask anybody anything.
 *
 * So he renders on the server, is in the first paint, and the banner's answer
 * changes only *where* he sits: `--cookie-banner-height` lifts him above it
 * while it is up. That layering is in `globals.css`, deliberately, because the
 * two are now on screen together.
 *
 * ## The transcript dies with the tab
 *
 * §3.3 again: "No personal data stored. Questions are not logged with
 * identifiers; the transcript lives in the tab and dies with it." So it is
 * React state and nothing else — no `localStorage`, no `sessionStorage`, no
 * cookie, nothing in a URL. Closing the panel keeps it, because closing a
 * panel is not leaving; reloading loses it, because that is the promise.
 *
 * An answer in flight is **not** cancelled when the panel closes. Somebody
 * who asks a question, closes the panel and opens it again a moment later
 * should find the answer waiting. The only abort is on unmount, where there
 * is nothing left to render it into.
 */

import { usePathname } from 'next/navigation'
import * as React from 'react'

import { CopilotLauncher } from '@/components/marketing/copilot/copilot-launcher'
import { CopilotPanel } from '@/components/marketing/copilot/copilot-panel'
import type { CopilotMode } from '@/lib/copilot/canned'
import { SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'
import { readCopilotMode, streamCopilotAnswer } from '@/lib/copilot/stream'
import { type Exchange, applyEvent, failExchange, startExchange } from '@/lib/copilot/transcript'
import {
  GREETING_DELAY_MS,
  GREETING_VISIBLE_MS,
  GREETING_WAVE_MS,
  markGreeted,
  shouldGreet,
} from '@/lib/mascot/greeting'
import { type MiloState, miloStateFor } from '@/lib/mascot/milo'

export function SiteCopilot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [exchanges, setExchanges] = React.useState<readonly Exchange[]>([])
  const [mode, setMode] = React.useState<CopilotMode | null>(null)
  const [isAsking, setIsAsking] = React.useState(false)
  const [miloState, setMiloState] = React.useState<MiloState>('idle')
  const [isGreeting, setIsGreeting] = React.useState(false)

  const panelId = `${React.useId()}-copilot`
  const launcherRef = React.useRef<HTMLButtonElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)
  const askedCountRef = React.useRef(0)
  /**
   * What the greeting timer reads to find out whether the panel is open.
   *
   * A timer that fires three seconds after the page loaded cannot see state
   * any other way, and this is the one piece of state it must respect: the
   * bubble must never land on an open conversation.
   */
  const isOpenRef = React.useRef(false)

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  /**
   * The mode comes from the server or not at all (§4).
   *
   * Asked once, on first open rather than on mount: every public page would
   * otherwise make a request for a panel most visitors never open.
   */
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

  /**
   * The hello: three seconds in, six seconds long, once a visit.
   *
   * Three timers rather than one, because the three things end at different
   * moments and each has its own reason. The wave stops at 900ms — a mascot
   * still waving when the bubble closes reads as a loop. The bubble stays the
   * full six seconds, which is the time to notice it, read eight words and
   * decide to ignore them.
   *
   * **The session is marked when the bubble appears, not when it is
   * scheduled.** A visitor who navigates at second two should still be
   * greeted on the page they land on, rather than having spent their one
   * greeting on a page that never showed it.
   *
   * `shouldGreet` is also what keeps him quiet on `/legal/*` — see the rules
   * in `lib/mascot/greeting.ts`. The launcher stays there either way.
   */
  React.useEffect(() => {
    const storage = typeof window === 'undefined' ? null : window.sessionStorage
    if (!shouldGreet(storage, pathname)) return undefined

    const timers: number[] = []

    timers.push(
      window.setTimeout(() => {
        if (!isMountedRef.current) return

        // **Not over an open panel.** The bubble is anchored to the dock, the
        // dock sits above the panel, and three seconds is exactly long enough
        // for somebody to have opened the chat first — which put a greeting
        // on top of the conversation it was inviting, swallowing clicks on
        // the Ask button underneath. Somebody reading the panel has already
        // done what the greeting asks, so the session is marked and the wave
        // is spent.
        markGreeted(storage)
        if (isOpenRef.current) return

        setIsGreeting(true)
        setMiloState('greeting')

        timers.push(
          window.setTimeout(() => {
            if (isMountedRef.current) setMiloState('idle')
          }, GREETING_WAVE_MS),
        )

        timers.push(
          window.setTimeout(() => {
            if (isMountedRef.current) setIsGreeting(false)
          }, GREETING_VISIBLE_MS),
        )
      }, GREETING_DELAY_MS),
    )

    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [pathname])

  /**
   * Opening the panel takes the bubble with it.
   *
   * Somebody who clicks Milo has done the thing the greeting was asking for,
   * and leaving it hanging beside an open chat is the assistant repeating
   * itself.
   */
  React.useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) setIsGreeting(false)
  }, [isOpen])

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
      const id = `exchange-${askedCountRef.current}`

      setExchanges((current) => [...current, startExchange(id, question)])
      setIsAsking(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        for await (const event of streamCopilotAnswer({
          surface: 'site',
          question,
          // The reader says nothing in its own voice: the words for a failed
          // request come from here, which is what lets the studio pass its
          // own without the two surfaces sharing prose.
          copy: SITE_COPILOT_COPY,
          signal: controller.signal,
        })) {
          update(id, (exchange) => applyEvent(exchange, event))

          // Milo reads the same events the transcript does, rather than
          // running a machine of his own. `null` means this event says
          // nothing about what he is doing — a citation arriving mid-answer
          // must not drop him out of `answering`.
          const next = miloStateFor(event)
          if (next && isMountedRef.current) setMiloState(next)
        }

        // A stream that ends without a `done` or an `error` line is a
        // connection that died quietly. Left alone the exchange would spin
        // for ever, so it is closed here as the failure it is. `failExchange`
        // ignores one that already finished, which is the ordinary case.
        update(id, (exchange) =>
          failExchange(exchange, {
            kind: 'failed',
            message: SITE_COPILOT_COPY.transportFailure,
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
   * Closing returns focus to the launcher, one render later.
   *
   * Not in the click handler: the launcher is `hidden` while the panel is
   * open, and `focus()` on a `display: none` element does nothing at all and
   * reports nothing either. So the intent is recorded and the effect below
   * acts on it once the launcher is back in the layout. Without this,
   * pressing Escape drops focus onto `<body>` and a keyboard user starts
   * again from the top of the page.
   */
  const restoreFocusRef = React.useRef(false)

  React.useEffect(() => {
    if (isOpen || !restoreFocusRef.current) return
    restoreFocusRef.current = false
    launcherRef.current?.focus()
  }, [isOpen])

  const close = React.useCallback(() => {
    restoreFocusRef.current = true
    setIsOpen(false)
  }, [])

  // No early return: the launcher is part of every page's first paint, on the
  // server, before any effect has run and whatever the cookie banner is doing
  // (D74). There is no state in which Milo is absent.
  return (
    <>
      <CopilotLauncher
        ref={launcherRef}
        isOpen={isOpen}
        panelId={panelId}
        miloState={miloState}
        isGreeting={isGreeting}
        onDismissGreeting={() => setIsGreeting(false)}
        onOpen={() => setIsOpen(true)}
      />
      {isOpen ? (
        <CopilotPanel
          id={panelId}
          exchanges={exchanges}
          mode={mode}
          isAsking={isAsking}
          miloState={miloState}
          onAsk={(question) => void ask(question)}
          onClose={close}
        />
      ) : null}
    </>
  )
}

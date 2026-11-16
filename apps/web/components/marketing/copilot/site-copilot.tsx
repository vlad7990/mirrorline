'use client'

/**
 * The website co-pilot, mounted once per public page.
 *
 * It owns three things and delegates everything else: whether the launcher is
 * allowed to exist, whether the panel is open, and the transcript.
 *
 * ## The consent gate
 *
 * 18 §3.3: the launcher is "not shown until the cookie banner is dismissed",
 * because a second floating thing over a consent prompt is a dark pattern.
 * `useCookieConsent()` is the same state the banner itself renders from, so
 * the two cannot drift apart — one of them is visible at a time because they
 * read one answer, not because two effects happen to agree.
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

import * as React from 'react'

import { CopilotLauncher } from '@/components/marketing/copilot/copilot-launcher'
import { CopilotPanel } from '@/components/marketing/copilot/copilot-panel'
import { useCookieConsent } from '@/lib/consent/cookie-consent-context'
import type { CopilotMode } from '@/lib/copilot/canned'
import { SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'
import { readCopilotMode, streamCopilotAnswer } from '@/lib/copilot/stream'
import { type Exchange, applyEvent, failExchange, startExchange } from '@/lib/copilot/transcript'
import { type MiloState, miloStateFor } from '@/lib/mascot/milo'

/**
 * Has Milo already waved in this tab?
 *
 * Module scope rather than state, because "once per session" has to survive
 * the component unmounting — this is mounted per page by the marketing
 * layout, so a visitor walking from `/pricing` to `/product` would otherwise
 * be waved at on every page. Module scope dies with the tab, which is exactly
 * the lifetime §3.3 gives the transcript: nothing is stored, and a reload is
 * a new session.
 */
let hasGreetedThisSession = false

/** How long the wave lasts before Milo settles. Matches the CSS keyframe. */
const GREETING_MS = 900

export function SiteCopilot() {
  const { isResolved, hasChosen } = useCookieConsent()
  const [isOpen, setIsOpen] = React.useState(false)
  const [exchanges, setExchanges] = React.useState<readonly Exchange[]>([])
  const [mode, setMode] = React.useState<CopilotMode | null>(null)
  const [isAsking, setIsAsking] = React.useState(false)
  const [miloState, setMiloState] = React.useState<MiloState>('idle')

  const panelId = `${React.useId()}-copilot`
  const launcherRef = React.useRef<HTMLButtonElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)
  const askedCountRef = React.useRef(0)

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
   * The wave, once, when the launcher first appears.
   *
   * Gated on `hasChosen` rather than on mount: until the cookie banner is
   * answered there is no launcher (§3.3), so greeting then would spend the
   * one wave on a button nobody can see. The timer settles Milo back to
   * `idle` so the resting float takes over — and it is cleared on unmount,
   * because a navigation mid-wave would otherwise set state on a gone
   * component.
   */
  React.useEffect(() => {
    if (!isResolved || !hasChosen || hasGreetedThisSession) return undefined

    hasGreetedThisSession = true
    setMiloState('greeting')

    const settle = window.setTimeout(() => {
      if (isMountedRef.current) setMiloState('idle')
    }, GREETING_MS)

    return () => window.clearTimeout(settle)
  }, [isResolved, hasChosen])

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

  // Nothing at all until the banner has been answered — and nothing during
  // the first render either, while the stored choice is still unread.
  if (!isResolved || !hasChosen) return null

  return (
    <>
      <CopilotLauncher
        ref={launcherRef}
        isOpen={isOpen}
        panelId={panelId}
        miloState={miloState}
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

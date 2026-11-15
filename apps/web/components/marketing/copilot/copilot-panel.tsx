'use client'

/**
 * The panel: what was asked, what came back, and where it came from.
 *
 * Presentational. Every rule about what an event means lives in
 * `transcript.ts`, which is a `.ts` module so Vitest can read it — this file
 * renders `Exchange` objects and holds nothing but the text in the input.
 *
 * ## Three things it is deliberate about
 *
 * **A refusal is rendered as an answer.** 18 §3.1 and §3.2: "I don't know,
 * here is a person" is a success state, and the four refusals are the
 * product. So a refusal gets the ordinary answer treatment plus its handoff
 * link, and nothing here is red. Only `status: 'failed'` — the request not
 * getting through — looks like a problem, because only that is one.
 *
 * **It is a non-modal dialog.** `aria-modal="false"`, no focus trap: the page
 * behind it stays readable and usable, which is the same call the cookie
 * banner makes. A visitor halfway down the pricing page asked a question
 * about the pricing page; trapping them away from it would be worse than
 * useless. Escape closes, and focus goes back to the launcher.
 *
 * **Under reduced motion the answer appears rather than types.** §2.4 asks
 * for exactly that, and the stream is a render decision rather than a CSS
 * one, so it is made here: the deltas are held back and the finished text is
 * shown in one go. The panel's own entrance is CSS, inside a `no-preference`
 * block in `globals.css`, like every other movement on this site.
 */

import { Button, cn } from '@mirrorline/ui'
import Link from 'next/link'
import * as React from 'react'

import { CloseIcon } from '@/components/icons'
import type { CopilotMode } from '@/lib/copilot/canned'
import { AI_TAG, SITE_COPILOT_COPY } from '@/lib/copilot/site-copilot-copy'
import type { Exchange } from '@/lib/copilot/transcript'
import { useReducedMotion } from '@/lib/motion/use-reduced-motion'

export interface CopilotPanelProps {
  readonly id: string
  readonly exchanges: readonly Exchange[]
  /** From `/api/copilot/status`. Null means we could not find out. */
  readonly mode: CopilotMode | null
  readonly isAsking: boolean
  readonly onAsk: (question: string) => void
  readonly onClose: () => void
}

const CHIP_CLASS =
  'inline-flex items-center rounded-full border border-ink-line px-3 py-1 text-meta text-on-ink-muted transition-colors hover:border-gold-500 hover:text-on-ink-900'

function Citations({ citations }: { citations: Exchange['citations'] }) {
  if (citations.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
        {SITE_COPILOT_COPY.citationsLabel}
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {citations.map((citation) => (
          <li key={`${citation.href}-${citation.label}`}>
            {/* A citation is a place you can go and check. §2.2 rules out the
                footnote version of this by name. */}
            <Link href={citation.href} className={CHIP_CLASS}>
              {citation.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ExchangeView({ exchange, isReduced }: { exchange: Exchange; isReduced: boolean }) {
  const isStreaming = exchange.status === 'streaming'
  // Under reduced motion nothing is shown until it is finished, so the
  // sentence never assembles itself in front of someone who asked it not to.
  const visibleText = isStreaming && isReduced ? '' : exchange.text
  const hasText = visibleText.length > 0

  return (
    <li className="flex flex-col gap-3 border-t border-ink-line pt-4 first:border-t-0 first:pt-0">
      <p className="m-0 text-meta text-on-ink-muted">
        <span className="font-semibold text-on-ink-900">{SITE_COPILOT_COPY.youSaid}: </span>
        {exchange.question}
      </p>

      {exchange.status === 'failed' ? (
        <div className="flex flex-col items-start gap-2">
          <p className="m-0 text-body text-on-ink-900">
            {exchange.error?.message ?? SITE_COPILOT_COPY.transportFailure}
          </p>
          {/* A dead end is not an answer, so even a failure offers the person. */}
          <Link href={SITE_COPILOT_COPY.failureHandoff.href} className={CHIP_CLASS}>
            {SITE_COPILOT_COPY.failureHandoff.label}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {hasText ? (
            // Hidden from assistive technology while it grows: a live region
            // over a stream reads the same sentence again on every chunk. The
            // status line below is what gets announced.
            <p
              aria-hidden={isStreaming ? 'true' : undefined}
              className="m-0 whitespace-pre-wrap text-body text-on-ink-900"
            >
              {visibleText}
            </p>
          ) : null}

          {isStreaming ? (
            <p className="m-0 text-meta text-on-ink-muted">{SITE_COPILOT_COPY.thinking}</p>
          ) : null}

          <Citations citations={exchange.citations} />

          {exchange.handoff ? (
            <p className="m-0 text-meta text-on-ink-muted">
              {SITE_COPILOT_COPY.handoffLead}{' '}
              <Link
                href={exchange.handoff.href}
                className="underline underline-offset-4 hover:text-on-ink-900"
              >
                {exchange.handoff.label}
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {/* One polite announcement per exchange, carrying the finished answer
          rather than every chunk of it. */}
      <p className="sr-only" role="status">
        {isStreaming ? SITE_COPILOT_COPY.thinking : exchange.text}
      </p>
    </li>
  )
}

export function CopilotPanel({ id, exchanges, mode, isAsking, onAsk, onClose }: CopilotPanelProps) {
  const [question, setQuestion] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const isReduced = useReducedMotion()
  const titleId = `${id}-title`

  // The panel is mounted only while it is open, so mounting is opening.
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [exchanges])

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const asked = question.trim()
    if (asked.length === 0 || isAsking) return
    setQuestion('')
    onAsk(asked)
  }

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      className={cn(
        'copilot-panel fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] flex-col',
        'max-h-[min(34rem,calc(100dvh-7rem))] sm:bottom-7 sm:right-7 sm:w-[25rem]',
        'overflow-hidden rounded-2xl border border-ink-line bg-ink-900/97 backdrop-blur-xl',
        'shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] print:hidden',
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-ink-line px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="m-0 flex items-center gap-2 text-label text-on-ink-900">
            {/* §3.3: labelled AI in the panel header, in words, on screen. */}
            <span className="rounded-full border border-gold-500/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold-500">
              {AI_TAG}
            </span>
            {SITE_COPILOT_COPY.panelTitle}
          </h2>
          <p className="m-0 text-meta text-on-ink-muted">{SITE_COPILOT_COPY.grounding}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={SITE_COPILOT_COPY.closeLabel}
          className="shrink-0 text-on-ink-muted hover:bg-ink-800 hover:text-on-ink-900"
        >
          <CloseIcon />
        </Button>
      </header>

      {mode === 'sample' ? (
        // Read from the server, never inferred: the key the mode depends on
        // never reaches this bundle. Non-negotiable 7 puts the label in the
        // open rather than behind a hover.
        <div className="border-b border-ink-line bg-ink-800/60 px-5 py-3">
          <p className="m-0 text-meta text-on-ink-muted">
            <span className="font-semibold text-on-ink-900">
              {SITE_COPILOT_COPY.sampleBadge}.{' '}
            </span>
            {SITE_COPILOT_COPY.sampleExplainer}
          </p>
        </div>
      ) : null}

      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-4">
        {exchanges.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-body text-on-ink-900">{SITE_COPILOT_COPY.emptyState}</p>
            <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
              {SITE_COPILOT_COPY.suggestionsLabel}
            </p>
            <ul className="m-0 flex list-none flex-col items-start gap-2 p-0">
              {SITE_COPILOT_COPY.suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" onClick={() => onAsk(suggestion)} className={CHIP_CLASS}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {exchanges.map((exchange) => (
              <ExchangeView key={exchange.id} exchange={exchange} isReduced={isReduced} />
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-ink-line px-5 py-4">
        <label htmlFor={`${id}-question`} className="sr-only">
          {SITE_COPILOT_COPY.questionLabel}
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id={`${id}-question`}
            name="question"
            type="text"
            autoComplete="off"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={SITE_COPILOT_COPY.questionPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-xl border border-ink-line bg-ink-800/70 px-3 text-body text-on-ink-900 placeholder:text-on-ink-muted focus-visible:border-gold-500 focus-visible:outline-none"
          />
          <Button
            type="submit"
            variant="gold"
            disabled={isAsking || question.trim().length === 0}
            loading={isAsking}
            loadingLabel={SITE_COPILOT_COPY.sendingLabel}
          >
            {SITE_COPILOT_COPY.submitLabel}
          </Button>
        </div>
        {/* §3.3: no personal data stored, and the transcript dies with the tab. */}
        <p className="m-0 text-[0.7rem] text-on-ink-muted">{SITE_COPILOT_COPY.privacy}</p>
      </form>
    </div>
  )
}

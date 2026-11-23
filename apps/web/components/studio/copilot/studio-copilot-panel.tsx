'use client'

/**
 * The studio co-pilot's panel (18 §2.4).
 *
 * ## Two shapes, one component
 *
 * §2.4: "a focus-trapped dialog on narrow screens and an inline aside from
 * `xl` up — the split the calendar's post panel already uses, so the studio
 * has one answer to 'where does the detail go'." Both shapes render the same
 * body; only the frame around it changes, because two bodies would be two
 * places to fix the next thing.
 *
 * **The trap is only on the narrow shape, and that is the point.** A dialog
 * covering the screen must not let Tab wander behind it. An aside sitting
 * beside the content must not trap anything — it is part of the page, and a
 * trap there would make the rest of the studio unreachable by keyboard while
 * the panel happened to be open.
 *
 * ## Why the trap is written here rather than taken from a library
 *
 * `Dialog` exists in `@mirrorline/ui` and the calendar uses it. It is not
 * right for this one: the panel has to be *either* modal or inline depending
 * on the viewport, and switching a component's modality across a breakpoint
 * means mounting and unmounting it on resize — which loses the transcript, the
 * input's contents and the focus position. So the frame is conditional and the
 * body is not, and the twenty lines of trap are cheaper than that bug.
 *
 * ## Proposals
 *
 * §2.3: the co-pilot proposes and the person disposes. Approve runs the
 * calendar's own reschedule through `useScheduleMoves`, and **nothing else on
 * this screen can perform anything** — the other two kinds say so plainly
 * rather than reporting a success that did not happen.
 */

import { Button, cn } from '@mirrorline/ui'
import * as React from 'react'

import { CloseIcon } from '@/components/icons'
import { MiloAvatar } from '@/components/mascot/milo-avatar'
import type { CopilotMode } from '@/lib/copilot/canned'
import { AI_TAG, STUDIO_COPILOT_COPY } from '@/lib/copilot/studio-copilot-copy'
import type { Exchange, TrackedProposal } from '@/lib/copilot/transcript'
import type { MiloState } from '@/lib/mascot/milo'
import { useReducedMotion } from '@/lib/motion/use-reduced-motion'

/** The header's Milo. 32px, head and shoulders. */
const MILO_HEADER_SIZE = 32

/** The empty state's Milo, full length. */
const MILO_WELCOME_SIZE = 120

/** Everything that can hold focus inside the panel, for the trap. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

const CHIP_CLASS =
  'inline-flex items-center rounded-full border border-ink-line px-3 py-1 text-meta text-on-ink-muted'

export interface StudioCopilotPanelProps {
  readonly id: string
  readonly exchanges: readonly Exchange[]
  readonly mode: CopilotMode | null
  readonly isAsking: boolean
  readonly miloState: MiloState
  /** True from `xl` up: an aside beside the content rather than a dialog. */
  readonly isWide: boolean
  readonly onAsk: (question: string) => void
  /** `(exchangeId, index, decision)` — the transcript owns the record. */
  readonly onDecide: (exchangeId: string, index: number, decision: 'approved' | 'dismissed') => void
  /** What each decided proposal came to, keyed `${exchangeId}:${index}`. */
  readonly outcomes: Readonly<Record<string, string>>
  readonly onClose: () => void
}

function Citations({ citations }: { citations: Exchange['citations'] }) {
  if (citations.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
        {STUDIO_COPILOT_COPY.citationsLabel}
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {citations.map((citation) => (
          <li key={`${citation.label}-${citation.href}`}>
            {/* A plain anchor, not next/link: the panel can be open anywhere
                in the studio and these go to a different screen, so a full
                navigation is the honest behaviour rather than a soft one that
                leaves the panel floating over an unrelated page. */}
            <a href={citation.href} className={cn(CHIP_CLASS, 'hover:text-on-ink-900')}>
              {citation.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProposalCard({
  tracked,
  outcome,
  onApprove,
  onDismiss,
}: {
  tracked: TrackedProposal
  outcome: string | undefined
  onApprove: () => void
  onDismiss: () => void
}) {
  const { proposal, decision } = tracked

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gold-500/40 bg-ink-800/60 p-3">
      <p className="m-0 text-label text-on-ink-900">{proposal.summary}</p>
      <p className="m-0 text-meta text-on-ink-muted">{proposal.detail}</p>

      {decision === null ? (
        <>
          {/* Said before the press, not only after it. §2.3: "Nothing happens
              until Approve is pressed." */}
          <p className="m-0 text-meta text-on-ink-muted">{STUDIO_COPILOT_COPY.proposalNote}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="gold" onClick={onApprove}>
              {STUDIO_COPILOT_COPY.approveLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={onDismiss}>
              {STUDIO_COPILOT_COPY.dismissLabel}
            </Button>
          </div>
        </>
      ) : (
        // Once decided the buttons go, so there is nothing left to press
        // twice. The sentence that replaces them says what actually happened
        // — including, for the two unwired kinds, that nothing did.
        <p className="m-0 text-meta text-on-ink-900" role="status">
          {outcome ?? STUDIO_COPILOT_COPY.dismissed}
        </p>
      )}
    </li>
  )
}

function ExchangeItem({
  exchange,
  isReduced,
  outcomes,
  onDecide,
}: {
  exchange: Exchange
  isReduced: boolean
  outcomes: StudioCopilotPanelProps['outcomes']
  onDecide: StudioCopilotPanelProps['onDecide']
}) {
  const isStreaming = exchange.status === 'streaming'
  // Under reduced motion the answer appears whole rather than typing itself
  // (§2.4). CSS cannot express that, which is why the hook exists.
  const visibleText = isStreaming && isReduced ? '' : exchange.text
  const hasText = visibleText.length > 0

  return (
    <li className="flex flex-col gap-3 border-b border-ink-line pb-5 last:border-b-0">
      <p className="m-0 text-meta text-on-ink-muted">
        <span className="font-semibold">{STUDIO_COPILOT_COPY.youSaid}:</span> {exchange.question}
      </p>

      {exchange.status === 'failed' ? (
        // No link to a call here, unlike the website: the person reading this
        // is already a client (§7).
        <p className="m-0 text-body text-on-ink-900">
          {exchange.error?.message ?? STUDIO_COPILOT_COPY.transportFailure}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {hasText ? (
            // Hidden from assistive technology while it grows: a live region
            // over a stream reads the same sentence again on every chunk.
            <p
              aria-hidden={isStreaming ? 'true' : undefined}
              className="m-0 whitespace-pre-wrap text-body text-on-ink-900"
            >
              {visibleText}
            </p>
          ) : null}

          {isStreaming ? (
            <p className="m-0 text-meta text-on-ink-muted">{STUDIO_COPILOT_COPY.thinking}</p>
          ) : null}

          <Citations citations={exchange.citations} />

          {exchange.proposals.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
                {STUDIO_COPILOT_COPY.proposalsLabel}
              </p>
              {/* Named, so it is one list among several in the transcript
                  rather than an anonymous run of items — and so a test can
                  reach the cards without matching on the word "Approve",
                  which the exchange around them also contains. */}
              <ul
                aria-label={STUDIO_COPILOT_COPY.proposalsLabel}
                className="m-0 flex list-none flex-col gap-2 p-0"
              >
                {exchange.proposals.map((tracked, index) => (
                  <ProposalCard
                    key={`${tracked.proposal.kind}-${tracked.proposal.summary}`}
                    tracked={tracked}
                    outcome={outcomes[`${exchange.id}:${index}`]}
                    onApprove={() => onDecide(exchange.id, index, 'approved')}
                    onDismiss={() => onDecide(exchange.id, index, 'dismissed')}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <p className="sr-only" role="status">
        {isStreaming ? STUDIO_COPILOT_COPY.thinking : exchange.text}
      </p>
    </li>
  )
}

export function StudioCopilotPanel({
  id,
  exchanges,
  mode,
  isAsking,
  miloState,
  isWide,
  onAsk,
  onDecide,
  outcomes,
  onClose,
}: StudioCopilotPanelProps) {
  const [question, setQuestion] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const isReduced = useReducedMotion()
  const titleId = `${id}-title`

  // The panel mounts when it opens, so mounting is opening. ⌘K is specified
  // as opening it "focused on the input" (§2.4).
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    const transcript = transcriptRef.current
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  }, [exchanges])

  /**
   * Tab stays inside — on the narrow shape only.
   *
   * Recomputed on each Tab rather than captured once: the panel's focusables
   * change as the transcript grows and as Approve and Dismiss disappear, and
   * a list captured on open would send focus to a button that has gone.
   */
  const trapTab = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isWide || event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [isWide],
  )

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const asked = question.trim()
    if (asked.length === 0 || isAsking) return
    setQuestion('')
    onAsk(asked)
  }

  return (
    <>
      {/* The scrim belongs to the dialog shape alone. An aside beside the
          content must not dim the content it sits beside. */}
      {isWide ? null : (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-sm print:hidden"
        />
      )}

      <div
        ref={panelRef}
        id={id}
        role="dialog"
        // Modal only when it covers the screen. Claiming `aria-modal` on the
        // inline aside would tell a screen reader the rest of the studio is
        // inert while it plainly is not.
        aria-modal={isWide ? undefined : 'true'}
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose()
            return
          }
          trapTab(event)
        }}
        className={cn(
          'copilot-panel z-50 flex flex-col overflow-hidden border border-ink-line',
          'bg-ink-900/97 backdrop-blur-xl print:hidden',
          isWide
            ? // The aside: beside the content, roughly the width the
              // calendar's post panel already uses.
              // `--shadow-panel` / `--shadow-sheet`: the depth is a token now.
              // A colour literal in app code is what D122's gate refuses, and
              // these two were inside arbitrary-value brackets where nobody
              // was looking for colour at all.
              'fixed right-6 top-24 max-h-[calc(100dvh-8rem)] w-[21.25rem] rounded-2xl shadow-panel'
            : // The dialog: a bottom sheet on a phone, which is where a thumb
              // is.
              'fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl shadow-sheet',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink-line px-5 py-4">
          <span aria-hidden="true" className="shrink-0 pt-0.5">
            <MiloAvatar state={miloState} size={MILO_HEADER_SIZE} />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="m-0 flex items-center gap-2 text-label text-on-ink-900">
              {/* §3.3's AI label applies to this surface too. */}
              <span className="rounded-full border border-gold-500/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold-500">
                {AI_TAG}
              </span>
              {STUDIO_COPILOT_COPY.panelTitle}
            </h2>
            <p className="m-0 text-meta text-on-ink-muted">{STUDIO_COPILOT_COPY.grounding}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={STUDIO_COPILOT_COPY.closeLabel}
            className="shrink-0 text-on-ink-muted hover:bg-ink-800 hover:text-on-ink-900"
          >
            <CloseIcon />
          </Button>
        </header>

        {mode === 'sample' ? (
          <div className="border-b border-ink-line bg-ink-800/60 px-5 py-3">
            <p className="m-0 text-meta text-on-ink-muted">
              <span className="font-semibold text-on-ink-900">
                {STUDIO_COPILOT_COPY.sampleBadge}.{' '}
              </span>
              {STUDIO_COPILOT_COPY.sampleExplainer}
            </p>
          </div>
        ) : null}

        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-4">
          {exchanges.length === 0 ? (
            <div className="flex flex-col gap-3">
              <MiloAvatar
                state={miloState}
                shape="full"
                size={MILO_WELCOME_SIZE}
                className="self-center"
              />
              <p className="m-0 text-body text-on-ink-900">{STUDIO_COPILOT_COPY.emptyState}</p>
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-on-ink-muted">
                {STUDIO_COPILOT_COPY.suggestionsLabel}
              </p>
              <ul className="m-0 flex list-none flex-col items-start gap-2 p-0">
                {STUDIO_COPILOT_COPY.suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => onAsk(suggestion)}
                      className={cn(CHIP_CLASS, 'text-left hover:border-gold-500')}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-5 p-0">
              {exchanges.map((exchange) => (
                <ExchangeItem
                  key={exchange.id}
                  exchange={exchange}
                  isReduced={isReduced}
                  outcomes={outcomes}
                  onDecide={onDecide}
                />
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2 border-t border-ink-line px-5 py-4">
          <label htmlFor={`${id}-input`} className="sr-only">
            {STUDIO_COPILOT_COPY.questionLabel}
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id={`${id}-input`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={STUDIO_COPILOT_COPY.questionPlaceholder}
              className="min-w-0 flex-1 rounded-full border border-ink-line bg-ink-800 px-4 py-2 text-body text-on-ink-900 placeholder:text-on-ink-muted focus-visible:border-gold-500"
            />
            <Button type="submit" variant="gold" disabled={isAsking}>
              {isAsking ? STUDIO_COPILOT_COPY.sendingLabel : STUDIO_COPILOT_COPY.submitLabel}
            </Button>
          </div>
          <p className="m-0 text-meta text-on-ink-muted">{STUDIO_COPILOT_COPY.privacy}</p>
        </form>
      </div>
    </>
  )
}

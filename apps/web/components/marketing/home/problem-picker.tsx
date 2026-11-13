'use client'

/**
 * "Sound familiar?" — six complaints in the visitor's own words (16 §3 row 2).
 *
 * 14 §2 asks for a picker that "scrolls to the matching answer and remembers
 * the choice". Our answers are not one-per-section — a single complaint is
 * answered across the gate, the ledger and the billing band — so a scroll
 * target would have to be invented for each, and half of them would land on a
 * section that only half answers the question.
 *
 * So the card **expands in place** with its own answer and stays expanded.
 * The reader gets the answer where they asked the question, and the choice is
 * still remembered for the rest of the visit.
 */

import { Card, cn } from '@mirrorline/ui'
import { Plus } from 'lucide-react'
import * as React from 'react'

import { track } from '@/lib/analytics/events'

import { PROBLEM_CARDS } from './problem-content'

export function ProblemPicker() {
  const [openId, setOpenId] = React.useState<string | null>(null)

  const toggle = (id: string, problem: string) => {
    const isOpening = openId !== id
    setOpenId(isOpening ? id : null)
    // Only the opening counts. A close is the reader tidying up, not a signal
    // about which problem is theirs.
    if (isOpening) track('problem_card_clicked', { problem, card: id })
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
      {PROBLEM_CARDS.map((card, position) => {
        const isOpen = openId === card.id
        const answerId = `${card.id}-answer`

        return (
          <li
            key={card.id}
            className="reveal-item"
            style={{ '--index': position % 3 } as React.CSSProperties}
          >
            <Card className="flex h-full flex-col gap-0 p-0">
              <button
                type="button"
                onClick={() => toggle(card.id, card.problem)}
                aria-expanded={isOpen}
                aria-controls={answerId}
                className="flex min-h-11 w-full flex-1 items-start gap-3 p-5 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="font-heading text-subtitle text-text">{card.title}</span>
                  <span className="text-meta text-text-muted">{card.body}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border-strong text-text-muted',
                    'transition-transform duration-[var(--duration-dropdown)] ease-[var(--ease-out)]',
                    isOpen && 'rotate-45',
                  )}
                >
                  <Plus className="size-4" strokeWidth={2} />
                </span>
              </button>

              {/* Rendered only when open rather than hidden with CSS: a
                  closed card's answer is not content a screen reader should
                  walk past, and `aria-expanded` already says what the button
                  does. */}
              {isOpen ? (
                <div id={answerId} className="border-t border-border px-5 pt-4 pb-5">
                  <p className="m-0 text-meta text-text">
                    {/* Ink band: the bright gold, not the deep one. axe only
                        sees this once a card is open, so it would have shipped
                        green and failed for a reader. */}
                    <span className="machine mr-2 text-mono text-gold-bright">{card.problem}</span>
                    {card.answer}
                  </p>
                </div>
              ) : null}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

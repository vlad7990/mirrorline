'use client'

/**
 * The landing page's six questions.
 *
 * The WAI-ARIA accordion pattern, built in the app: a heading holding a button
 * with aria-expanded and aria-controls, and a region labelled by that button.
 * @mirrorline/ui exports no accordion, and Radix is not a dependency of this
 * app, so this is the local version the brief allows.
 *
 * One panel open at a time, and all of them closed to start, so the page reads
 * as a list of questions rather than a wall of answers.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { IconChevronDown } from './icons'

export interface FaqItem {
  readonly id: string
  readonly question: string
  readonly answer: React.ReactNode
}

export interface FaqProps {
  items: readonly FaqItem[]
}

export function Faq({ items }: FaqProps) {
  const [openId, setOpenId] = React.useState<string | null>(null)

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {items.map((item) => {
        const isOpen = openId === item.id
        const panelId = `faq-panel-${item.id}`
        const buttonId = `faq-button-${item.id}`

        return (
          <div key={item.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
                  'min-h-touch font-heading text-subtitle text-text',
                  'transition-colors hover:bg-surface-subtle',
                )}
              >
                {item.question}
                <IconChevronDown
                  size={20}
                  className={cn(
                    'text-text-muted transition-transform duration-150',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5"
            >
              <div className="flex max-w-[68ch] flex-col gap-3 text-body text-text-muted">
                {item.answer}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

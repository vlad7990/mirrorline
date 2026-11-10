'use client'

/**
 * The landing page's six questions, on a Radix accordion.
 *
 * Radix gives the pattern its keyboard behaviour and the heading/button/region
 * wiring; `type="single" collapsible` means one answer at a time and all of
 * them closed to start, so the page reads as a list of questions rather than a
 * wall of answers.
 *
 * Radix renders the trigger inside an <h3>, which sits correctly under the
 * section's <h2>.
 */

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { cn } from '@mirrorline/ui'
import { ChevronDown } from 'lucide-react'
import type * as React from 'react'

export interface FaqItem {
  readonly id: string
  readonly question: string
  readonly answer: React.ReactNode
}

export interface FaqProps {
  items: readonly FaqItem[]
}

export function Faq({ items }: FaqProps) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface"
    >
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id}>
          <AccordionPrimitive.Header className="m-0">
            <AccordionPrimitive.Trigger
              className={cn(
                'group flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
                'min-h-touch font-heading text-subtitle text-text',
                'transition-colors hover:bg-surface-subtle',
              )}
            >
              {item.question}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
                strokeWidth={1.8}
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="px-5 pb-5">
            <div className="flex max-w-[68ch] flex-col gap-3 text-body text-text-muted">
              {item.answer}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

'use client'

/**
 * S2 · "Needs you" — the decisions waiting on Maya this morning.
 *
 * 03_SCREENS_SPEC "S2 · Home": "'Needs you' panel: 3 cuts awaiting approval,
 * 1 blocked by compliance, with buttons."
 *
 * Approving happens here and now: the row leaves the list and a quiet toast
 * confirms it. There is no backend tonight, so the list is client state, held
 * as an array of approved ids and replaced rather than mutated.
 */

import { Button, Card, StatusChip, Toast } from '@mirrorline/ui'
import Link from 'next/link'
import * as React from 'react'

import { NEEDS_YOU_ITEMS, type NeedsItem } from './home-data'

/** How long the confirmation stays before it gets out of the way. */
const TOAST_MS = 4000

function itemCountLabel(count: number): string {
  return count === 1 ? '1 item' : `${count} items`
}

export function NeedsYouCard() {
  const [approvedIds, setApprovedIds] = React.useState<readonly string[]>([])
  const [toastTitle, setToastTitle] = React.useState<string | null>(null)
  /** Counts approvals rather than holding a boolean, so each one re-fires. */
  const [approvalCount, setApprovalCount] = React.useState(0)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  // SC 2.4.3: approving filters the row out, which unmounts the button that
  // was just pressed and would leave focus on <body>. Send it to the list
  // heading, which is where the remaining items are.
  React.useEffect(() => {
    if (approvalCount === 0) return
    headingRef.current?.focus()
  }, [approvalCount])

  const items = NEEDS_YOU_ITEMS.filter((item) => !approvedIds.includes(item.id))

  function handleApprove(item: NeedsItem): void {
    // A new array, never a push: the previous list stays exactly as it was.
    setApprovedIds((previous) => [...previous, item.id])
    setToastTitle('Approved')
    setApprovalCount((previous) => previous + 1)
  }

  return (
    <Card as="section" aria-labelledby="needs-you-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="needs-you-heading"
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-heading text-title text-text"
        >
          Needs you
        </h2>
        <span className="text-meta text-text-muted">{itemCountLabel(items.length)}</span>
      </div>

      {items.length === 0 ? (
        <p className="m-0 border-t border-border pt-3 text-body text-text-muted">
          Nothing is waiting on you. The agents will add items here as they come up.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 border-t border-border py-3"
            >
              <StatusChip status={item.status} />
              <p className="m-0 min-w-[200px] flex-1 text-body text-text">{item.text}</p>
              {item.kind === 'link' && item.href !== undefined ? (
                <Button asChild variant="secondary" className="shrink-0">
                  <Link href={item.href}>{item.actionLabel}</Link>
                </Button>
              ) : (
                <Button variant="secondary" className="shrink-0" onClick={() => handleApprove(item)}>
                  {item.actionLabel}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Toast
        open={toastTitle !== null}
        title={toastTitle ?? ''}
        description="The post is queued for its slot."
        durationMs={TOAST_MS}
        onDismiss={() => setToastTitle(null)}
      />
    </Card>
  )
}

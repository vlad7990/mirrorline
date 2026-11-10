'use client'

/**
 * Step 2 — "Connect your accounts".
 *
 * Four platform cards and the rights confirmation. The confirmation is the
 * gate: CLAUDE.md non-negotiable 1 says we only ever work from client-owned
 * material, so Continue stays disabled until the client says so in writing.
 *
 * The status chip here is local on purpose: @mirrorline/ui's StatusChip covers
 * the compliance and publishing words (Passed, Scheduled, Published…), not
 * account connection.
 */

import { Button, Card, Checkbox, Label, cn } from '@mirrorline/ui'
import * as React from 'react'

import { ONBOARDING_ACCOUNTS, RIGHTS_CONFIRMATION, type OnboardingAccount } from './onboarding-data'

export interface AccountsStepProps {
  rightsConfirmed: boolean
  onRightsConfirmedChange: (confirmed: boolean) => void
}

export function AccountsStep({ rightsConfirmed, onRightsConfirmedChange }: AccountsStepProps) {
  const checkboxId = React.useId()
  const hintId = `${checkboxId}-hint`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Connect your accounts</h1>
        <p className="m-0 text-body text-text-muted">
          We post only to accounts you connect, through each platform&apos;s official sign-in. You
          can disconnect any time.
        </p>
      </div>

      <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5 p-0">
        {ONBOARDING_ACCOUNTS.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </ul>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Checkbox
            id={checkboxId}
            checked={rightsConfirmed}
            onCheckedChange={(next) => onRightsConfirmedChange(next === true)}
            aria-describedby={rightsConfirmed ? undefined : hintId}
          />
          <Label htmlFor={checkboxId} className="cursor-pointer text-body font-normal">
            {RIGHTS_CONFIRMATION}
          </Label>
        </div>
        {rightsConfirmed ? null : (
          <p id={hintId} className="m-0 pl-11 text-meta text-text-muted">
            Tick this to continue. We only make videos from material you own or hold the rights to.
          </p>
        )}
      </div>
    </div>
  )
}

interface AccountCardProps {
  account: OnboardingAccount
}

function AccountCard({ account }: AccountCardProps) {
  const noteId = React.useId()
  const hasNote = account.note !== null

  return (
    <Card as="li" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 font-heading text-label text-text">{account.platform}</h2>
        <AccountStatusChip isConnected={account.isConnected} label={account.statusLabel} />
      </div>

      <p className="m-0 text-meta text-text-muted">{account.detail}</p>

      {hasNote ? (
        <p
          id={noteId}
          className={cn(
            // A sentence, and one of our named trust disclosures — DESIGN.md
            // keeps 12px for chips and small labels, so this runs at 13px.
            'm-0 text-meta font-normal',
            account.noteTone === 'warning' ? 'text-on-warning-soft' : 'text-text-muted',
          )}
        >
          {account.note}
        </p>
      ) : null}

      <Button
        // DESIGN.md "Button primary … One per section": the footer's Continue
        // owns that slot. A connected account, or a post-MVP one like LinkedIn,
        // must never be the filled button competing with it.
        variant={account.isConnected || account.isComingSoon ? 'secondary' : 'primary'}
        // LinkedIn is post-MVP: the button is visible, not live.
        disabled={account.isComingSoon}
        aria-describedby={hasNote ? noteId : undefined}
        className="mt-auto w-full"
      >
        {account.actionLabel}
      </Button>
    </Card>
  )
}

interface AccountStatusChipProps {
  isConnected: boolean
  label: string
}

/** Soft fill, dark text, always a word. DESIGN.md "Status chip". */
function AccountStatusChip({ isConnected, label }: AccountStatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-body text-caption',
        isConnected
          ? 'bg-success-soft text-on-success-soft'
          : 'bg-neutral-soft text-on-neutral-soft',
      )}
    >
      {label}
    </span>
  )
}

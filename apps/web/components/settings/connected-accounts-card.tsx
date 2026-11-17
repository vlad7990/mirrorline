'use client'

import { useId } from 'react'
import type { AccountStatus, SocialAccount } from '@mirrorline/mock'
import { Button, Card, Divider, cn } from '@mirrorline/ui'
import Link from 'next/link'

/**
 * "Connected accounts" — one row per platform, with its honest limits.
 *
 * CLAUDE.md non-negotiable 3: publishing happens "only through official
 * platform APIs … to client-connected accounts", so this card is the only
 * place a platform can be added or removed, and every state carries a word.
 *
 * LinkedIn is post-MVP: its Connect button stays disabled and the reason is
 * written on the row, not hidden in a tooltip.
 */

interface StatusChipStyle {
  /** The word in the chip. Never a colour on its own. */
  readonly word: string
  readonly classes: string
}

const STATUS_CHIPS: Record<AccountStatus, StatusChipStyle> = {
  connected: { word: 'Connected', classes: 'bg-success-soft text-on-success-soft' },
  'reconnect-needed': {
    word: 'Reconnect needed',
    classes: 'bg-danger-soft text-on-danger-soft',
  },
  'not-connected': { word: 'Off', classes: 'bg-neutral-soft text-on-neutral-soft' },
}

const COMING_SOON_PLATFORM = 'linkedin'

const COMING_SOON_NOTE = 'Coming after the first three platforms.'

export interface ConnectedAccountsCardProps {
  accounts: readonly SocialAccount[]
  onReconnect: (accountId: string) => void
  onDisconnect: (accountId: string) => void
  onConnect: (accountId: string) => void
}

/** The line under the platform name: the handle, or what we have instead. */
function secondaryLine(account: SocialAccount): string {
  if (account.handle) return account.handle
  if (account.status === 'not-connected') return account.statusLabel
  return account.displayName
}

export function ConnectedAccountsCard({
  accounts,
  onReconnect,
  onDisconnect,
  onConnect,
}: ConnectedAccountsCardProps) {
  const comingSoonNoteId = useId()

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">Connected accounts</h2>

      <ul className="m-0 flex list-none flex-col p-0">
        {accounts.map((account) => {
          const chip = STATUS_CHIPS[account.status]
          const isComingSoon = account.platform === COMING_SOON_PLATFORM

          return (
            <li key={account.id} className="flex flex-col gap-2 py-3">
              <Divider />
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* Grows, but never below a readable handle width. */}
                <span className="flex min-w-0 flex-1 basis-[150px] flex-col gap-0.5">
                  <span className="text-label text-text">
                    {account.platformLabel}
                    {isComingSoon ? (
                      <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-neutral-soft px-2 py-0.5 text-caption font-normal text-on-neutral-soft">
                        Coming soon
                      </span>
                    ) : null}
                  </span>
                  <span className="text-meta text-text-muted">{secondaryLine(account)}</span>
                </span>

                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2.5 py-1',
                    'font-body text-caption',
                    chip.classes,
                  )}
                >
                  {chip.word}
                </span>

                {account.status === 'reconnect-needed' ? (
                  <Button variant="secondary" onClick={() => onReconnect(account.id)}>
                    Reconnect
                    <span className="sr-only"> {account.platformLabel}</span>
                  </Button>
                ) : null}

                {account.status === 'connected' ? (
                  <Button variant="secondary" onClick={() => onDisconnect(account.id)}>
                    Disconnect
                    <span className="sr-only"> {account.platformLabel}</span>
                  </Button>
                ) : null}

                {account.status === 'not-connected' ? (
                  <Button
                    variant="secondary"
                    disabled={isComingSoon}
                    aria-describedby={isComingSoon ? comingSoonNoteId : undefined}
                    onClick={() => onConnect(account.id)}
                  >
                    Connect
                    <span className="sr-only"> {account.platformLabel}</span>
                  </Button>
                ) : null}
              </div>

              {account.note ? <p className="m-0 text-meta text-text-muted">{account.note}</p> : null}

              {isComingSoon ? (
                <p id={comingSoonNoteId} className="m-0 text-meta text-text-muted">
                  {COMING_SOON_NOTE}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>

      {/* Where Accounts is reached from, now the sidebar is back to eight
          items. The Accounts screen already links here for "connect or
          disconnect"; this is the other half of that pair. The split is
          deliberate — this card decides which accounts we may post to, which
          is the question with a consent record attached, and that one reports
          how each is doing. */}
      <Link
        href="/app/accounts"
        className="text-label text-primary underline-offset-4 hover:underline dark:text-accent"
      >
        See each account&rsquo;s own results
      </Link>
    </Card>
  )
}

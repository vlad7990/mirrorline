'use client'

import { useEffect, useState } from 'react'
import { accounts as initialAccounts, type SocialAccount } from '@mirrorline/mock'
import { AlertBar, Button, Toast } from '@mirrorline/ui'

import { AppearanceCard } from './appearance-card'
import { ConnectedAccountsCard } from './connected-accounts-card'
import { CustomKpisCard } from './custom-kpis-card'
import { DataRightsCard } from './data-rights-card'
import { PlanCard } from './plan-card'
import { RepostWatchCard } from './repost-watch-card'
import { TeamCard } from './team-card'

/**
 * S10's live parts: the account list, the alert above it and the toast.
 *
 * 03_SCREENS_SPEC.md "States to show at least once" asks for an error state,
 * "account disconnected, 'Reconnect Instagram'". That bar is not written by
 * hand: it appears for whichever account is in the `reconnect-needed` state in
 * the fixtures, and it goes away when that account is reconnected.
 *
 * Every update rebuilds the list; the fixtures themselves stay read-only.
 */

interface Notice {
  readonly title: string
  readonly description: string
}

/** How long the confirmation stays up before it clears itself. */
const TOAST_MS = 5000

export function SettingsBoard() {
  const [accountList, setAccountList] = useState<readonly SocialAccount[]>(initialAccounts)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reconnectAccount = accountList.find((account) => account.status === 'reconnect-needed')

  function labelFor(accountId: string): string {
    return accountList.find((account) => account.id === accountId)?.platformLabel ?? 'The account'
  }

  function handleReconnect(accountId: string) {
    setAccountList((previous) =>
      previous.map((account) =>
        account.id === accountId
          ? {
              ...account,
              status: 'connected' as const,
              statusLabel: 'Connected',
              // "The platform signed us out" stops being true; a standing
              // limit such as TikTok's private posting still is.
              note: account.isPrivatePosting ? account.note : null,
            }
          : account,
      ),
    )
    const label = labelFor(accountId)
    setNotice({
      title: `${label} reconnected`,
      description: `${label} posts are no longer paused.`,
    })
  }

  function handleDisconnect(accountId: string) {
    setAccountList((previous) =>
      previous.map((account) =>
        account.id === accountId
          ? { ...account, status: 'not-connected' as const, statusLabel: 'Not connected' }
          : account,
      ),
    )
    const label = labelFor(accountId)
    setNotice({
      title: `${label} disconnected`,
      description: `Nothing posts to ${label} until you connect it again.`,
    })
  }

  function handleConnect(accountId: string) {
    setAccountList((previous) =>
      previous.map((account) =>
        account.id === accountId
          ? { ...account, status: 'connected' as const, statusLabel: 'Connected' }
          : account,
      ),
    )
    const label = labelFor(accountId)
    setNotice({
      title: `${label} connected`,
      description: `${label} is ready for scheduled posts.`,
    })
  }

  function handleNotice(title: string, description: string) {
    setNotice({ title, description })
  }

  return (
    <div className="flex flex-col gap-5">
      {reconnectAccount ? (
        <AlertBar
          title={`${reconnectAccount.platformLabel} needs to reconnect.`}
          description={`${reconnectAccount.platformLabel} asked you to sign in again. ${reconnectAccount.platformLabel} posts are paused until then.`}
          action={
            <Button variant="primary" onClick={() => handleReconnect(reconnectAccount.id)}>
              Reconnect {reconnectAccount.platformLabel}
            </Button>
          }
        />
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-5">
        <ConnectedAccountsCard
          accounts={accountList}
          onReconnect={handleReconnect}
          onDisconnect={handleDisconnect}
          onConnect={handleConnect}
        />
        <PlanCard />
        <RepostWatchCard onNotice={handleNotice} />
        <CustomKpisCard />
        <TeamCard onNotice={handleNotice} />
        <AppearanceCard />
        <DataRightsCard onNotice={handleNotice} />
      </div>

      <Toast
        open={notice !== null}
        title={notice?.title ?? ''}
        description={notice?.description}
        onDismiss={() => setNotice(null)}
      />
    </div>
  )
}

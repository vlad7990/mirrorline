'use client'

import { useEffect, useState, useTransition } from 'react'
import type { AccountStatus, SocialAccount } from '@mirrorline/mock'
import { AlertBar, Button, Toast } from '@mirrorline/ui'

import {
  connectSocialAccountAction,
  disconnectSocialAccountAction,
} from '@/app/app/(studio)/settings/actions'

import { AppearanceCard } from './appearance-card'
import { ConnectedAccountsCard } from './connected-accounts-card'
import { CustomKpisCard } from './custom-kpis-card'
import { DataRightsCard } from './data-rights-card'
import { DeleteWorkspaceCard } from './delete-workspace-card'
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

/** The word in the chip, for a status this board has just set itself. */
const STATUS_LABELS: Readonly<Record<AccountStatus, string>> = {
  connected: 'Connected',
  'reconnect-needed': 'Reconnect needed',
  'not-connected': 'Not connected',
}

export interface SettingsBoardProps {
  /**
   * The workspace this viewer owns, read on the server by the page. `null`
   * when they own none — the delete card says so rather than offering a
   * control that would be refused.
   */
  readonly workspace: { readonly id: string; readonly name: string } | null
  /**
   * This workspace's accounts, read on the server under the viewer's own
   * session (B2.3). One row per supported platform, plus any extra handle
   * stored on one — `toSettingsAccounts` decides that, not this board.
   *
   * **No longer the fixtures.** A real client's Settings screen showing the
   * demo workspace's three connected accounts would be a claim about their
   * account, which is what non-negotiable 7 forbids.
   */
  readonly accounts: readonly SocialAccount[]
}

export function SettingsBoard({ workspace, accounts }: SettingsBoardProps) {
  const [accountList, setAccountList] = useState<readonly SocialAccount[]>(accounts)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reconnectAccount = accountList.find((account) => account.status === 'reconnect-needed')

  function labelFor(platform: string): string {
    return (
      accountList.find((account) => account.platform === platform)?.platformLabel ?? 'The account'
    )
  }

  /**
   * One shape for all three controls, because they are one write (B2.3, D107).
   *
   * Optimistic, then corrected: the row flips immediately and the action's
   * answer decides whether it stays. A failure puts the previous list back and
   * says what happened — the alternative is a row claiming a connection the
   * database refused, which is the one outcome worse than a slow button.
   *
   * Matched on `(platform, handle)` rather than on the row id, because a
   * not-connected placeholder has no row and therefore no id the database would
   * recognise (D107). An empty stored handle matches the row the typed handle
   * is about to fill.
   */
  function runConnection(
    platform: string,
    handle: string,
    next: AccountStatus,
    describe: (label: string) => Notice,
  ) {
    const label = labelFor(platform)
    const previousList = accountList

    setAccountList((previous) =>
      previous.map((account) =>
        account.platform === platform &&
        ((account.handle ?? '') === handle || (account.handle ?? '') === '')
          ? {
              ...account,
              handle,
              status: next,
              statusLabel: STATUS_LABELS[next],
              connectedOn: next === 'not-connected' ? null : account.connectedOn,
              // "The platform signed us out" stops being true; a standing limit
              // such as TikTok's private posting still is.
              note: account.isPrivatePosting ? account.note : null,
            }
          : account,
      ),
    )

    startTransition(async () => {
      const result =
        next === 'not-connected'
          ? await disconnectSocialAccountAction(platform, handle)
          : await connectSocialAccountAction(platform, handle)

      if (result.status === 'error') {
        setAccountList(previousList)
        setNotice({ title: `${label} not changed`, description: result.message })
        return
      }

      setNotice(describe(label))
    })
  }

  function handleReconnect(platform: string, handle: string) {
    runConnection(platform, handle, 'connected', (label) => ({
      title: `${label} reconnected`,
      description: `${label} posts are no longer paused.`,
    }))
  }

  function handleDisconnect(platform: string, handle: string) {
    runConnection(platform, handle, 'not-connected', (label) => ({
      title: `${label} disconnected`,
      description: `Nothing posts to ${label} until you connect it again.`,
    }))
  }

  function handleConnect(platform: string, handle: string) {
    runConnection(platform, handle, 'connected', (label) => ({
      title: `${label} connected`,
      // Not "ready for scheduled posts", which the old stub said: §6 keeps
      // posting off until the platforms approve the app, and a toast is read
      // as a promise.
      description: `We have recorded ${handle} as yours. Nothing posts until ${label} approves our app.`,
    }))
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
            <Button
              variant="primary"
              onClick={() =>
                handleReconnect(reconnectAccount.platform, reconnectAccount.handle ?? '')
              }
            >
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
        <DeleteWorkspaceCard workspace={workspace} />
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

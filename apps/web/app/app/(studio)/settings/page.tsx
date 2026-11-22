import type { Metadata } from 'next'
import { PageHeader } from '@mirrorline/ui'

import { SettingsBoard } from '@/components/settings/settings-board'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'
import { readSocialAccountRows } from '@/lib/workspace/read-social-accounts'
import { toSettingsAccounts } from '@/lib/workspace/settings-accounts'

/**
 * S10 · Settings and billing — "Connected accounts with status and disconnect
 * buttons; plan card …; usage meter …; invoices; team members; data and
 * rights" (03_SCREENS_SPEC.md).
 *
 * The workspace and the accounts are read here rather than in `SettingsBoard`,
 * because the board is a client component. As of B2.3 the account list is the
 * second part of Settings that is not a mock — the plan, usage, invoices and
 * team cards still render from the fixtures.
 */

export const metadata: Metadata = { title: 'Settings and billing' }

export default async function SettingsPage() {
  const workspace = await getOwnedWorkspace()
  const rows = await readSocialAccountRows()

  // A failed read and an empty workspace both come out as the four
  // placeholders: the card's job here is to offer somewhere to connect from,
  // and neither case may fall back to the demo workspace's accounts.
  const accounts = toSettingsAccounts(rows ?? [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings and billing" />
      <SettingsBoard workspace={workspace} accounts={accounts} />
    </div>
  )
}

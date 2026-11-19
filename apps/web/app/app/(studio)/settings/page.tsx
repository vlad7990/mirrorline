import type { Metadata } from 'next'
import { PageHeader } from '@mirrorline/ui'

import { SettingsBoard } from '@/components/settings/settings-board'
import { getOwnedWorkspace } from '@/lib/workspace/current-workspace'

/**
 * S10 · Settings and billing — "Connected accounts with status and disconnect
 * buttons; plan card …; usage meter …; invoices; team members; data and
 * rights" (03_SCREENS_SPEC.md).
 *
 * The workspace is read here rather than in `SettingsBoard`, because the board
 * is a client component and this is the only thing on the screen that needs the
 * real database. Everything else still renders from the fixtures; the delete
 * card is the first part of Settings that is not a mock.
 */

export const metadata: Metadata = { title: 'Settings and billing' }

export default async function SettingsPage() {
  const workspace = await getOwnedWorkspace()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings and billing" />
      <SettingsBoard workspace={workspace} />
    </div>
  )
}

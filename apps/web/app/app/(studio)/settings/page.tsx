import type { Metadata } from 'next'
import { PageHeader } from '@mirrorline/ui'

import { SettingsBoard } from '@/components/settings/settings-board'

/**
 * S10 · Settings and billing — "Connected accounts with status and disconnect
 * buttons; plan card …; usage meter …; invoices; team members; data and
 * rights" (03_SCREENS_SPEC.md).
 */

export const metadata: Metadata = { title: 'Settings and billing' }

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings and billing" />
      <SettingsBoard />
    </div>
  )
}

import { Button, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AccountsBoard } from '@/components/studio/accounts-board'

/**
 * Accounts — 16 §5: "New: connected social accounts, status, per-account
 * KPIs."
 *
 * Deliberately separate from the connect-and-disconnect controls in Settings.
 * This screen answers "how is each account doing"; that one answers "which
 * accounts are we allowed to post to". Putting both in one place made the
 * second question harder to find, which is the one with a consent record
 * attached to it.
 */

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Every connected account, its status, and its own KPIs.',
}

export default function AccountsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-[22px]">
      <PageHeader
        eyebrow="Publisher agent"
        title="Accounts"
        description="One card per account you have connected, with the measurements for that account alone. Anything we have not connected shows what it would measure, not a zero."
        action={
          <Button asChild variant="secondary">
            <Link href="/app/settings">Connect or disconnect</Link>
          </Button>
        }
      />

      <AccountsBoard />
    </div>
  )
}

import { Button, Card, PageHeader } from '@mirrorline/ui'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AccountsBoard } from '@/components/studio/accounts-board'
import { readSocialAccounts } from '@/lib/workspace/read-social-accounts'

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

export default async function AccountsPage() {
  // As the signed-in user: RLS decides the rows, so there is no workspace id
  // here to get wrong (B2.3). Null means the read failed, which is a different
  // thing from a workspace with nothing connected — and neither falls back to
  // the sample accounts, because a sample figure beside a real handle reads as
  // that client's own result.
  const accounts = await readSocialAccounts()

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

      {accounts === null ? (
        <Card className="flex flex-col gap-2">
          <span className="text-subtitle font-semibold">We could not read your accounts</span>
          <p className="m-0 text-caption text-text-muted">
            Nothing is lost — this is a read, and your connections are unchanged. Reload the page,
            and tell us if it keeps happening.
          </p>
        </Card>
      ) : (
        <AccountsBoard accounts={accounts} />
      )}
    </div>
  )
}

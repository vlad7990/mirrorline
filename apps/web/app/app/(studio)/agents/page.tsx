import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Agents' }

export default function AgentsPage() {
  return (
    <ComingSoon
      eyebrow="Agents"
      title="Agents"
      description="What each of the seven agents is doing, what it finished this week, and what it spent."
    />
  )
}

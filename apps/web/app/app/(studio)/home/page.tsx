import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <ComingSoon
      eyebrow="Command centre"
      title="Home"
      description="What went out today, what needs your eye, and what the agents are working on."
    />
  )
}

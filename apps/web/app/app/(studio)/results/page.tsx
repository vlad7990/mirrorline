import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Results' }

export default function ResultsPage() {
  return (
    <ComingSoon
      eyebrow="Results"
      title="Results"
      description="Views, clicks and calls booked, and the hooks your audience answered."
    />
  )
}

import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Calendar' }

export default function CalendarPage() {
  return (
    <ComingSoon
      eyebrow="Calendar and approvals"
      title="Calendar"
      description="The week ahead on each platform, and the posts still waiting for your approval."
    />
  )
}

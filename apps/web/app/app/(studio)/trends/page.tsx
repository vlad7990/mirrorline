import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Trends' }

export default function TrendsPage() {
  return (
    <ComingSoon
      eyebrow="Trend board"
      title="Trends"
      description="Formats rising in your niche and nearby, with how well each one fits your brand."
    />
  )
}

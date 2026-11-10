import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Brand kit' }

export default function BrandKitPage() {
  return (
    <ComingSoon
      eyebrow="Brand kit"
      title="Brand kit"
      description="Your colours, fonts, caption style and voice, and the consent records behind them."
    />
  )
}

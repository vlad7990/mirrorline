import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

export const metadata: Metadata = { title: 'Upload' }

export default function UploadPage() {
  return (
    <ComingSoon
      eyebrow="Upload and multiply"
      title="Upload"
      description="Drop a long video. We'll find the moments worth posting."
    />
  )
}

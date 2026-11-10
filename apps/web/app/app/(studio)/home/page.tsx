import type { Metadata } from 'next'

import { DEMO_STATE_PARAM, parseDemoState } from '@/components/upload/upload-data'
import { UploadScreen } from '@/components/upload/upload-screen'

/**
 * S3 · Upload and multiply.
 *
 * The page's only job is to read `?state=` and hand a validated value to the
 * screen. Next 15 delivers search params as a promise, and anything it
 * carries is untrusted, so it goes through `parseDemoState` before use.
 */

export const metadata: Metadata = { title: 'Upload' }

interface UploadPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const params = await searchParams
  return <UploadScreen state={parseDemoState(params[DEMO_STATE_PARAM])} />
}

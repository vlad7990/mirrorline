import type { Metadata } from 'next'

import { ComingSoon } from '@/components/coming-soon'

/** Next 15 hands route params to the page as a promise. */
type RemakeParams = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: RemakeParams): Promise<Metadata> {
  const { id } = await params
  return { title: `Remake ${id}` }
}

export default async function RemakePage({ params }: RemakeParams) {
  const { id } = await params

  return (
    <ComingSoon
      eyebrow="Remake studio"
      title="Remake"
      description={`Your own version of trend ${id}: a new script, your footage, and every AI scene labelled.`}
    />
  )
}

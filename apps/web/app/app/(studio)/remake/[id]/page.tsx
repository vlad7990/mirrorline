import { trends } from '@mirrorline/mock'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { remakePlanFor } from '@/components/remake/remake-plans'
import { buildRecipe } from '@/components/remake/remake-recipe'
import { RemakeStudio } from '@/components/remake/remake-studio'

/**
 * S5 · Remake studio, one route per trend.
 *
 * The trend is the only thing taken from the URL; everything else is looked
 * up from the fixtures. An id with no trend behind it is a 404, not an empty
 * screen.
 */

/** Next 15 hands route params to the page as a promise. */
type RemakeParams = { params: Promise<{ id: string }> }

/** Prerender the eight trend ids the board links to. */
export function generateStaticParams(): { id: string }[] {
  return trends.map((trend) => ({ id: trend.id }))
}

function findTrend(id: string) {
  return trends.find((trend) => trend.id === id)
}

export async function generateMetadata({ params }: RemakeParams): Promise<Metadata> {
  const { id } = await params
  const trend = findTrend(id)
  return { title: trend ? `Remake: ${trend.format}` : 'Remake' }
}

export default async function RemakePage({ params }: RemakeParams) {
  const { id } = await params
  const trend = findTrend(id)
  if (!trend) notFound()

  // A trend with no written plan would render an empty studio; treat the id
  // as unknown instead.
  const plan = remakePlanFor(trend.id)
  if (!plan) notFound()

  return <RemakeStudio trend={trend} recipe={buildRecipe(trend.beats)} plan={plan} />
}

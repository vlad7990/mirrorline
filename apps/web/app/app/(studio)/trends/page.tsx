import { trends } from '@mirrorline/mock'
import { AlertBar, Button, EmptyState, PageHeader } from '@mirrorline/ui'
import { Info } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { TrendCard } from '@/components/trends/trend-card'
import { TrendFilterBar } from '@/components/trends/trend-filter-bar'
import {
  NICHE_PARAM,
  PLATFORM_PARAM,
  WINDOW_PARAM,
  WINDOW_SENTENCES,
  filterTrends,
  firstParam,
  parseNicheFilter,
  parsePlatformFilter,
  parseTimeWindow,
  type TrendFilterState,
} from '@/components/trends/trend-filters'

/**
 * S4 · Trend board.
 *
 * The filters live in the query string, so the server renders the exact set
 * of cards the URL asks for and the client only writes the next URL.
 *
 * Every card is a format recipe drawn as empty frames. CLAUDE.md
 * non-negotiable 1 and 2: we never hold anyone else's footage, and a remake
 * copies the format only.
 */

export const metadata: Metadata = { title: 'Trends' }

interface TrendsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TrendsPage({ searchParams }: TrendsPageProps) {
  const params = await searchParams

  const filters: TrendFilterState = {
    niche: parseNicheFilter(firstParam(params[NICHE_PARAM])),
    platform: parsePlatformFilter(firstParam(params[PLATFORM_PARAM])),
    window: parseTimeWindow(firstParam(params[WINDOW_PARAM])),
  }

  const visible = filterTrends(trends, filters)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Create · Trend Scout agent · updated 10:05 am"
        title="Formats rising now"
        description={WINDOW_SENTENCES[filters.window]}
        action={<TrendFilterBar filters={filters} />}
      />

      {/* CLAUDE.md non-negotiables 1 and 2, said plainly and up front. */}
      <AlertBar
        tone="info"
        role="region"
        aria-label="How remakes work"
        title={
          <>
            <Info
              aria-hidden="true"
              className="mr-2 inline size-[18px] align-[-3px]"
              strokeWidth={2}
            />
            We remake the format, never the footage.
          </>
        }
        description="Each card is a recipe of beats, not someone else's video. Every remake gets a new script, your footage and a compliance check."
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No formats match these filters"
          description="The Trend Scout only keeps formats it can describe as beats. Widen the niche or pick another platform."
          action={
            <Button asChild variant="secondary">
              <Link href="/app/trends">Show all formats</Link>
            </Button>
          }
        />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </ul>
      )}
    </div>
  )
}

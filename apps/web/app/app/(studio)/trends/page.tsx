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
 * S4 · Niche Scan.
 *
 * Renamed from "Trend board" in v4 under 16 §5. The screen never really was a
 * trending list — Trend Scout researches the account's own niche and the ones
 * beside it, and what comes back is a set of recipes with a fit score. Calling
 * it Trends invited the comparison with every tool that shows you what is
 * popular, which is the comparison P2 and P5 exist to refuse.
 *
 * Each card now carries the Niche Scan's two benchmarks: **views per
 * follower**, which makes formats comparable across accounts of different
 * sizes, and the **fit score** against this brand.
 *
 * The filters live in the query string, so the server renders the exact set
 * of cards the URL asks for and the client only writes the next URL.
 *
 * Every card is a format recipe drawn as empty frames. CLAUDE.md
 * non-negotiables 1 and 2: we never hold anyone else's footage, and a remake
 * copies the format only.
 */

export const metadata: Metadata = { title: 'Niche Scan' }

/**
 * SC 4.1.3: changing a filter used to swap the whole grid in silence. This one
 * line is the result count, visible rather than `sr-only` — a sighted person
 * has the same question, and a live region nobody can see is a region nobody
 * can check.
 */
function matchCountLine(count: number): string {
  if (count === 0) return 'No formats match these filters'
  return count === 1 ? '1 format matches these filters' : `${count} formats match these filters`
}

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
        title="Niche Scan"
        description={`Formats rising in your niche and the ones beside it. ${WINDOW_SENTENCES[filters.window]}`}
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

      <p role="status" className="m-0 text-meta text-text-muted">
        {matchCountLine(visible.length)}
      </p>

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

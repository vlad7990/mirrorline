'use client'

/**
 * The filter bar in the S4 page header.
 *
 * It owns no state of its own: it reads the active filters from props and
 * writes the next ones into the query string, which the server page reads
 * back. One source of truth, and every view can be linked to.
 */

import { SegmentedControl, Select } from '@mirrorline/ui'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import {
  NICHE_OPTIONS,
  PLATFORM_OPTIONS,
  WINDOW_OPTIONS,
  filtersToQuery,
  parseNicheFilter,
  parsePlatformFilter,
  parseTimeWindow,
  type TrendFilterState,
} from '@/components/trends/trend-filters'

export interface TrendFilterBarProps {
  filters: TrendFilterState
}

const TRENDS_PATH = '/app/trends'

export function TrendFilterBar({ filters }: TrendFilterBarProps) {
  const router = useRouter()

  // Every change rebuilds the whole state; nothing is mutated in place.
  const apply = React.useCallback(
    (next: TrendFilterState) => {
      router.push(`${TRENDS_PATH}${filtersToQuery(next)}`, { scroll: false })
    },
    [router],
  )

  return (
    // The page header holds its action in a shrink-0 box, so the bar needs a
    // cap of its own to wrap instead of pushing the page sideways.
    <div className="flex max-w-[calc(100vw-72px)] flex-wrap items-center gap-2 lg:max-w-none">
      <SegmentedControl
        label="Which niches"
        items={NICHE_OPTIONS}
        value={filters.niche}
        onValueChange={(value) => apply({ ...filters, niche: parseNicheFilter(value) })}
      />

      <Select
        aria-label="Platform"
        options={PLATFORM_OPTIONS}
        value={filters.platform}
        onValueChange={(value) => apply({ ...filters, platform: parsePlatformFilter(value) })}
        // Wide enough for the longest label, "YouTube Shorts", on one line.
        className="w-[184px]"
      />

      <Select
        aria-label="When the Trend Scout scored these formats"
        options={WINDOW_OPTIONS}
        value={filters.window}
        onValueChange={(value) => apply({ ...filters, window: parseTimeWindow(value) })}
        className="w-[160px]"
      />
    </div>
  )
}

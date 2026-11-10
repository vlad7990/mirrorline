/**
 * One card on the S4 board.
 *
 * DESIGN.md "Trend card": "niche chip and growth figure, the format name, an
 * abstract 4-frame storyboard (empty 9:16 frames with a coloured bar and a
 * beat label, never a real video), 'why it works', a 'Fit for Maya' bar, and
 * the primary 'Remake for my brand'."
 */

import type { Trend } from '@mirrorline/mock'
import { Button, Card, ProgressBar, StoryboardFrames } from '@mirrorline/ui'
import Link from 'next/link'

import { OWNER_FIRST_NAME, storyboardBeats } from '@/components/trends/trend-beats'

export interface TrendCardProps {
  trend: Trend
}

/** Fit is a 0–100 score, so the bar needs no other scale. */
const FIT_MAX = 100

export function TrendCard({ trend }: TrendCardProps) {
  const fitLabel = `Fit for ${OWNER_FIRST_NAME}`

  return (
    <Card as="li" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-neutral-soft px-2.5 py-1 font-body text-caption text-on-neutral-soft">
          {trend.fromNiche}
        </span>
        {/* The green is decoration; the words carry the meaning. */}
        <span className="tabular font-body text-label text-on-success-soft">
          <span className="sr-only">7-day growth </span>
          {trend.growthLabel}
        </span>
      </div>

      <h2 className="m-0 font-heading text-title text-text">{trend.format}</h2>

      <StoryboardFrames
        beats={storyboardBeats(trend.beats)}
        label={`Beats of ${trend.format}`}
        className="mt-0.5"
      />

      <p className="m-0 text-body text-text-muted">{trend.whyItWorks}</p>

      <div className="mt-auto flex items-center gap-3 pt-1">
        <span className="shrink-0 font-body text-meta text-text-muted">{fitLabel}</span>
        <ProgressBar
          value={trend.fit}
          max={FIT_MAX}
          label={fitLabel}
          valueText={`${trend.fit} out of ${FIT_MAX}`}
        />
        <span className="tabular shrink-0 font-body text-label text-text">{trend.fit}</span>
      </div>

      <Button asChild variant="primary" fullWidth>
        <Link href={`/app/remake/${trend.id}`}>
          Remake for my brand
          <span className="sr-only">: {trend.format}</span>
        </Link>
      </Button>
    </Card>
  )
}

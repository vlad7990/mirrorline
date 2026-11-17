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
        {/* The green is decoration; the words carry the meaning. The figure
            itself is what the Trend Scout measured, so it goes mono, while the
            niche chip beside it stays in Geist — that is a name. */}
        <span className="machine text-label text-on-success-soft">
          <span className="font-body sr-only">7-day growth </span>
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

      {/* 12 §Niche Scan: the benchmark that makes formats comparable across
          accounts of different sizes. A format averaging 50,000 views on an
          account with 500,000 followers is not working, and a raw view count
          cannot say so — which is why this sits beside the fit score rather
          than a view total. */}
      <p className="m-0 text-meta text-text-muted">
        <span className="machine text-text">{trend.viewsPerFollower.toFixed(1)}×</span> views per
        follower in this niche
      </p>

      <div className="mt-auto flex items-center gap-3 pt-1">
        <span className="shrink-0 font-body text-meta text-text-muted">{fitLabel}</span>
        <ProgressBar
          value={trend.fit}
          max={FIT_MAX}
          label={fitLabel}
          valueText={`${trend.fit} out of ${FIT_MAX}`}
        />
        {/* A fit score, measured against this brand. */}
        <span className="machine shrink-0 text-label text-text">{trend.fit}</span>
      </div>

      {/* DESIGN.md "Motion — Press": a 3% dip on :active, fine pointers only,
          dropped under prefers-reduced-motion. */}
      <Button asChild variant="primary" className="press" fullWidth>
        <Link href={`/app/remake/${trend.id}`}>
          Remake for my brand
          <span className="sr-only">: {trend.format}</span>
        </Link>
      </Button>
    </Card>
  )
}

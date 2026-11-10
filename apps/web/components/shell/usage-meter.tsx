import { workspace } from '@mirrorline/mock'
import { ProgressBar } from '@mirrorline/ui'

/**
 * "Posts this month · 63 of 90", at the foot of the sidebar and inside the
 * mobile drawer. DESIGN.md "Layout": the sidebar ends with a usage meter.
 *
 * The figures come from the demo workspace fixture, never from this file.
 */

export function UsageMeter({ className }: { className?: string }) {
  const { postsUsed, postsIncluded } = workspace
  const used = `${postsUsed} of ${postsIncluded}`

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-meta text-text-muted">Posts this month</span>
        {/* DESIGN.md "Layout": the sidebar ends with a usage meter, "the
            figures in mono". It counts what the Publisher has already sent
            against what the plan allows. */}
        <span className="machine text-meta font-semibold text-text">{used}</span>
      </div>
      <ProgressBar
        value={postsUsed}
        max={postsIncluded}
        label="Posts used this month"
        valueText={`${used} posts`}
        className="mt-2"
      />
    </div>
  )
}

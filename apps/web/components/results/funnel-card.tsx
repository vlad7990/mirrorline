/**
 * "From views to calls".
 *
 * DESIGN.md "Funnel": "horizontal bars on one shared scale, with counts and
 * step rates, so the real drop-off shows." FunnelBar owns that scale; this
 * card only hands it the stages and says where the numbers came from.
 */

import { funnel, workspace } from '@mirrorline/mock'
import { Card, FunnelBar } from '@mirrorline/ui'

/** "Maya" rather than "Maya Torres", from the workspace owner. */
const FIRST_NAME = workspace.ownerName.split(' ')[0] ?? workspace.ownerName

export function FunnelCard() {
  const steps = funnel.map((stage) => ({ label: stage.label, count: stage.value }))

  return (
    <Card as="section" aria-labelledby="funnel-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="funnel-heading" className="m-0 font-heading text-title text-text">
        From views to calls
      </h2>
      <FunnelBar steps={steps} baselineRate="all views" />
      <p className="m-0 text-meta text-text-muted">
        Clicks counted through {FIRST_NAME}&rsquo;s tracked link; calls from her booking tool. Bars
        share one scale, so the drop between stages is real.
      </p>
    </Card>
  )
}

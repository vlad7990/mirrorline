'use client'

import { Button, Card, Label, Switch } from '@mirrorline/ui'
import { useId, useState } from 'react'

/**
 * Repost Watch — 09 §9, 16 §5, P10.
 *
 * The platforms' own protection tools reach monetised creators first and leave
 * smaller accounts exposed. So we crosspost originals to the client's own
 * Facebook page to make them eligible, and hand them a checklist for enrolling
 * and acting.
 *
 * **We never file claims on a client's behalf**, and that sentence is on the
 * card rather than in a help article. It is the line between a service and
 * someone purporting to act on another person's legal standing, and a client
 * who only discovers it after a repost has discovered it too late.
 */

const CHECKLIST: readonly string[] = [
  'Crosspost each original to your own Facebook page — we do this automatically while this is on.',
  'Enrol that page in the platform’s rights-protection programme. The link is in the weekly ledger email.',
  'When you find a repost, use the platform’s own report form. We will give you the original file, its upload time and its hashes.',
]

export function RepostWatchCard({
  onNotice,
}: {
  onNotice: (title: string, description: string) => void
}) {
  const [isOn, setIsOn] = useState(true)
  const switchId = useId()

  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 font-heading text-subtitle text-text">Repost Watch</h2>
        <span className="flex min-h-touch items-center gap-2">
          <Label htmlFor={switchId}>Crossposting</Label>
          <Switch id={switchId} checked={isOn} onCheckedChange={setIsOn} />
        </span>
      </div>

      <p className="m-0 text-meta text-text-muted">
        Protection tools reach monetised accounts first. Crossposting your originals to your own
        Facebook page is what makes them eligible in the first place.
      </p>

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {CHECKLIST.map((step, index) => (
          <li key={step} className="flex gap-2.5 text-meta text-text">
            <span className="machine shrink-0 text-text-muted">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <Button
        variant="secondary"
        className="self-start"
        onClick={() =>
          onNotice(
            'The checklist is not downloadable yet',
            'It is sent with the weekly ledger. The file export lands with the database.',
          )
        }
      >
        Get the checklist
      </Button>

      <p className="m-0 border-t border-border pt-3 text-caption text-text-muted">
        We never file claims on your behalf. That is your decision and your legal standing, not
        ours — we give you the evidence and you choose what to do with it.
      </p>
    </Card>
  )
}

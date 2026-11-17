'use client'

import { useState } from 'react'
import { brandKit } from '@mirrorline/mock'
import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@mirrorline/ui'

/**
 * "Data and rights" — the records behind the videos.
 *
 * CLAUDE.md non-negotiables 4 and 5: AI scenes are always labelled, and a
 * voice or a likeness is used only with a stored consent record. Both are
 * stated as plain rows here, with no badge and no certification claim.
 */

/** Settings the fixtures hold no field for. Plain facts, no claims attached. */
const RIGHTS_CONFIRMATIONS_DETAIL = '4 uploads, all confirmed'
const AI_LABELLING_DETAIL = 'Always on for AI scenes'
const DATA_LOCATION_DETAIL = 'United States'

interface RightsRow {
  readonly label: string
  readonly detail: string
}

export interface DataRightsCardProps {
  /** Shows a toast once a request has been made. */
  onNotice: (title: string, description: string) => void
}

export function DataRightsCard({ onNotice }: DataRightsCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { consent } = brandKit.voice

  const rows: readonly RightsRow[] = [
    { label: 'Rights confirmations', detail: RIGHTS_CONFIRMATIONS_DETAIL },
    {
      label: 'Consent releases',
      detail: `${consent.signedBy}, voice and likeness, ${consent.signedOnLabel}`,
    },
    { label: 'AI labelling', detail: AI_LABELLING_DETAIL },
    { label: 'Data location', detail: DATA_LOCATION_DETAIL },
  ]

  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">Data and rights</h2>

      {/* HTML allows exactly one wrapper <div> between <dl> and its <dt>/<dd>,
          so the rule above each row is this div's top border rather than a
          nested <Divider>. Same 1px line, same spacing. */}
      <dl className="m-0 flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2"
          >
            <dt className="text-body text-text">{row.label}</dt>
            <dd className="m-0 text-meta text-text-muted">{row.detail}</dd>
          </div>
        ))}
      </dl>

      {/* 09 §10 and 16 §5: two different exports, because they answer two
          different fears. "Your data" is the GDPR-shaped request. "All your
          files" is the one a client asks before cancelling — every video,
          script and caption we ever made for them — and folding it into a
          privacy button would hide the answer to the more common question. */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            onNotice(
              'File export is not connected',
              'Every video, script and caption we have made for you, as one download. The job lands with the database.',
            )
          }
        >
          Export all my files
        </Button>

        <Button
          variant="secondary"
          onClick={() =>
            onNotice('Export is not connected', 'This preview has no file to send you yet.')
          }
        >
          Export my data
        </Button>

        <Button
          variant="tertiary"
          className="text-on-danger-soft dark:text-on-danger-soft"
          onClick={() => setIsConfirmOpen(true)}
        >
          Withdraw voice consent
        </Button>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogTitle>Withdraw voice consent?</DialogTitle>
          <DialogDescription>
            The agents stop using {consent.signedBy}&apos;s voice on new videos. Videos already
            published stay up, and you can sign a new release at any time.
          </DialogDescription>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setIsConfirmOpen(false)
                onNotice('Voice consent withdrawn', 'This preview records the choice on screen only.')
              }}
            >
              Withdraw consent
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">Keep consent</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

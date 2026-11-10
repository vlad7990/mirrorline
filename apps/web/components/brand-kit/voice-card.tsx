import { brandKit, workspace } from '@mirrorline/mock'
import { Card, StatusChip } from '@mirrorline/ui'

/**
 * "Voice" — which voice the agents may use, and the record behind it.
 *
 * CLAUDE.md non-negotiable 5: "Consent: no face-swaps; voice or likeness only
 * with a stored consent record." Both halves of that rule are written on the
 * card in plain words, not implied.
 */

/** The fixtures hold no stock-voice description, so the backup is named here. */
const STOCK_VOICE_LABEL = 'Stock voice: “Calm, warm, female, US”'

const firstName = workspace.ownerName.split(' ')[0] ?? workspace.ownerName

export function VoiceCard() {
  const { voice } = brandKit

  return (
    <Card as="section" className="flex flex-col gap-3.5">
      <h2 className="m-0 font-heading text-subtitle text-text">Voice</h2>

      {/* DESIGN.md "Elevation": the chosen option takes a 2px ink border. */}
      <div className="flex flex-col gap-2 rounded-md border-2 border-ink p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-label text-text">
            {voice.label}
            <span className="sr-only">, in use</span>
          </span>
          <StatusChip status="passed">Consent signed {voice.consent.signedOnLabel}</StatusChip>
        </div>
        <p className="m-0 text-meta text-text-muted">
          Used only for {firstName}&apos;s videos. You can withdraw consent at any time in Settings.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3.5">
        <span className="text-body text-text">{STOCK_VOICE_LABEL}</span>
        <span className="text-caption font-normal text-text-muted">Backup</span>
      </div>

      <p className="m-0 text-meta text-text-muted">
        We never swap faces. A voice or a likeness is used only when a signed consent record is on
        file, and only for this brand&apos;s own videos.
      </p>
    </Card>
  )
}

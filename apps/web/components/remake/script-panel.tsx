/**
 * S5, column 2: the brand's own version.
 *
 * The new script, labelled beat by beat, then the shot list with the source
 * of every shot, then the voice and its consent record.
 *
 * CLAUDE.md non-negotiables 4 and 5: AI scenes carry a label, and a voice is
 * only used with a stored consent record.
 */

import { brandKit } from '@mirrorline/mock'
import { Card, StatusChip, cn } from '@mirrorline/ui'

import {
  SHOT_SOURCE_LABELS,
  type RemakeShot,
  type ScriptLine,
  type ShotSource,
} from '@/components/remake/remake-plans'
import { OWNER_FIRST_NAME } from '@/components/trends/trend-beats'

export interface ScriptPanelProps {
  script: readonly ScriptLine[]
  shots: readonly RemakeShot[]
}

const HEADING_ID = 'new-script-heading'

/** The AI scene is the one row that has to stand out, so it takes accent. */
const SOURCE_CHIP_TONES: Record<ShotSource, string> = {
  'client-footage': 'bg-neutral-soft text-on-neutral-soft',
  'ai-scene': 'bg-accent-soft text-on-accent-soft',
  graphic: 'bg-neutral-soft text-on-neutral-soft',
}

export function ScriptPanel({ script, shots }: ScriptPanelProps) {
  const consent = brandKit.voice.consent

  return (
    <Card as="section" aria-labelledby={HEADING_ID} className="flex min-w-0 flex-col gap-4">
      <h2 id={HEADING_ID} className="eyebrow m-0">
        {`2 · ${OWNER_FIRST_NAME}'s version · new script`}
      </h2>

      <div className="flex flex-col gap-3 rounded-lg bg-surface-subtle p-4">
        {script.map((line) => (
          <p key={line.beat} className="m-0 text-body text-text">
            <strong className="font-semibold">{line.beat}:</strong> {line.text}
          </p>
        ))}
      </div>

      <section aria-labelledby="shot-list-heading" className="flex flex-col gap-1">
        <h3 id="shot-list-heading" className="m-0 font-body text-label text-text">
          Shot list
        </h3>
        <ol className="m-0 flex list-none flex-col p-0">
          {shots.map((shot, index) => (
            <li
              key={shot.description}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border py-2.5"
            >
              <span className="tabular w-4 shrink-0 font-body text-label text-text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 basis-[200px] text-body text-text">
                {shot.description}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 font-body text-caption',
                  SOURCE_CHIP_TONES[shot.source],
                )}
              >
                {SHOT_SOURCE_LABELS[shot.source]}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="m-0 flex flex-wrap items-center gap-2.5 border-t border-border pt-3 text-body text-text">
        <strong className="font-semibold">Voice:</strong>
        <span>{`${OWNER_FIRST_NAME}'s own recording`}</span>
        <StatusChip status="passed">{`Consent on file · ${consent.signedOnLabel}`}</StatusChip>
      </p>
    </Card>
  )
}

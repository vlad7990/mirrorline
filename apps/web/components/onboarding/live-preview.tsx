'use client'

/**
 * The 9:16 sample caption beside the wizard.
 *
 * It repaints the moment a colour, a caption font or a tone slider changes —
 * that live link is the whole point of step 1. The tone line is announced
 * politely so a screen-reader user hears the slider take effect too.
 */

import { ViewerPanel } from '@mirrorline/ui'

import { describeTone, findColour, findFont, type ToneValues } from './onboarding-data'

const CAPTION_BEFORE = "Burnout isn't a"
const CAPTION_HIGHLIGHT = 'workload'
const CAPTION_AFTER = 'problem.'
const HANDLE = '@mayatorres.coach'

export interface LivePreviewProps {
  colourId: string
  fontValue: string
  tone: ToneValues
}

export function LivePreview({ colourId, fontValue, tone }: LivePreviewProps) {
  const palette = findColour(colourId).preview
  const font = findFont(fontValue)

  return (
    <aside aria-label="Live preview" className="flex flex-col items-center gap-3">
      <span className="eyebrow">Live preview</span>

      {/* DESIGN.md "Colors — Viewer": the preview sits on the lightbox, "the
          same near-black in both themes", so the colours a person picks here
          are the colours they will see on the finished post. Without the mat a
          light palette would look right on a white page and wrong once the cut
          reached the approvals queue.

          The frame itself mirrors what VideoThumb renders: a 6px radius, 14px
          inset and the 17px/700 overlay caption, at the width that keeps the
          caption the same size relative to the frame. */}
      <ViewerPanel className="w-full max-w-[236px] items-center">
        <div
          className="flex aspect-[9/16] w-full max-w-[204px] flex-col justify-end gap-2 rounded-thumb p-3.5 transition-colors duration-150"
          style={{ backgroundColor: palette.background }}
        >
          <p
            className="m-0 text-overlay-caption"
            style={{ fontFamily: font.stack, fontWeight: font.weight, color: palette.caption }}
          >
            {CAPTION_BEFORE}{' '}
            <span
              className="rounded-sm px-1"
              style={{
                backgroundColor: palette.highlightBackground,
                color: palette.highlightText,
              }}
            >
              {CAPTION_HIGHLIGHT}
            </span>{' '}
            {CAPTION_AFTER}
          </p>
          <span className="text-caption font-normal" style={{ color: palette.handle }}>
            {HANDLE}
          </span>
        </div>
      </ViewerPanel>

      <p className="m-0 max-w-[220px] text-center text-meta text-text-muted" aria-live="polite">
        {describeTone(tone)} Updates as you change your brand.
      </p>
    </aside>
  )
}

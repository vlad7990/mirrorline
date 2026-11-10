'use client'

import { useId, useState } from 'react'
import { brandKit } from '@mirrorline/mock'
import { Card, cn } from '@mirrorline/ui'

import { ViewerPanel } from '@/components/shell/viewer-panel'

/**
 * "Caption style" — three previews of the same line, one of them selected.
 *
 * 03_SCREENS_SPEC.md "S9 · Brand kit": "caption styles (3 presets with
 * previews)". The names, descriptions and the intro and outro templates come
 * from @mirrorline/mock; only the look of each preset is described here,
 * because a colour and a typeface are presentation, not data.
 *
 * Built from native radio inputs: a radio group gives arrow-key movement and
 * the right announcement for free.
 */

interface CaptionPreviewStyle {
  /** Background and text colour for the tile. */
  readonly tile: string
  /** Weight and family for the sample line. */
  readonly type: string
  /** Set the key phrase on the sand highlight. */
  readonly highlight: boolean
  /** The serif preset has no token family, so it names one directly. */
  readonly fontFamily?: string
}

const PREVIEW_STYLES: Record<string, CaptionPreviewStyle> = {
  'bold-highlight': {
    tile: 'bg-demo-teal text-on-primary',
    type: 'font-heading font-bold',
    highlight: true,
  },
  'editorial-serif': {
    tile: 'bg-demo-sand text-demo-teal',
    type: 'font-normal',
    highlight: false,
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  'clean-minimal': {
    tile: 'bg-ink text-on-ink',
    type: 'font-body font-semibold',
    highlight: false,
  },
}

const FALLBACK_STYLE: CaptionPreviewStyle = {
  tile: 'bg-ink text-on-ink',
  type: 'font-body font-semibold',
  highlight: false,
}

/** One phrase, rendered three ways, so the difference is the style alone. */
const SAMPLE_LEAD = 'Coach, '
const SAMPLE_KEY_PHRASE = 'don’t carry.'

const DEFAULT_STYLE_ID =
  brandKit.captionStyles.find((style) => style.isSelected)?.id ?? brandKit.captionStyles[0]?.id ?? ''

export function CaptionStyleCard() {
  const groupName = useId()
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_STYLE_ID)

  return (
    <Card as="section" className="flex flex-col gap-3.5">
      <h2 className="m-0 font-heading text-subtitle text-text">Caption style</h2>

      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Caption style</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {brandKit.captionStyles.map((style) => {
            const preview = PREVIEW_STYLES[style.id] ?? FALLBACK_STYLE

            return (
              <label key={style.id} className="min-w-0">
                <input
                  type="radio"
                  name={groupName}
                  value={style.id}
                  checked={selectedId === style.id}
                  onChange={() => setSelectedId(style.id)}
                  className="peer sr-only"
                />
                {/* A 2px border at all times, so choosing one never shifts the
                    row; only its colour changes. */}
                <span
                  className={cn(
                    'flex cursor-pointer flex-col gap-2 rounded-md border-2 border-border p-2',
                    'peer-checked:border-primary',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                    // DESIGN.md "Motion — Press": a 3% dip on :active, fine
                    // pointers only, dropped under prefers-reduced-motion.
                    'press',
                  )}
                >
                  {/* DESIGN.md "Colors — Viewer": a caption preview is the
                      product's video output, so it is judged on the lightbox
                      rather than on the card. The mat is the same near-black in
                      both themes, which is the point here: the three styles
                      have to be compared against one ground, and two of them
                      carry light fills that would otherwise read one way on a
                      white card and another on a dark one. */}
                  <ViewerPanel aria-hidden="true" flush className="gap-0">
                    <span
                      className={cn(
                        'flex aspect-[9/12] items-end rounded-sm p-2.5 text-[15px] leading-tight',
                        preview.tile,
                        preview.type,
                      )}
                      style={preview.fontFamily ? { fontFamily: preview.fontFamily } : undefined}
                    >
                      <span>
                        {SAMPLE_LEAD}
                        {preview.highlight ? (
                          <mark className="rounded-sm bg-demo-sand px-1 text-demo-teal">
                            {SAMPLE_KEY_PHRASE}
                          </mark>
                        ) : (
                          SAMPLE_KEY_PHRASE
                        )}
                      </span>
                    </span>
                  </ViewerPanel>
                  <span className="flex flex-col text-caption font-normal text-text">
                    {style.name}
                    {/* The word, not only the border colour, marks the choice. */}
                    {selectedId === style.id ? (
                      <span className="font-semibold text-text">Selected</span>
                    ) : null}
                  </span>
                  <span className="sr-only">{style.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-meta text-text">
        <li className="rounded-md border border-border bg-background px-3 py-2">
          Intro: {brandKit.introTemplate}
        </li>
        <li className="rounded-md border border-border bg-background px-3 py-2">
          Outro: {brandKit.outroTemplate}
        </li>
      </ul>
    </Card>
  )
}

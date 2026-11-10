/**
 * S5, column 3: the preview and the hooks to A/B test.
 *
 * The hooks are a real radio group built on native inputs, so arrow keys,
 * Home and End work without any key handling of our own. The visible ring
 * follows the hidden input with `has-[:focus-visible]`.
 *
 * DESIGN.md "AI label": the preview carries the "AI scene" badge because the
 * cut contains one (CLAUDE.md non-negotiable 4).
 */

import { Card, VideoThumb, cn } from '@mirrorline/ui'
import * as React from 'react'

import { ViewerPanel } from '@/components/shell/viewer-panel'

export interface PreviewPanelProps {
  /** The three hooks. The checked one is burned into the preview. */
  hooks: readonly string[]
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  /** "0:40". */
  lengthLabel: string
  /** "@mayatorres.coach". */
  handle: string
}

const HEADING_ID = 'preview-heading'

export function PreviewPanel({
  hooks,
  selectedIndex,
  onSelectedIndexChange,
  lengthLabel,
  handle,
}: PreviewPanelProps) {
  const groupName = React.useId()
  const selectedHook = hooks[selectedIndex] ?? hooks[0] ?? ''

  return (
    <Card
      as="section"
      aria-labelledby={HEADING_ID}
      className="flex min-w-0 flex-col gap-3.5 xl:self-start"
    >
      <h2 id={HEADING_ID} className="eyebrow m-0">
        3 · Preview
      </h2>

      {/* DESIGN.md "Viewer panel": "a near-black lightbox holding the 9:16
          frame, in both themes, with the AI label and any length or cut badges
          sitting on it." The lightbox does not follow the theme, so this cut
          looks the same to whoever approves it. The length under the frame is a
          measurement and goes mono; the handle beside it is a name. */}
      <ViewerPanel
        className="items-center self-center"
        footer={
          <>
            <span className="machine">{lengthLabel}</span> · {handle}
          </>
        }
      >
        <VideoThumb caption={selectedHook} aiScene className="w-full max-w-[200px]" />
      </ViewerPanel>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 font-body text-label text-text">Hooks to A/B test</legend>

        {hooks.map((hook, index) => {
          const isSelected = index === selectedIndex

          return (
            <label
              key={hook}
              className={cn(
                'flex cursor-pointer items-center rounded-md border-2 px-3 py-2.5',
                'font-body text-body',
                // DESIGN.md "Motion — Press": a 3% dip on :active, fine
                // pointers only, dropped under prefers-reduced-motion. It
                // replaces the hover colour fade on this label, because
                // `.press` owns the transition shorthand.
                'press',
                // The input is visually hidden, so the ring has to follow it
                // onto the label. `outline-2` carries the solid style.
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                'has-[:focus-visible]:outline-primary',
                isSelected
                  ? 'border-primary bg-accent-soft text-on-accent-soft'
                  : 'border-border bg-surface text-text hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={groupName}
                className="sr-only"
                checked={isSelected}
                onChange={() => onSelectedIndexChange(index)}
              />
              {/* The border is decoration; "Selected" is the word behind it. */}
              {isSelected ? <span className="sr-only">Selected: </span> : null}
              {hook}
            </label>
          )
        })}
      </fieldset>
    </Card>
  )
}

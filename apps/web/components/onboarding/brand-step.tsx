'use client'

/**
 * Step 1 — "Your brand": logo, colours, caption font and the three tone
 * sliders. Every change here lands in the live preview beside it.
 *
 * The colour pills are real radio inputs inside a fieldset, so arrow keys,
 * grouping and the label association come from the browser rather than from
 * hand-rolled ARIA. DESIGN.md "Elevation & Depth": the selected pill takes a
 * 2px ink border, never a shadow.
 */

import { Button, Label, Select, Slider, cn } from '@mirrorline/ui'
import * as React from 'react'

import {
  BRAND_COLOURS,
  CAPTION_FONTS,
  LOGO_INITIALS,
  TONE_AXES,
  type ToneAxis,
  type ToneAxisId,
  type ToneValues,
} from './onboarding-data'

const TONE_MIN = 0
const TONE_MAX = 100

export interface BrandStepProps {
  colourId: string
  onColourChange: (colourId: string) => void
  fontValue: string
  onFontChange: (fontValue: string) => void
  tone: ToneValues
  onToneChange: (axisId: ToneAxisId, value: number) => void
  logoFileName: string
  onLogoFileNameChange: (fileName: string) => void
}

export function BrandStep({
  colourId,
  onColourChange,
  fontValue,
  onFontChange,
  tone,
  onToneChange,
  logoFileName,
  onLogoFileNameChange,
}: BrandStepProps) {
  const fontId = React.useId()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    if (picked) onLogoFileNameChange(picked.name)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-headline text-text">Your brand</h1>
        <p className="m-0 text-body text-text-muted">
          We use this on every caption, intro and thumbnail, so your videos always look like you.
        </p>
      </div>

      {/* Logo ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden="true"
          className="grid size-[88px] shrink-0 place-items-center rounded-xl bg-demo-teal font-heading text-metric text-demo-sand"
        >
          {LOGO_INITIALS}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <span className="text-label text-text">{logoFileName}</span>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Replace logo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            aria-label={`Replace the brand logo. Current file: ${logoFileName}`}
            onChange={handleFilePicked}
          />
        </div>
      </div>

      {/* Colours ---------------------------------------------------------- */}
      <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
        <legend className="mb-2.5 p-0 text-label font-semibold text-text">
          Colours (suggested from your logo)
        </legend>
        <div className="flex flex-wrap gap-3">
          {BRAND_COLOURS.map((colour) => {
            const isSelected = colour.id === colourId

            return (
              <label
                key={colour.id}
                className={cn(
                  'inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-full border-2 bg-surface py-1.5 pr-3.5 pl-1.5',
                  'font-body text-meta transition-colors duration-150',
                  isSelected ? 'border-ink font-semibold text-text' : 'border-border text-text',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                )}
              >
                <input
                  type="radio"
                  name="brand-colour"
                  value={colour.id}
                  checked={isSelected}
                  onChange={() => onColourChange(colour.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-7 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: colour.hex }}
                />
                {colour.name}
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Caption font ----------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fontId}>Caption font</Label>
        <Select
          id={fontId}
          options={CAPTION_FONTS.map((font) => ({ value: font.value, label: font.label }))}
          value={fontValue}
          onValueChange={onFontChange}
          className="max-w-[320px]"
        />
      </div>

      {/* How you talk ----------------------------------------------------- */}
      <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
        <legend className="mb-2 p-0 text-label font-semibold text-text">How you talk</legend>
        {TONE_AXES.map((axis) => (
          <ToneSliderRow
            key={axis.id}
            axis={axis}
            value={tone[axis.id]}
            onToneChange={onToneChange}
          />
        ))}
      </fieldset>
    </div>
  )
}

interface ToneSliderRowProps {
  axis: ToneAxis
  value: number
  onToneChange: (axisId: ToneAxisId, value: number) => void
}

/** End labels stay visible on both sides; the slider itself carries the name. */
function ToneSliderRow({ axis, value, onToneChange }: ToneSliderRowProps) {
  return (
    <div className="flex items-center gap-3 text-meta text-text-muted">
      <span className="w-[72px] shrink-0">{axis.leftLabel}</span>
      <Slider
        label={axis.accessibleName}
        value={[value]}
        onValueChange={(next) => onToneChange(axis.id, next[0] ?? value)}
        min={TONE_MIN}
        max={TONE_MAX}
        step={1}
        className="min-w-0 flex-1"
      />
      <span className="w-[72px] shrink-0 text-right">{axis.rightLabel}</span>
    </div>
  )
}

'use client'

import { useId } from 'react'
import { useTheme, type ThemePreference } from '@mirrorline/ui'

import { MonitorIcon, MoonIcon, SunIcon, type IconProps } from '@/components/icons'

/**
 * Light / dark / system, as one segmented control.
 *
 * Built from native radio inputs: a radio group gives arrow-key movement and
 * the right announcement for free. It keeps its own markup rather than using
 * @mirrorline/ui's SegmentedControl because each option here is icon-only, with
 * the word carried in an `sr-only` span. DESIGN.md "Elevation & Depth" allows
 * the one shadow on the active segment, which is `shadow-segment` in the theme.
 *
 * Each option is icon-only on screen; the word is the accessible name.
 */

interface ThemeOption {
  readonly value: ThemePreference
  readonly label: string
  readonly Icon: (props: IconProps) => React.JSX.Element
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
]

const ICON_SIZE = 18

export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const groupName = useId()

  return (
    <fieldset className={className}>
      <legend className="sr-only">Theme</legend>
      <div className="flex gap-1 rounded-md border border-border bg-background p-1">
        {OPTIONS.map(({ value, label, Icon }) => (
          // `relative` is not spacing. The input below is `sr-only`, which is
          // `position: absolute`, so without a positioned ancestor it resolves
          // against whatever happens to be positioned further up — or the
          // initial containing block — and the control's hit target ends up
          // somewhere else on the page. A real click still works, because it
          // lands on the span and the label forwards it; a synthetic click on
          // the control does not, which is how this surfaced once the switch
          // was put in the footer. The same failure `.scroll-x` guards against
          // in theme.css.
          <label key={value} className="relative flex-1">
            <input
              type="radio"
              name={groupName}
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
              className="peer sr-only"
            />
            <span className="flex min-h-touch cursor-pointer items-center justify-center rounded-sm text-text-muted transition-colors hover:text-text peer-checked:bg-surface peer-checked:text-text peer-checked:shadow-segment peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
              <Icon size={ICON_SIZE} />
              <span className="sr-only">{label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

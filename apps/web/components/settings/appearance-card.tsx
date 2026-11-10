import { Card } from '@mirrorline/ui'

import { ThemeSwitch } from '@/components/shell/theme-switch'

/**
 * "Appearance" — light, dark or system.
 *
 * The control is the one that already exists in the shell; this card only
 * gives it a heading and a line of explanation, so there is a single theme
 * switch in the app.
 */

export function AppearanceCard() {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">Appearance</h2>
      <p className="m-0 text-meta text-text-muted">
        Light, dark, or match whatever your device is set to.
      </p>
      <ThemeSwitch />
    </Card>
  )
}

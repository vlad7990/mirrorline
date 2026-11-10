import { brandKit } from '@mirrorline/mock'
import { Button, Card } from '@mirrorline/ui'

/**
 * "Logo and colours" — the first card on S9.
 *
 * The swatches are the demo client's own brand colours, which live in
 * @mirrorline/mock. They are the only hues on this screen that are not theme
 * tokens, so they are set as inline values: DESIGN.md scopes the demo brand
 * colours to the client's own material, and they must not follow the theme.
 */

const LOGO_TILE_SIZE = 72

/** The demo brand's teal and sand, from DESIGN.md "Demo brand colours". */
const LOGO_TILE_BACKGROUND = '#12545A'
const LOGO_TILE_TEXT = '#F3E9DC'

/** "Maya Torres Coaching" → "MT". */
function initialsFrom(label: string): string {
  return label
    .split(' ')
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function LogoAndColoursCard() {
  return (
    <Card as="section" className="flex flex-col gap-3.5">
      <h2 className="m-0 font-heading text-subtitle text-text">Logo and colours</h2>

      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex items-center justify-center rounded-xl font-heading text-[26px] font-bold"
          style={{
            width: LOGO_TILE_SIZE,
            height: LOGO_TILE_SIZE,
            backgroundColor: LOGO_TILE_BACKGROUND,
            color: LOGO_TILE_TEXT,
          }}
        >
          {initialsFrom(brandKit.logoLabel)}
        </span>
        <Button variant="secondary">
          Replace logo
          <span className="sr-only"> for {brandKit.logoLabel}</span>
        </Button>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-4">
        {brandKit.colors.map((color) => (
          <li key={color.id} className="flex min-w-0 flex-col gap-1.5">
            <span
              aria-hidden="true"
              className="h-12 rounded-md border border-border"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-caption font-normal text-text">{color.name}</span>
            <span className="tabular text-caption font-normal text-text-muted">{color.hex}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * S5, column 1: the format recipe.
 *
 * A timed list of beats with one line each, then the pacing and caption rule.
 * It describes the shape of a format; it never shows the video the format
 * came from (CLAUDE.md non-negotiable 1).
 */

import { Card } from '@mirrorline/ui'

import { RECIPE_FOOTER, type RecipeBeat } from '@/components/remake/remake-recipe'

export interface FormatRecipeProps {
  beats: readonly RecipeBeat[]
}

const HEADING_ID = 'format-recipe-heading'

export function FormatRecipe({ beats }: FormatRecipeProps) {
  return (
    <Card
      as="section"
      aria-labelledby={HEADING_ID}
      className="flex min-w-0 flex-col gap-3 xl:self-start"
    >
      <h2 id={HEADING_ID} className="eyebrow m-0">
        1 · Format recipe
      </h2>

      <ol className="m-0 flex list-none flex-col p-0">
        {beats.map((beat) => (
          <li
            key={`${beat.startSeconds}-${beat.name}`}
            className="flex gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
          >
            <span className="tabular w-16 shrink-0 font-body text-caption text-text-muted">
              {beat.timeLabel}
            </span>
            <span className="min-w-0">
              <span className="block font-body text-label text-text">{beat.name}</span>
              <span className="block text-meta text-text-muted">{beat.note}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="m-0 border-t border-border pt-3 text-meta text-text-muted">{RECIPE_FOOTER}</p>
    </Card>
  )
}

/**
 * The four static sections that carry the argument: what changed, what we
 * built instead, how we handle any niche, and the two ways in.
 *
 * Server components, every one. None has state, and keeping them off the
 * client is what lets the home page stay prerendered — the page's only client
 * islands are the picker, the problem cards and the upload control.
 */

import { Card, cn } from '@mirrorline/ui'
import { ArrowRight, Check } from 'lucide-react'
import * as React from 'react'

import { SampleDataLabel } from '../primitives'

import {
  CHANGE_FACTS,
  CONTRAST_ROWS,
  INPUT_ROUTES,
  SAMPLE_RECIPE,
  SCAN_STEPS,
} from './problem-content'

/* -------------------------------------------------------------------------- */
/* 3. What changed in 2026                                                     */
/* -------------------------------------------------------------------------- */

export function ChangedIn2026() {
  return (
    <ol className="m-0 grid list-none grid-cols-1 gap-px overflow-hidden rounded-lg border border-ink-line bg-ink-line p-0 md:grid-cols-3">
      {CHANGE_FACTS.map((fact, position) => (
        <li
          key={fact.id}
          className="reveal-item flex flex-col gap-2 bg-ink-800 p-6"
          style={{ '--index': position } as React.CSSProperties}
        >
          <span className="machine text-mono text-gold-bright">{`0${position + 1}`}</span>
          <h3 className="m-0 font-heading text-subtitle text-on-ink-900">{fact.headline}</h3>
          <p className="m-0 text-meta text-on-ink-muted">{fact.body}</p>
        </li>
      ))}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. We built the opposite                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The before → after table from 14 §2, covering P1–P10.
 *
 * A real `<table>` on wide screens, because it is genuinely tabular: two
 * comparable values per approach. Below `md` it becomes a stack of cards — a
 * three-column table at 390px either overflows or crushes every column to
 * three words a line.
 */
export function ContrastTable() {
  return (
    <>
      {/* Wide: a table, scrolling inside its own card rather than widening the
          page. DESIGN.md "Layout": wide content scrolls inside its card. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            What the usual approaches give you, and what Mirrorline does instead
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-[22%] p-4 text-label font-semibold text-text">
                The approach
              </th>
              <th scope="col" className="p-4 text-label font-semibold text-text-muted">
                What you got
              </th>
              <th scope="col" className="p-4 text-label font-semibold text-text">
                What we do instead
              </th>
            </tr>
          </thead>
          <tbody>
            {CONTRAST_ROWS.map((row) => (
              <tr key={row.category} className="border-b border-border last:border-b-0">
                <th scope="row" className="p-4 align-top">
                  <span className="block font-heading text-subtitle text-text">{row.category}</span>
                  <span className="machine mt-1 block text-mono text-gold-text">
                    {row.problems.join(' · ')}
                  </span>
                </th>
                <td className="p-4 align-top text-meta text-text-muted">{row.before}</td>
                <td className="p-4 align-top text-meta text-text">{row.mirrorline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow: one card per approach. */}
      <ul className="m-0 flex list-none flex-col gap-4 p-0 md:hidden">
        {CONTRAST_ROWS.map((row) => (
          <li key={row.category}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="m-0 font-heading text-subtitle text-text">{row.category}</h3>
                <span className="machine shrink-0 text-mono text-gold-text">
                  {row.problems.join(' · ')}
                </span>
              </div>
              <p className="m-0 text-meta text-text-muted">
                <span className="font-semibold">Before: </span>
                {row.before}
              </p>
              <p className="m-0 border-t border-border pt-3 text-meta text-text">
                <span className="font-semibold">With us: </span>
                {row.mirrorline}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. Any niche: our agents research yours                                     */
/* -------------------------------------------------------------------------- */

export function NicheScanExplainer() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {SCAN_STEPS.map((step, position) => (
          <li
            key={step.number}
            className="reveal-item flex gap-4 border-b border-border py-5 first:pt-0 last:border-b-0 last:pb-0"
            style={{ '--index': position } as React.CSSProperties}
          >
            {/* `gold-bright`, not `gold-text`: this section sits on an ink
                band, where surface remaps to ink-700. The deep gold is the
                light-band token and fails 4.5:1 here at mono size. The
                mirror image of the D36 regression, caught the same way. */}
            <span className="machine shrink-0 text-mono text-gold-bright">{step.number}</span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className="m-0 font-heading text-subtitle text-text">{step.title}</h3>
              <p className="m-0 text-meta text-text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <SampleRecipeCard />
    </div>
  )
}

/**
 * One format recipe, as an illustration of what a scan returns.
 *
 * It is a **format, not an industry** — "Myth vs fact" belongs to a tax
 * adviser and a climbing gym equally, which is the clearest way to show that
 * the product does not need to know what business you are in.
 */
function SampleRecipeCard() {
  return (
    <Card className="flex h-full flex-col gap-4 self-start">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">One recipe from a scan</span>
          <h3 className="m-0 font-heading text-title text-text">{SAMPLE_RECIPE.formatName}</h3>
        </div>
        <SampleDataLabel />
      </div>

      <dl className="m-0 grid grid-cols-3 gap-3 rounded-md bg-surface-subtle p-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-text-muted">Fit</dt>
          <dd className="machine m-0 text-mono text-text">{SAMPLE_RECIPE.fitScore}/100</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-text-muted">Views / follower</dt>
          <dd className="machine m-0 text-mono text-text">{SAMPLE_RECIPE.viewsPerFollower}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-text-muted">Length</dt>
          <dd className="machine m-0 text-mono text-text">{SAMPLE_RECIPE.lengthLabel}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <span className="eyebrow">The beats</span>
        {/* An abstract storyboard, never a frame of anyone's video. DESIGN.md:
            "Don't show a trend as someone else's video." */}
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {SAMPLE_RECIPE.beats.map((beat, position) => (
            <li key={beat} className="flex items-center gap-3">
              <span className="machine w-5 shrink-0 text-mono text-text-muted">{position + 1}</span>
              <span className="h-6 w-1 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0 text-meta text-text">{beat}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="m-0 mt-auto border-t border-border pt-3 text-meta text-text-muted">
        <span className="font-semibold text-text">Why it is growing: </span>
        {SAMPLE_RECIPE.whyItWorks}
      </p>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 6. Two ways in                                                              */
/* -------------------------------------------------------------------------- */

export function TwoWaysIn({ className }: { className?: string }) {
  return (
    <ul className={cn('m-0 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2', className)}>
      {INPUT_ROUTES.map((route, position) => (
        <li
          key={route.id}
          className="reveal-item"
          style={{ '--index': position } as React.CSSProperties}
        >
          <Card className="flex h-full flex-col gap-4">
            <div className="flex items-baseline gap-3">
              {/* Ink band, so the bright gold. See the note in the scan steps. */}
              <span className="machine text-mono text-gold-bright">{`0${position + 1}`}</span>
              <h3 className="m-0 font-heading text-title text-text">{route.title}</h3>
            </div>
            <p className="m-0 text-body text-text-muted">{route.body}</p>

            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {route.detail.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                    strokeWidth={2.2}
                  />
                  <span className="text-meta text-text">{line}</span>
                </li>
              ))}
            </ul>

            <p className="m-0 mt-auto flex items-center gap-2 border-t border-border pt-3 text-meta text-text-muted">
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
              {route.bestFor}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  )
}

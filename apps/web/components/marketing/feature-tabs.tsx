'use client'

/**
 * The four-step slider: Multiply, Remake, Publish, Learn.
 *
 * From docs/design/handoff-v4 §Home: four numbered tabs, each with a 2px
 * track along the top. The active tab's track fills gold over 6.5s and then
 * advances. Clicking jumps and restarts the timer.
 *
 * Built on real tab semantics rather than four buttons and a div. The tablist
 * carries arrow-key navigation, each panel is labelled by its tab, and only
 * the active tab is in the page's tab order — which is what lets someone
 * reach all four with Left/Right and then Tab straight into the panel
 * instead of through it.
 *
 * Auto-advance is a genuine accessibility hazard: WCAG 2.2.2 requires a way
 * to pause moving content that lasts more than five seconds. Two things
 * satisfy it here. It stops permanently the moment anyone picks a tab — the
 * page is no longer deciding what you read. And it never starts at all under
 * `prefers-reduced-motion`, where the gold track does not animate either.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { FeatureStagePanel } from './feature-stages'
import { FEATURE_TABS } from './home-content'

/** The handoff's dwell time before advancing. */
const ADVANCE_MS = 6500

export function FeatureTabs() {
  const [active, setActive] = React.useState(0)
  /** Set once anyone interacts. Auto-advance never resumes — see the note. */
  const [isPinned, setIsPinned] = React.useState(false)
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  React.useEffect(() => {
    if (isPinned) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const timer = setTimeout(() => {
      setActive((current) => (current + 1) % FEATURE_TABS.length)
    }, ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [active, isPinned])

  function pick(index: number) {
    setIsPinned(true)
    setActive(index)
  }

  /** Arrow keys move between tabs, as the tab pattern requires. */
  function onKeyDown(event: React.KeyboardEvent) {
    const last = FEATURE_TABS.length - 1
    let next: number | null = null

    if (event.key === 'ArrowRight') next = active === last ? 0 : active + 1
    if (event.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    if (next === null) return

    event.preventDefault()
    pick(next)
    tabRefs.current[next]?.focus()
  }

  const current = FEATURE_TABS[active] ?? FEATURE_TABS[0]
  if (!current) return null

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="What the studio does"
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {FEATURE_TABS.map((tab, index) => {
          const isActive = index === active
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`feature-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`feature-panel-${tab.id}`}
              // Roving tabindex: one stop for the whole set, arrows for the rest.
              tabIndex={isActive ? 0 : -1}
              onClick={() => pick(index)}
              className="group relative flex flex-col gap-1.5 pt-4 text-left"
            >
              {/* The track. Grey underneath, gold filling across it while
                  this tab is the one on show. */}
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-ink-line">
                <span
                  // Keyed on the active index so the fill restarts from zero
                  // each time rather than resuming part-way.
                  key={`${tab.id}-${active}`}
                  className={cn(
                    'block h-full origin-left bg-gold-gradient',
                    isActive ? (isPinned ? 'scale-x-100' : 'animate-track-fill') : 'scale-x-0',
                  )}
                />
              </span>
              <span
                className={cn(
                  'machine text-caption transition-colors',
                  isActive ? 'text-gold-bright' : 'text-on-ink-faint',
                )}
              >
                {tab.number}
              </span>
              <span
                className={cn(
                  'text-title font-semibold transition-colors',
                  isActive ? 'text-on-ink-900' : 'text-on-ink-faint group-hover:text-on-ink-muted',
                )}
              >
                {tab.title}
              </span>
              <span
                className={cn(
                  'text-meta transition-colors',
                  isActive ? 'text-on-ink-muted' : 'text-on-ink-faint',
                )}
              >
                {tab.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* One panel, re-rendered. Four panels with three hidden would put
          three copies of the cut grid in the DOM for no gain. */}
      <div
        role="tabpanel"
        id={`feature-panel-${current.id}`}
        aria-labelledby={`feature-tab-${current.id}`}
        tabIndex={0}
        className="grid gap-8 rounded-3xl border border-ink-line bg-[linear-gradient(180deg,var(--color-ink-700)_0%,var(--color-ink-900)_100%)] p-6 sm:p-10 lg:grid-cols-2 lg:items-center"
      >
        <div className="flex flex-col gap-4">
          <h3 className="m-0 text-site-h2 text-on-ink-900">
            {current.headline} <span className="gold-phrase">{current.headlineAccent}</span>
          </h3>
          <p className="m-0 max-w-[52ch] text-body text-on-ink-muted">{current.body}</p>
          <p className="m-0 border-t border-ink-line pt-4 text-meta text-on-ink-faint">
            <span className="machine">{current.stat}</span>
          </p>
        </div>

        {/* Each tab shows its own job rather than the same six cuts four
            times over — see `feature-stages.tsx` for what changed and why. */}
        <FeatureStagePanel stage={current.stage} />
      </div>
    </div>
  )
}

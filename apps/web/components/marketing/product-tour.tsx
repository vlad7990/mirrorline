'use client'

/**
 * The six-stop tour of the studio, one screen at a time.
 *
 * Radix tabs, for the keyboard behaviour and the tab/panel wiring. Six stops
 * is too many to stack as six full screenshots — that is six screens of
 * scrolling for a section whose point is "here is the shape of it" — and too
 * few to need a carousel.
 *
 * **Only the open panel is mounted, and that is a budget decision.** 19 v2
 * allows an inner page twelve lazy images, and each stop costs two (a light
 * screenshot and a dark one, one of which is always `display: none`). Six
 * mounted stops would be twelve images for this section alone, before the
 * hero, the reel strip or anything else. Radix unmounts closed panels unless
 * told otherwise, so the default is the right one here and `forceMount` is
 * the thing not to reach for.
 *
 * The cost of that is a flash of empty frame the first time a reader opens a
 * stop. It is a real cost and it is the right trade: the alternative is a
 * page that loads twelve screenshots nobody has asked to see yet, on a page
 * that has to hold Lighthouse mobile at 90.
 */

import { cn } from '@mirrorline/ui'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { BrowserFrame } from './kit/frames'
import { PRODUCT_TOUR } from './product-tour-content'

export function ProductTour() {
  return (
    <TabsPrimitive.Root defaultValue={PRODUCT_TOUR[0]?.id} className="flex flex-col gap-6">
      {/* Scrolls sideways on a phone rather than wrapping to three rows.
          `aria-label` because a tab list with no name is six unexplained
          buttons to anyone not looking at the heading above it. */}
      <TabsPrimitive.List
        aria-label="The studio, screen by screen"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {PRODUCT_TOUR.map((stop) => (
          <TabsPrimitive.Trigger
            key={stop.id}
            value={stop.id}
            className={cn(
              'group flex min-h-touch shrink-0 items-center gap-2 rounded-full border px-4 py-2',
              'text-label font-medium transition-colors duration-[var(--duration-dropdown)] ease-out',
              'border-border text-text-muted hover:border-border-strong hover:text-text',
              // The selected tab takes the gold, which is the public site's
              // primary and the one place a marketing page says "you are here".
              'data-[state=active]:border-gold data-[state=active]:bg-gold-soft data-[state=active]:text-on-gold-soft',
            )}
          >
            {/* No `opacity-70` here, and that is a fix rather than a
                preference: axe failed it as a serious colour-contrast
                violation in both themes. Seventy per cent of `text-text-muted`
                on `surface` is below 4.5:1, and a muted token is already as
                far from the body colour as the palette allows — dimming a
                token that has been chosen for contrast is how an accessible
                palette gets spent. The number is smaller than the label,
                which is enough hierarchy for a tab. */}
            <span className="machine text-caption">{stop.number}</span>
            {stop.title}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {PRODUCT_TOUR.map((stop) => (
        <TabsPrimitive.Content
          key={stop.id}
          value={stop.id}
          // Panels are focusable by default in Radix, which is right while
          // the panel holds a screenshot and a paragraph rather than its own
          // controls: it gives a keyboard user somewhere to land after the
          // tab strip.
          className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10"
        >
          <div className="flex flex-col gap-3 lg:col-span-4">
            <h3 className="m-0 font-heading text-title text-text">{stop.title}</h3>
            <p className="m-0 text-body text-text-muted">{stop.body}</p>
          </div>

          <BrowserFrame
            className="lg:col-span-8"
            shot={stop.shot}
            alt={stop.alt}
            path={stop.path}
            sizes="(min-width: 1024px) 660px, 100vw"
            caption="The studio as it is today, on sample data from a fictional demo account."
          />
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

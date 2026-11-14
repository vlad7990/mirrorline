/**
 * The motion system, which nothing else in this suite looks at.
 *
 * DESIGN.md "Motion" makes three promises that are cheap to break silently and
 * invisible in a screenshot:
 *
 * 1. A disclosure animates its height, so the page displaces rather than the
 *    panel appearing on top of its neighbours.
 * 2. An exit is shorter than its entrance (DESIGN.md puts exits at ~65%).
 *    Leaving is not an event; arriving is.
 * 3. Under prefers-reduced-motion the durations collapse but the animation is
 *    still *named*. Radix's Presence waits for `animationend` before it
 *    unmounts a panel, so removing the animation outright would leave closed
 *    panels mounted. This is the subtlest rule in the system and the easiest
 *    to "tidy up" into a bug.
 *
 * The FAQ is the test subject because it is the one disclosure on a public
 * page, so a regression here is visible to a prospect.
 */

import { expect, test, type Page } from '@playwright/test'

import { onlyProject } from './helpers/project-gate'

onlyProject('chromium', 'motion is a property of the CSS, not of the viewport')

const FAQ_PAGE = '/'

/** Milliseconds from a computed `animation-duration` such as "0.2s". */
function toMs(duration: string): number {
  const first = duration.split(',')[0].trim()
  return first.endsWith('ms') ? parseFloat(first) : parseFloat(first) * 1000
}

async function openFirstFaqItem(page: Page) {
  const trigger = page.locator('button').filter({ hasText: '?' }).first()
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  return trigger
}

test('the FAQ panel animates its height open, and clips while it does', async ({ page }) => {
  await page.goto(FAQ_PAGE)
  await openFirstFaqItem(page)

  const panel = page.locator('.accordion-panel[data-state="open"]').first()
  await expect(panel).toBeAttached()

  const style = await panel.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      name: computed.animationName,
      duration: computed.animationDuration,
      overflow: computed.overflow,
      measuredHeight: computed.getPropertyValue('--radix-accordion-content-height'),
    }
  })

  expect(style.name).toBe('mirrorline-accordion-down')
  // Radix has to have measured the panel, or the keyframe animates to nothing.
  expect(style.measuredHeight).toMatch(/\d/)
  // Without this the text spills out of the panel while it is still short.
  expect(style.overflow).toBe('hidden')
})

test('the FAQ panel leaves faster than it arrives', async ({ page }) => {
  await page.goto(FAQ_PAGE)
  const trigger = await openFirstFaqItem(page)

  const enterMs = toMs(
    await page
      .locator('.accordion-panel[data-state="open"]')
      .first()
      .evaluate((element) => getComputedStyle(element).animationDuration),
  )

  await trigger.click()

  const closing = page.locator('.accordion-panel[data-state="closed"]').first()
  const exit = await closing.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { name: computed.animationName, duration: computed.animationDuration }
  })

  expect(exit.name).toBe('mirrorline-accordion-up')
  expect(toMs(exit.duration)).toBeLessThan(enterMs)
})

test('reduced motion collapses the duration but keeps the animation named', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)
  await openFirstFaqItem(page)

  const panel = page.locator('.accordion-panel[data-state="open"]').first()
  await expect(panel).toBeAttached()

  const style = await panel.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { name: computed.animationName, duration: computed.animationDuration }
  })

  // Named, so Presence still gets its animationend and unmounts the panel.
  expect(style.name).toBe('mirrorline-accordion-down')
  // Effectively instant. 1ms is the ceiling the theme sets for this.
  expect(toMs(style.duration)).toBeLessThanOrEqual(1)
})

test('the press affordance is wired to the duration token, not a literal', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const pressable = page.locator('.press').first()
  await expect(pressable).toBeAttached()

  const duration = await pressable.evaluate(
    (element) => getComputedStyle(element).transitionDuration,
  )

  // DESIGN.md "Motion — Press": 140ms. A literal here drifts from the token.
  expect(toMs(duration)).toBeCloseTo(140, -1)
})

/* -------------------------------------------------------------------------- */
/* Motion v2 — 17 §1 M2 and §2                                                */
/* -------------------------------------------------------------------------- */

test('every numbered section rail renders its counter', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const rails = page.locator('.section-rail')
  const count = await rails.count()
  // "More than a few" rather than exactly fourteen: the point of a counter is
  // that sections can be added or moved without renumbering, and a total
  // pinned here would be the hand-maintained number all over again.
  expect(count).toBeGreaterThan(5)

  // The number itself cannot be read back: the index is generated content and
  // its *computed* `content` is the unresolved `counter(...)` expression.
  //
  // So the test asserts the condition that makes the numbering correct rather
  // than the glyphs. The first version of this test checked only that the
  // glyphs had non-zero width, and it passed while all fourteen rails rendered
  // "01" — each `.section-rail` was minting its own counter, because
  // css-lists-3 creates an out-of-scope counter *on the incrementing element*,
  // and "01" is exactly as wide as "02". Comparing the two spans as images was
  // tried next and is worse than useless: an element screenshot is cropped out
  // of the page, so two spans at different subpixel offsets differ whatever
  // they say.
  //
  // One reset, on an ancestor of every rail, is the whole of the fix.
  const scope = await page.evaluate(() => {
    const resetters = Array.from(document.querySelectorAll('*')).filter((node) =>
      getComputedStyle(node).counterReset.includes('mirrorline-section'),
    )
    const railNodes = Array.from(document.querySelectorAll('.section-rail'))
    return {
      resetters: resetters.map((node) => node.tagName),
      coversEveryRail: railNodes.every((rail) =>
        resetters.some((resetter) => resetter.contains(rail)),
      ),
    }
  })

  // Exactly one: a second reset part-way down the page would restart the
  // numbering at that point, which is the same bug wearing a different hat.
  expect(scope.resetters).toEqual(['BODY'])
  expect(scope.coversEveryRail).toBe(true)

  const widths = await rails
    .locator('.section-rail-index')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width))

  expect(widths).toHaveLength(count)
  for (const width of widths) {
    expect(width).toBeGreaterThan(0)
  }
})

test('the rail gold is a scroll-driven fill, and the track is always drawn', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const fill = await page
    .locator('.section-rail-line')
    .first()
    .evaluate((element) => {
      const line = getComputedStyle(element)
      const gold = getComputedStyle(element, '::after')
      return {
        trackColor: line.backgroundColor,
        animationName: gold.animationName,
        transformOrigin: gold.transformOrigin,
      }
    })

  expect(fill.animationName).toBe('mirrorline-rail-fill')
  // The track is painted on the element itself, so an unfilled rail is still a
  // rail rather than a gap in the layout.
  expect(fill.trackColor).not.toBe('rgba(0, 0, 0, 0)')
  // It has to grow from the left, or the gold arrives from the wrong end.
  expect(fill.transformOrigin.startsWith('0px')).toBe(true)
})

test('under reduced motion every rail is already filled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  // The *final* state, not a collapsed animation. The fill lives inside a
  // `prefers-reduced-motion: no-preference` block, so under reduce there is no
  // animation at all and the element's own rule — full gold — is what shows.
  const states = await page.locator('.section-rail-line').evaluateAll((nodes) =>
    nodes.map((node) => {
      const gold = getComputedStyle(node, '::after')
      return { animationName: gold.animationName, transform: gold.transform }
    }),
  )

  expect(states.length).toBeGreaterThan(5)
  for (const state of states) {
    expect(state.animationName).toBe('none')
    // `none` or an identity matrix: either way it is sitting at scaleX(1).
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform)
  }
})

test('the selection pill follows the chosen account option', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const track = page.locator('.choice-track').first()
  await track.scrollIntoViewIfNeeded()
  // The pill only transitions once the client has settled on the stored
  // choice. Before that it is positioned without travel, by design.
  await expect(track).toHaveAttribute('data-hydrated', 'true')

  const pill = track.locator('.choice-pill')
  const options = track.getByRole('radio')

  const pillIndex = () =>
    pill.evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--choice-index').trim(),
    )

  await options.nth(0).click()
  expect(await pillIndex()).toBe('0')

  await options.nth(1).click()
  expect(await pillIndex()).toBe('1')

  // The selection is never conveyed by the moving pill alone.
  await expect(options.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(pill).toHaveAttribute('aria-hidden', 'true')
})

test('reduced motion keeps the pill and drops only its travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  const track = page.locator('.choice-track').first()
  await track.scrollIntoViewIfNeeded()
  const pill = track.locator('.choice-pill')

  // Still drawn: the selected option has to still read as selected.
  await expect(pill).toBeVisible()
  const duration = await pill.evaluate((element) => getComputedStyle(element).transitionDuration)
  expect(toMs(duration)).toBeLessThanOrEqual(1)
})

/* -------------------------------------------------------------------------- */
/* Motion v2 — 17 §3, the Output sequence                                      */
/* -------------------------------------------------------------------------- */

/** The wall is the fallback *and* the final state, so it is always all twelve. */
const CUT_COUNT = 12

const DECORATIVE_LAYERS = [
  '.output-episode',
  '.output-layer-back',
  '.output-front',
  '.output-scan',
] as const

test('under reduced motion the Output section is the finished wall', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  const stage = page.locator('.output-stage')
  await stage.scrollIntoViewIfNeeded()

  // The sequence never arms itself, so there is nothing to wind back.
  await expect(stage).not.toHaveAttribute('data-sequence', 'on')

  const frames = page.locator('[data-cut-frame]')
  await expect(frames).toHaveCount(CUT_COUNT)

  // Every frame at its resting place and every verdict legible. This is the
  // "final state" 17 §5 asks for: not a collapsed animation, but the section
  // as though the sequence had already run.
  const states = await frames.evaluateAll((nodes) =>
    nodes.map((node) => {
      const computed = getComputedStyle(node)
      const chip = node.querySelector('[data-status-chip]')
      return {
        transform: computed.transform,
        opacity: computed.opacity,
        animationName: computed.animationName,
        chipOpacity: chip ? getComputedStyle(chip).opacity : null,
      }
    }),
  )

  for (const state of states) {
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform)
    expect(state.opacity).toBe('1')
    // `.reveal-item` is dropped when the sequence owns the frame, so no
    // view-timeline animation is left holding it at a start state either.
    expect(state.animationName).toBe('none')
    expect(state.chipOpacity).toBe('1')
  }
})

test('the sequence adds nothing to the flow, so it cannot shift the layout', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  const stage = page.locator('.output-stage')
  await stage.scrollIntoViewIfNeeded()

  // Decoration is `display: none` until the sequence runs, and that is what
  // keeps CLS at zero: no episode player, playhead or week strip ever occupies
  // space that would later be taken back.
  for (const selector of DECORATIVE_LAYERS) {
    const layer = stage.locator(selector)
    await expect(layer).toHaveCount(1)
    await expect(layer).toBeHidden()
  }
})

test('every decorative layer is hidden from assistive technology', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const stage = page.locator('.output-stage')
  await stage.scrollIntoViewIfNeeded()

  // The sequence illustrates facts already in the DOM — the episode's length
  // in the panel readout, the verdicts on the frames. A screen reader that
  // heard the illustration as well would hear each of them twice.
  for (const selector of DECORATIVE_LAYERS) {
    await expect(stage.locator(selector)).toHaveAttribute('aria-hidden', 'true')
  }
})

test('the episode is painted over the wall, not behind it', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const stage = page.locator('.output-stage')
  await stage.scrollIntoViewIfNeeded()
  // GSAP is loaded inside the effect, so the stage arms a tick after paint.
  await expect(stage).toHaveAttribute('data-sequence', 'on')

  // The bug this exists for: the episode, the timeline and the playhead were
  // at z-index 1 against the wall's 2, and the wall is an opaque panel — so
  // the opening stage of the sequence was painted behind it and could not be
  // seen at all. Every other test passed, because every other test was about
  // the finished state and the finished state was correct.
  const order = await stage.evaluate((node) => {
    const zOf = (selector: string) => {
      const element = node.querySelector(selector)
      return element ? Number.parseInt(getComputedStyle(element).zIndex, 10) : Number.NaN
    }
    return {
      back: zOf('.output-layer-back'),
      wall: zOf('.output-wall'),
      episode: zOf('.output-episode'),
      scan: zOf('.output-scan'),
      front: zOf('.output-front'),
    }
  })

  expect(order.back).toBeLessThan(order.wall)
  expect(order.episode).toBeGreaterThan(order.wall)
  expect(order.scan).toBeGreaterThan(order.episode)
  expect(order.front).toBeGreaterThan(order.scan)
})

test('the week strip never contradicts the verdicts on the frames', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const stage = page.locator('.output-stage')
  await stage.scrollIntoViewIfNeeded()

  // The strip is decoration, but decoration that states a number is still
  // making a claim. It reads from `cutSummary`; the chips read from each cut's
  // own compliance. Nothing stops those two drifting apart except this.
  const strip = await stage.locator('[data-week-strip] .machine').textContent()
  const passedOnFrames = await page
    .locator('[data-cut-frame] [data-status-chip]')
    .evaluateAll(
      (nodes) =>
        nodes.filter((node) => (node.textContent ?? '').toLowerCase().includes('passed')).length,
    )

  expect(strip).toContain(`${passedOnFrames} passed`)
  expect(strip).toContain(`${CUT_COUNT - passedOnFrames} held`)
})

test('the CTA arrow answers the keyboard as well as the pointer', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const selectors = await page.evaluate(() => {
    const found: string[] = []
    const walk = (list: CSSRuleList) => {
      for (const rule of Array.from(list)) {
        if (rule instanceof CSSStyleRule && rule.selectorText.includes('arrow-cta')) {
          found.push(rule.selectorText)
        }
        const grouping = rule as CSSGroupingRule
        if (grouping.cssRules) walk(grouping.cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules)
      } catch {
        // A cross-origin sheet cannot be read, and we have none to read.
      }
    }
    return found
  })

  expect(selectors.some((selector) => selector.includes(':hover'))).toBe(true)
  // Without this the whole affordance is mouse-only.
  expect(selectors.some((selector) => selector.includes(':focus-visible'))).toBe(true)
})

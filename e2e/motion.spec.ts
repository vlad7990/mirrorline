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
  // "More than a few" rather than exactly fourteen: the point of a counter is
  // that sections can be added or moved without renumbering, and a total
  // pinned here would be the hand-maintained number all over again.
  //
  // `nth(5)` rather than `count()` because this has to be a *condition*, not a
  // reading. The marketing layout wraps its whole tree in
  // `<Suspense fallback={null}>`, so there is a window after `load` in which
  // this page has no `<main>` at all — `count()` sampled it once, got 0, and
  // failed a correct page. Waiting for the sixth rail to attach asserts the
  // same ">5" and cannot sample too early.
  await expect(rails.nth(5)).toBeAttached()

  // Safe to read now that the tree is attached, and the widths check below
  // needs the total.
  const count = await rails.count()

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

  // `evaluateAll` does not wait for anything — it returns `[]` when the
  // selector matches nothing, and `[].length > 5` is a failure that blames
  // the rails for a page that had not rendered yet. This marketing route
  // ships no `<main>` at all in its HTML (the layout's
  // `<Suspense fallback={null}>`), so the whole tree arrives on hydration and
  // every unguarded read of it is a race. One condition closes it.
  await expect(page.locator('.section-rail-line').nth(5)).toBeAttached()

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

  // `expect.poll`, not `expect(await …)`, and the difference is the whole
  // reason this test has now failed twice in a full run and never once on its
  // own. A bare `expect` on an awaited value reads the custom property exactly
  // once, in the same tick as the click — so what it actually asserts is that
  // React has *already* re-rendered, which is true on an idle machine and not
  // true with six other workers on the CPU. Polling asserts what the test
  // means: that the pill ends up under the chosen option.
  await options.nth(0).click()
  await expect.poll(pillIndex).toBe('0')

  await options.nth(1).click()
  await expect.poll(pillIndex).toBe('1')

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
/* Motion v2 — 17 §1 M1, the hero                                              */
/* -------------------------------------------------------------------------- */

test('splitting the headline does not cost the page its h1', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // The trap D33 wrote up, one level deeper. SplitText with `aria: 'auto'`
  // moves the original text onto the element it splits as an `aria-label` and
  // hides the pieces — so splitting the wrong element empties the heading's
  // accessible name, and the section pointing at it with `aria-labelledby`
  // loses its name too. Here only the fixed line is split, and the cycling
  // half must still be part of the name.
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toHaveCount(1)

  const name = await heading.evaluate((node) => (node.textContent ?? '').trim())
  expect(name).toContain('Original short video')
  expect(name.length).toBeGreaterThan('Original short video,'.length)

  // The section is named by it, so an empty h1 would take the landmark with it.
  await expect(page.locator('section[aria-labelledby="hero-heading"]')).toHaveCount(1)
})

test('the split never labels an element that may not carry a label', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // `aria: 'auto'` moves the split text onto the element as an `aria-label`.
  // On the `<h2>` the showcase heading splits that is permitted; on the plain
  // `<span>` the hero splits it is `aria-prohibited-attr` — a serious axe
  // violation, and how the lines branch came to use `aria: 'none'`.
  //
  // Asserted here as well as in the axe sweep because axe reports it as one
  // of many findings on a whole page, and this names the cause.
  const prohibited = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label]'))
      .filter((node) => {
        const role = node.getAttribute('role')
        if (role) return false
        // The elements where a label is allowed without an explicit role.
        return !/^(a|button|input|select|textarea|img|h[1-6]|nav|section|aside|form|dialog|table|summary|iframe|area|fieldset|figure|video|audio|ol|ul|li)$/i.test(
          node.tagName,
        )
      })
      .map((node) => `${node.tagName.toLowerCase()}[aria-label="${node.getAttribute('aria-label')}"]`),
  )

  expect(prohibited).toEqual([])
})

test('the hero headline rises without fading, because it is the LCP', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // Anchored, because the loop below asserts nothing at all on an empty
  // array: without the heading on screen this test passed by finding no text
  // to check, which is the worst way for a test to be green.
  await expect(page.locator('#hero-heading')).toBeVisible()

  // Text held at `opacity: 0` has not been painted, so a fade on the hero
  // headline moves Largest Contentful Paint by the whole duration of the
  // animation. Lines are masked and move instead — the same lesson
  // `mirrorline-reveal` carries in theme.css.
  const opacities = await page
    .locator('#hero-heading')
    .evaluateAll((nodes) =>
      nodes.flatMap((node) =>
        Array.from(node.querySelectorAll('*')).map((child) => getComputedStyle(child).opacity),
      ),
    )

  for (const opacity of opacities) {
    expect(Number.parseFloat(opacity)).toBeGreaterThan(0)
  }
})

test('the hero depth runs on three distinct depths, on a scroll timeline', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const depths = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const computed = getComputedStyle(element)
      return {
        depth: computed.getPropertyValue('--hero-depth').trim(),
        timeline: computed.animationTimeline,
        name: computed.animationName,
      }
    }
    return { glow: read('.hero-glow'), floats: read('.hero-floats'), inset: read('.hero-inset') }
  })

  for (const layer of [depths.glow, depths.floats, depths.inset]) {
    expect(layer).not.toBeNull()
    expect(layer?.name).toBe('mirrorline-hero-depth')
    // `scroll()`, not `view()`: the hero starts in the viewport, so a view
    // timeline would have spent a third of its travel before the reader
    // touched anything.
    expect(layer?.timeline).toContain('scroll')
  }

  // Three layers at one depth is not depth.
  const values = [depths.glow?.depth, depths.floats?.depth, depths.inset?.depth]
  expect(new Set(values).size).toBe(3)
})

test('under reduced motion the hero is a flat composition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  const states = await page.evaluate(() =>
    ['.hero-glow', '.hero-floats', '.hero-inset'].map((selector) => {
      const element = document.querySelector(selector)
      const computed = element ? getComputedStyle(element) : null
      return { selector, name: computed?.animationName, transform: computed?.transform }
    }),
  )

  for (const state of states) {
    // The whole depth block sits inside `no-preference`, so there is no
    // animation at all — the layers are still placed, just not moved.
    expect(state.name, state.selector).toBe('none')
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform)
  }
})

test('the floating cuts clear the inset preview and stay inside the hero', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const geometry = await page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector)
      return element ? element.getBoundingClientRect() : null
    }
    return {
      hero: box('section[aria-labelledby="hero-heading"]'),
      inset: box('.hero-inset'),
      floats: Array.from(document.querySelectorAll('.hero-float')).map((node) => {
        const rect = node.getBoundingClientRect()
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
      }),
    }
  })

  expect(geometry.hero).not.toBeNull()
  expect(geometry.inset).not.toBeNull()
  expect(geometry.floats).toHaveLength(3)

  const inset = geometry.inset!
  const hero = geometry.hero!

  for (const float of geometry.floats) {
    // The bug this exists for: at 1440x900 two cards sat on top of the inset
    // preview and the third ran off the bottom of the hero. Decoration that
    // covers the one frame a reader can actually watch is not decoration.
    const overlapsInset =
      float.left < inset.right &&
      float.right > inset.left &&
      float.top < inset.bottom &&
      float.bottom > inset.top
    expect(overlapsInset, 'a floating cut is sitting on the inset preview').toBe(false)

    // And they stay in the room: a card half-outside the hero reads as a
    // rendering fault rather than as depth.
    expect(float.bottom).toBeLessThanOrEqual(hero.bottom + 1)
    expect(float.top).toBeGreaterThanOrEqual(hero.top - 1)
  }
})

test('nothing decorative is drawn over the hero AI disclosure', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // Non-negotiable 4, as geometry. The sentence ran under the inset preview
  // and behind a floating card, and a label you cannot read is the same
  // failure as not having one — which is why it was moved above the index in
  // the first place. Both are decoration; the label outranks both.
  const overlaps = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll('p')).find((node) =>
      (node.textContent ?? '').includes('AI-generated sample frames'),
    )
    if (!label) return null

    // The *glyphs*, not the block. The paragraph is full width with padding
    // that keeps the text out of the inset's column, so its own box still
    // reaches the corner while nothing readable is under there. A Range gives
    // the rectangles the text actually occupies, line by line.
    const range = document.createRange()
    range.selectNodeContents(label)
    const textBoxes = Array.from(range.getClientRects())

    const hits = (selector: string) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.getBoundingClientRect())
        .filter((box) =>
          textBoxes.some(
            (text) =>
              box.left < text.right &&
              box.right > text.left &&
              box.top < text.bottom &&
              box.bottom > text.top,
          ),
        ).length

    return { inset: hits('.hero-inset'), floats: hits('.hero-float') }
  })

  expect(overlaps).not.toBeNull()
  expect(overlaps?.inset, 'the inset preview covers its own label').toBe(0)
  expect(overlaps?.floats, 'a floating cut covers the AI disclosure').toBe(0)
})

test('the hero labels its generated frames where a reader will meet them', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const hero = page.locator('section[aria-labelledby="hero-heading"]')

  // The floating cards duplicate three of the twelve frames the Output
  // section lists in full, so they are decoration and hidden.
  await expect(hero.locator('.hero-floats')).toHaveAttribute('aria-hidden', 'true')
  await expect(hero.locator('.hero-glow')).toHaveAttribute('aria-hidden', 'true')

  // The inset preview is not decoration: it is the one frame in the hero a
  // reader can look at, so non-negotiables 4 and 7 have to be answered on it
  // rather than by a sentence somewhere below.
  const inset = hero.locator('.hero-inset')
  await expect(inset).not.toHaveAttribute('aria-hidden', 'true')
  await expect(inset).toContainText('AI scene')
  await expect(inset).toContainText('Sample')

  // And the sentence that covers the cards, which cannot carry a label
  // themselves. It used to name only the room.
  await expect(hero).toContainText('AI-generated sample frames')
})

/* -------------------------------------------------------------------------- */
/* Motion v2 — 17 §3, the Output sequence                                      */
/* -------------------------------------------------------------------------- */

/** The wall is the fallback *and* the final state, so it is always all twelve. */
const CUT_COUNT = 12

/** Seven days at three a day — the cadence the gate section states in prose. */
const WEEK_SLOTS = 21

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
  const strip = await stage.locator('[data-week-strip] .output-week-note').innerText()
  const passedOnFrames = await page
    .locator('[data-cut-frame] [data-status-chip]')
    .evaluateAll(
      (nodes) =>
        nodes.filter((node) => (node.textContent ?? '').toLowerCase().includes('passed')).length,
    )

  expect(strip).toContain(`${passedOnFrames} passed`)
  expect(strip).toContain(`${CUT_COUNT - passedOnFrames} held`)

  // And now the strip draws the week rather than describing it, so the
  // drawing has to agree too: one filled slot per cut that passed, no more.
  // A seven-day grid is an easy place to round nine up to a tidier number.
  const filled = await stage.locator('[data-week-strip] .output-week-cut').count()
  const slots = await stage.locator('[data-week-strip] [data-week-slot]').count()
  expect(filled).toBe(passedOnFrames)
  expect(slots).toBe(WEEK_SLOTS)
})

/* -------------------------------------------------------------------------- */
/* Motion v2 — 17 §1 M4, M5, M6, M9                                            */
/* -------------------------------------------------------------------------- */

test('the funnel bars really are reached by the selector that animates them', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // `FunnelBar` lives in packages/ui, which CLAUDE.md keeps closed to anything
  // but bug fixes, so theme.css reaches its fills structurally:
  // `.funnel-grow span[aria-hidden='true'] > span`. That is a coupling to
  // markup this repo does not own, so it is tested rather than trusted — if
  // the component's structure moves, this fails instead of the bars quietly
  // never animating again.
  const funnel = page.locator('.funnel-grow')
  await funnel.scrollIntoViewIfNeeded()
  await expect(funnel).toHaveCount(1)

  const fills = await funnel.evaluate((node) =>
    Array.from(node.querySelectorAll("span[aria-hidden='true'] > span")).map((fill) => ({
      animationName: getComputedStyle(fill).animationName,
      origin: getComputedStyle(fill).transformOrigin,
    })),
  )

  expect(fills.length).toBeGreaterThan(2)
  for (const fill of fills) {
    expect(fill.animationName).toBe('mirrorline-bar-grow')
    expect(fill.origin.startsWith('0px')).toBe(true)
  }
})

test('the goal bar and sparklines move on the marketing preview only', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const bar = page.locator('.bar-grow').first()
  await bar.scrollIntoViewIfNeeded()

  const state = await bar.evaluate((node) => ({
    animationName: getComputedStyle(node).animationName,
    // The inline width stays the real figure; the scale reveals it. Animating
    // `width` instead would lay out on every frame.
    width: node.style.width,
  }))

  expect(state.animationName).toBe('mirrorline-bar-grow')
  expect(state.width).toMatch(/^\d+%$/)

  const sparks = await page
    .locator('.draw-line')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName))
  expect(sparks.length).toBeGreaterThan(0)
  for (const name of sparks) {
    expect(name).toBe('mirrorline-draw')
  }
})

test('the studio keeps its bars and sparklines still', async ({ page }) => {
  // The opt-in half of the two props above. PR4 is the marketing preview;
  // whether a dashboard someone works in all day should redraw itself on every
  // scroll is PR5's question, and a default-on prop would have answered it
  // silently across four studio screens.
  await page.goto('/app/home')

  // An absence proves nothing until the screen is actually there. Without
  // this anchor both assertions below pass on an empty document, which is
  // exactly what a slow first compile serves — a test that reports "no bars"
  // because it found no page.
  await expect(page.getByRole('heading', { level: 1, name: 'Good morning, Maya' })).toBeVisible()

  expect(await page.locator('.bar-grow').count()).toBe(0)
  expect(await page.locator('.draw-line').count()).toBe(0)
})

test('neither contrast column is ever dimmer than the muted token', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  const row = page.locator('.lit-row').first()
  await row.scrollIntoViewIfNeeded()

  // 17 §1 M5 asks for the "What you got" column to dim. `mirrorline-scroll-lit`
  // carries the warning from the axe failure that taught it: a view-timeline
  // animation holds its start state, so a row parked mid-range sits at that
  // contrast for as long as the reader leaves it there. So the contrast is
  // made by lighting the answer and striking the complaint, never by pushing
  // text below AA.
  const keyframes = await page.evaluate(() => {
    const found: string[] = []
    const walk = (list: CSSRuleList) => {
      for (const rule of Array.from(list)) {
        if (rule instanceof CSSKeyframesRule && rule.name === 'mirrorline-lit') {
          found.push(...Array.from(rule.cssRules).map((frame) => frame.cssText))
        }
        const grouping = rule as CSSGroupingRule
        if (grouping.cssRules) walk(grouping.cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walk(sheet.cssRules)
      } catch {
        // no cross-origin sheets to read
      }
    }
    return found
  })

  expect(keyframes.length).toBeGreaterThan(0)
  // It starts at the muted token and ends at the full one. Neither end is a
  // faded colour, and nothing here animates `opacity` on real text.
  expect(keyframes.join(' ')).toContain('--color-text-muted')
  expect(keyframes.join(' ')).not.toContain('opacity')

  // The strike line is decoration on a pseudo-element, never an <s>.
  expect(await page.locator('.lit-row s').count()).toBe(0)
  await expect(row.locator('.lit-before').first()).toBeVisible()
})

test('under reduced motion the argument sections are at their final state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  // M4's stacked deck is gone (D44), so there is no reduced-motion fallback
  // left to assert here: the 2026 cards are the three-column grid at every
  // width and under every motion preference. The test below keeps it so.

  const row = page.locator('.lit-row').first()
  await row.scrollIntoViewIfNeeded()
  const lit = await row.locator('.lit-after').first().evaluate((node) => ({
    animationName: getComputedStyle(node).animationName,
    color: getComputedStyle(node).color,
  }))
  // No animation at all, so the answer column is simply at its full colour.
  expect(lit.animationName).toBe('none')

  const strike = await row
    .locator('.lit-before')
    .first()
    .evaluate((node) => getComputedStyle(node, '::after').transform)
  // The strike never drew, so the complaint is plain text — which is the
  // final state a reader who asked for stillness should get.
  expect(['none', 'matrix(0, 0, 0, 1, 0, 0)']).toContain(strike)
})

/* -------------------------------------------------------------------------- */
/* Motion v2 — 17 §2, the studio                                               */
/* -------------------------------------------------------------------------- */

test('the nav markers sit exactly on the active item, and follow it', async ({ page }) => {
  await page.goto('/app/results')

  const read = () =>
    page.evaluate(() => {
      const of = (navLabel: string, axis: 'x' | 'y') => {
        const nav = document.querySelector(`nav[aria-label="${navLabel}"]`)
        const marker = nav?.querySelector<HTMLElement>('.nav-indicator')
        const active = nav?.querySelector<HTMLElement>('[aria-current="page"]')
        if (!marker || !active) return null
        return {
          offset: marker.style.getPropertyValue('--indicator-offset'),
          size: marker.style.getPropertyValue('--indicator-size'),
          actualOffset: `${axis === 'y' ? active.offsetTop : active.offsetLeft}px`,
          actualSize: `${axis === 'y' ? active.offsetHeight : active.offsetWidth}px`,
          hidden: marker.getAttribute('aria-hidden'),
        }
      }
      return { tabs: of('Results sections', 'x'), sidebar: of('Studio', 'y') }
    })

  const before = await read()
  // Measured, not counted: the tabs are all different widths, so an
  // index-times-a-width marker lands on the wrong one.
  expect(before.tabs?.offset).toBe(before.tabs?.actualOffset)
  expect(before.tabs?.size).toBe(before.tabs?.actualSize)
  expect(before.sidebar?.offset).toBe(before.sidebar?.actualOffset)

  // It is decoration; `aria-current` is what carries the selection.
  expect(before.tabs?.hidden).toBe('true')
  expect(before.sidebar?.hidden).toBe('true')

  await page.getByRole('link', { name: 'Agent insights' }).click()
  await expect(page).toHaveURL(/tab=insights/)

  const after = await read()
  expect(after.tabs?.offset).toBe(after.tabs?.actualOffset)
  expect(after.tabs?.size).toBe(after.tabs?.actualSize)
  // It really moved, rather than being re-rendered in place.
  expect(after.tabs?.offset).not.toBe(before.tabs?.offset)
})

test('the active nav item no longer paints its own fill', async ({ page }) => {
  await page.goto('/app/results')

  // The marker is the fill now. If the link kept `bg-accent-soft` as well, the
  // old block would still be sitting under the one that slides — two fills,
  // one of which never moves.
  const backgrounds = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav [aria-current="page"]')).map(
      (node) => getComputedStyle(node).backgroundColor,
    ),
  )

  expect(backgrounds.length).toBeGreaterThan(0)
  for (const background of backgrounds) {
    expect(background).toBe('rgba(0, 0, 0, 0)')
  }
})

test('reduced motion keeps the marker and drops only its travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/app/results')

  // Two of them, and that is correct: `StudioNav` renders in the desktop
  // sidebar and again in the mobile drawer, so the active state is worked out
  // in one place for both. CSS decides which is on screen.
  const markers = page.locator('nav[aria-label="Studio"] .nav-indicator')
  // Still drawn: where the selection is, is information.
  await expect(markers).toHaveCount(2)

  const durations = await markers.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).transitionDuration),
  )
  for (const duration of durations) {
    expect(toMs(duration)).toBeLessThanOrEqual(1)
  }
})

/* -------------------------------------------------------------------------- */
/* 17 §2 · KPI figures tick on arrival                                         */
/* -------------------------------------------------------------------------- */

test('the Results tabs count their figures and `/app/home` does not', async ({ page }) => {
  await page.goto('/app/results')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  expect(await page.locator('.count-figure').count()).toBeGreaterThan(0)

  // The other half of the prop, and the answer to the question PR4 left open:
  // a tab switch is an arrival worth confirming, the screen you land on and
  // stay on is not.
  await page.goto('/app/home')
  // Same anchor as above, for the opposite reason: "no counting figures" is
  // true of a correct home page and of no page at all.
  await expect(page.getByRole('heading', { level: 1, name: 'Good morning, Maya' })).toBeVisible()
  expect(await page.locator('.count-figure').count()).toBe(0)
})

test('a counting figure never hands assistive technology a half-counted number', async ({
  page,
}) => {
  await page.goto('/app/results')

  const figure = page.locator('.count-figure').first()
  await figure.scrollIntoViewIfNeeded()

  // Read it *during* the count. The visible digits are mid-flight; the
  // announced one must not be.
  const announced = await figure.evaluate(
    (node) => node.querySelector('.sr-only')?.textContent ?? '',
  )
  expect(announced).toMatch(/\d/)

  // And it lands exactly on the figure it was given — the reason the hook
  // interpolates against timestamps instead of stepping an interval.
  await expect
    .poll(async () =>
      figure.evaluate((node) => node.querySelector('[aria-hidden="true"]')?.textContent ?? ''),
    )
    .toBe(announced)
})

/* -------------------------------------------------------------------------- */
/* 17 §2 · The submit button morphs, then draws a checkmark                    */
/* -------------------------------------------------------------------------- */

/**
 * Hold the response open so the `sending` phase can be read, then release it.
 *
 * Nothing reaches `/api/niche-scan`, so the suite never stores a request.
 */
async function stubNicheScan(page: Page, delayMs: number) {
  await page.route('**/api/niche-scan', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
}

/**
 * Walk the four steps to the one with the submit button on it.
 *
 * The form became a stepper (19 v2 ★/niche-scan 2, D54), so the two fields
 * are never mounted at the same time and `.morph-submit` does not exist until
 * step four. These tests are about the button's morph rather than about the
 * form, so the walk is a helper and not the thing being asserted —
 * `niche-scan-stepper.spec.ts` owns the stepper's own behaviour.
 */
async function reachSubmitStep(page: Page) {
  await page.locator('#scan-niche').fill('A two-person bookkeeping practice for tradespeople')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click() // the goal, which has a default
  await page.getByRole('button', { name: 'Next' }).click() // the handles, which are optional
  await page.locator('#scan-email').fill('someone@example.com')
}

async function submitNicheScan(page: Page) {
  await reachSubmitStep(page)
  await page.locator('.morph-submit').click()
}

test('the submit button collapses to a spinner before it draws its mark', async ({ page }) => {
  await stubNicheScan(page, 1200)
  await page.goto('/niche-scan')

  // The walk comes first now: the submit button is on step four, so there is
  // no resting width to measure until the form has got there.
  await reachSubmitStep(page)

  const button = page.locator('.morph-submit')
  await button.scrollIntoViewIfNeeded()
  const resting = await button.evaluate((node) => node.getBoundingClientRect().width)
  expect(resting).toBeGreaterThan(120)

  await button.click()

  // Mid-sequence, not end state. Every browser-only bug in PRs 2–4 was
  // something that was right at the end and wrong in the middle.
  await expect(button).toHaveAttribute('data-morph', 'sending')

  // Polled, not sampled once: the label fades over `--duration-press`, so
  // reading it the instant the attribute flips catches it part-way down and
  // says nothing about where it ends up. What matters is that it gets there
  // while the request is still in flight — the label is gone *before* the
  // mark arrives, not at the same time as it.
  await expect
    .poll(async () =>
      button.evaluate((node) => {
        const label = node.querySelector('.morph-submit__label') as HTMLElement
        return getComputedStyle(label).opacity
      }),
    )
    .toBe('0')
  await expect(button).toHaveAttribute('data-morph', 'sending')

  const sending = await button.evaluate((node) => {
    const spinner = node.querySelector('.morph-submit__spinner') as HTMLElement
    return {
      width: node.getBoundingClientRect().width,
      spinnerAnimation: getComputedStyle(spinner).animationName,
      spinnerOpacity: getComputedStyle(spinner).opacity,
    }
  })

  expect(sending.width).toBeLessThan(resting)
  expect(sending.spinnerAnimation).toBe('mirrorline-morph-spin')
  expect(sending.spinnerOpacity).toBe('1')

  await expect(button).toHaveAttribute('data-morph', 'done')
  const drawn = await button.evaluate((node) => {
    const check = node.querySelector('.morph-submit__check') as HTMLElement
    return {
      animation: getComputedStyle(check).animationName,
      opacity: getComputedStyle(check).opacity,
    }
  })
  expect(drawn.animation).toBe('mirrorline-morph-draw')
  expect(drawn.opacity).toBe('1')

  // The mark is a beat, not the destination: the thank-you still arrives.
  await expect(page.getByRole('heading', { name: 'That is with us.' })).toBeVisible()
})

test('under reduced motion the mark is already drawn, and the form still settles', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // Long enough to read the button while it is still on screen. Under reduced
  // motion the hand-off is immediate, so the `done` phase cannot be sampled
  // after the fact — the form has already replaced it.
  await stubNicheScan(page, 1200)
  await page.goto('/niche-scan')

  await submitNicheScan(page)
  await expect(page.locator('.morph-submit')).toHaveAttribute('data-morph', 'sending')

  const sending = await page.locator('.morph-submit').evaluate((node) => {
    const label = node.querySelector('.morph-submit__label') as HTMLElement
    const spinner = node.querySelector('.morph-submit__spinner') as HTMLElement
    return {
      buttonTransition: getComputedStyle(node).transitionDuration,
      labelTransition: getComputedStyle(label).transitionDuration,
      spinnerAnimation: getComputedStyle(spinner).animationName,
    }
  })

  // No travel. The button is simply already the circle.
  expect(toMs(sending.buttonTransition)).toBeLessThanOrEqual(1)
  expect(toMs(sending.labelTransition)).toBeLessThanOrEqual(1)
  expect(sending.spinnerAnimation).toBe('none')

  // And the final state is the finished one, not a frozen first frame: the
  // thank-you arrives, which is the whole point of the sequence.
  await expect(page.getByRole('heading', { name: 'That is with us.' })).toBeVisible()
})

test('the 2026 cards are a grid, and nothing is left of the deck', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // The grid is established first, so the absence below is an absence from a
  // page that exists. Checked the other way round, "no deck" was also true of
  // a page that had not rendered.
  const cards = page.locator('#changed-heading').locator('xpath=../../..').locator('ol > li')
  await expect(cards).toHaveCount(3)

  // D44. Asserted rather than assumed, because a reverted effect leaves two
  // things behind that both look harmless: a class on an element and a block
  // of CSS nothing matches. Either one invites the next person to "finish"
  // the half of it they found.
  expect(await page.locator('.stack-cards').count()).toBe(0)

  const positions = await cards.evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).position),
  )
  for (const position of positions) {
    expect(position).toBe('static')
  }

  // The weight that replaced the stacking: an icon per card, and the
  // headline on the title scale rather than the subtitle one.
  await expect(cards.locator('svg[aria-hidden="true"]').first()).toBeAttached()
})

/* -------------------------------------------------------------------------- */
/* 17 §1 M10 · One oversized word, on one band                                 */
/* -------------------------------------------------------------------------- */

test('the oversized word is on exactly one band, and is decoration', async ({ page }) => {
  await page.goto(FAQ_PAGE)

  // "Trial on one band first" is the instruction the spec gives after
  // offering two or three, and it is the one being followed. If a second
  // appears, that was a decision and this test should be the thing that makes
  // someone say so out loud.
  await expect(page.locator('.band-word')).toHaveCount(1)

  const word = page.locator('.band-word')
  await word.scrollIntoViewIfNeeded()

  const state = await word.evaluate((node) => {
    const style = getComputedStyle(node)
    const band = node.closest('section') as HTMLElement
    return {
      ariaHidden: node.getAttribute('aria-hidden'),
      pointerEvents: style.pointerEvents,
      zIndex: style.zIndex,
      animationName: style.animationName,
      timeline: style.animationTimeline,
      bandOverflow: getComputedStyle(band).overflow,
    }
  })

  expect(state.ariaHidden).toBe('true')
  expect(state.pointerEvents).toBe('none')
  expect(state.zIndex).toBe('0')
  expect(state.animationName).toBe('mirrorline-word-drift')
  expect(state.timeline).toBe('view()')
  // `clip`, never `hidden`. `hidden` makes the band a scrollport, and a
  // `view()` timeline measured against the band it cannot move within freezes
  // at a constant progress — the note is on `Section.backdrop`, and this is
  // what keeps it true.
  expect(state.bandOverflow).toBe('clip')
})

test('the word never costs the text over it its contrast', async ({ page }) => {
  await page.goto(FAQ_PAGE)
  await page.locator('.band-word').scrollIntoViewIfNeeded()

  // Composite the word's colour onto the band and re-measure the heading and
  // the lead against it. A decorative layer under text is the one way this
  // device can break 17's "dim states stay ≥ 4.5:1", and axe cannot see it:
  // it reads declared background colours, not what a translucent span above
  // one does to the pixels underneath.
  const ratios = await page.evaluate(() => {
    const channel = (value: number) => {
      const c = value / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    const luminance = ([r, g, b]: number[]) =>
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    const ratio = (a: number[], b: number[]) => {
      const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (high + 0.05) / (low + 0.05)
    }

    const word = document.querySelector('.band-word') as HTMLElement
    const band = word.closest('section') as HTMLElement
    const bandStyle = getComputedStyle(band)
    const bandBackground = parse(
      bandStyle.backgroundColor === 'rgba(0, 0, 0, 0)'
        ? getComputedStyle(document.body).backgroundColor
        : bandStyle.backgroundColor,
    )

    // The word paints its own colour at whatever alpha the stylesheet set.
    const wordColor = getComputedStyle(word).color
    const alpha = Number(wordColor.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? '1')
    const washed = parse(wordColor).map(
      (c, index) => c * 255 * alpha + bandBackground[index] * (1 - alpha),
    )

    const heading = document.querySelector('#gate-heading') as HTMLElement
    const lead = band.querySelector('p') as HTMLElement
    return {
      alpha,
      heading: ratio(parse(getComputedStyle(heading).color), washed),
      lead: ratio(parse(getComputedStyle(lead).color), washed),
    }
  })

  // Low enough to be a wash rather than a layer.
  expect(ratios.alpha).toBeLessThanOrEqual(0.1)
  expect(ratios.heading).toBeGreaterThanOrEqual(4.5)
  expect(ratios.lead).toBeGreaterThanOrEqual(4.5)
})

test('under reduced motion the word is still there, and still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(FAQ_PAGE)

  const word = page.locator('.band-word')
  // Present: it is a composition, not an animation. Only the drift goes.
  await expect(word).toHaveCount(1)
  await word.scrollIntoViewIfNeeded()
  expect(await word.evaluate((node) => getComputedStyle(node).animationName)).toBe('none')
})

/* -------------------------------------------------------------------------- */
/* 17 §1 M11 · Between marketing pages                                         */
/* -------------------------------------------------------------------------- */

/**
 * Count the transitions a navigation starts, and name the animations it runs.
 *
 * Installed before any page script, so the component's own `typeof` check at
 * mount and its call at click time both see the same patched function.
 */
async function instrumentViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const record = { started: 0, animations: [] as string[] }
    ;(window as unknown as { __transitions: typeof record }).__transitions = record

    const original = document.startViewTransition?.bind(document)
    if (!original) return

    document.startViewTransition = ((callback: () => void | Promise<void>) => {
      record.started += 1
      const transition = original(callback)
      // `ready`, not a timer. The pseudo-element tree does not exist until
      // the callback's promise settles, and how long that takes is how long
      // the new route takes to render — fast on a built preview, not fast on
      // `next dev`. A fixed sample caught nothing there and said the
      // animations were missing when they were merely late.
      transition.ready.then(
        () => {
          record.animations = document
            .getAnimations()
            .filter((animation) =>
              String(animation.effect?.pseudoElement ?? '').includes('view-transition'),
            )
            .map((animation) => (animation as CSSAnimation).animationName)
        },
        () => {
          // A skipped transition rejects `ready`. Leaving the list empty is
          // the correct report.
        },
      )
      return transition
    }) as typeof document.startViewTransition
  })
}

function transitionRecord(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __transitions: { started: number; animations: string[] } })
        .__transitions,
  )
}

test('a marketing navigation runs the page transition', async ({ page }) => {
  await instrumentViewTransitions(page)
  await page.goto(FAQ_PAGE)

  await page.locator('header a[href="/pricing"]').first().click()
  await expect(page).toHaveURL(/\/pricing$/)

  // Polled rather than slept: the transition becomes ready when the new route
  // has rendered, and that is a different length of time on a dev server and
  // on a built one.
  await expect.poll(async () => (await transitionRecord(page)).animations.length).toBeGreaterThan(0)

  const record = await transitionRecord(page)
  expect(record.started).toBe(1)
  // Named, not merely started. The first version of this component started
  // nothing at all and the navigation still worked perfectly — which is
  // exactly why "the URL changed" is not the assertion.
  expect(record.animations).toContain('mirrorline-page-out')
  expect(record.animations).toContain('mirrorline-page-in')
})

test('the studio keeps its instant arrival', async ({ page }) => {
  await instrumentViewTransitions(page)
  await page.goto('/app/results')

  // `studio-nav.tsx` carries the rule: people move between these screens
  // dozens of times a day, and a transition on one reads as lag rather than
  // as feedback. The component is mounted by the marketing layout, so it is
  // not even here — and this is the test that notices if it is moved up.
  await page.locator('nav[aria-label="Studio"] a[href="/app/calendar"]').first().click()
  await expect(page).toHaveURL(/\/app\/calendar$/)
  await page.waitForTimeout(400)

  expect((await transitionRecord(page)).started).toBe(0)
})

test('reduced motion navigates without a transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await instrumentViewTransitions(page)
  await page.goto(FAQ_PAGE)

  await page.locator('header a[href="/pricing"]').first().click()
  // The navigation still happens. That is the half worth asserting: a
  // transition that is switched off must not take the page with it.
  await expect(page).toHaveURL(/\/pricing$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect((await transitionRecord(page)).started).toBe(0)
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

/* ---------------------------------------------------------------------------
   M8 · the progress spine and the metric each agent owns
   --------------------------------------------------------------------------- */

/** Seven, and the spine joins them with one segment fewer. */
const PUBLIC_AGENT_COUNT = 7

test('every agent names the metric it owns, with motion off', async ({ page }) => {
  // The assertion M8 exists to not fail. The stage reveals the metric one
  // agent at a time as the pin advances, which is the effect asked for — but
  // 17 §Accessibility says no information is visible only through motion, so
  // the ladder carries all seven whatever the reader's preference. With
  // reduced motion the pin never starts, so if the metrics lived only on the
  // stage this would find six missing.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const owned = page.getByText(/^Owns /)
  await expect(owned.first()).toBeVisible()
  // Seven in the ladder. The stage carries an eighth copy of the current
  // agent's line, but it is `aria-hidden` and `lg`-only, so this floor is
  // about the ladder rather than an exact count.
  expect(await owned.count()).toBeGreaterThanOrEqual(7)
})

test('the spine reports no progress before the sequence has any', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  // With no pin there is no sequence being walked, so a filled spine would be
  // reporting a position that does not exist. Six segments join seven agents,
  // and every one of them is empty.
  const fills = page.locator('[data-agent-spine-fill]')
  await expect(fills).toHaveCount(PUBLIC_AGENT_COUNT - 1)
  await expect(page.locator('[data-agent-spine-fill="filled"]')).toHaveCount(0)
})

/* ---------------------------------------------------------------------------
   M12 · the gold sweep across the closing CTA
   --------------------------------------------------------------------------- */

test('the CTA sweep runs on the scroll timeline and never clips the button', async ({ page }) => {
  await page.goto('/pricing')

  const band = page.locator('.cta-sweep-band')
  await expect(band).toHaveCount(1)

  // Decorative in full. A moving light that announced itself would be a
  // screen reader reading a shimmer aloud.
  await expect(band).toHaveAttribute('aria-hidden', 'true')

  const style = await band.evaluate((element) => {
    const after = getComputedStyle(element, '::after')
    const box = getComputedStyle(element)
    return {
      animationName: after.animationName,
      pointerEvents: box.pointerEvents,
      overflow: box.overflow,
      parentOverflow: getComputedStyle(element.parentElement as Element).overflow,
    }
  })

  expect(style.animationName).toBe('mirrorline-cta-sweep')
  // It clips its own band...
  expect(style.overflow).toBe('hidden')
  // ...and the button's own box does not, so the focus ring is never cropped.
  // This is the assertion that catches somebody "simplifying" the band into a
  // wrapper: it looks identical on screen and quietly eats the ring.
  expect(style.parentOverflow).toBe('visible')
  expect(style.pointerEvents).toBe('none')
})

test('under reduced motion the CTA button carries no sweep at all', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/pricing')

  // 17 §5: every animated section shows its final state. This one's final
  // state is a button with nothing over it, so the band paints nothing —
  // unlike the FAQ panel above, which has to keep its animation *named*
  // because Radix waits on `animationend`. Nothing waits on this one.
  const animationName = await page
    .locator('.cta-sweep-band')
    .evaluate((element) => getComputedStyle(element, '::after').animationName)

  expect(animationName).toBe('none')
})

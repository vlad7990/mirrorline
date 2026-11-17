# 17 — Motion plan v2: macro, micro, parallax and the Output section

Builds on docs/design/MOTION_STUDY.md (Arigo study) and D35 (pinned agent loop). New references from Vlad on 13 Nov 2026:
- **Arigo** (arigo-reactjs.vercel.app): numbered section rails, scroll-lit lists, stacked pinned cards, layered image collage that scales on scroll, oversized background words, split-text reveals.
- **Aura WebStudios Figma templates** (template 45): cinematic full-bleed imagery, editorial headline over the image, small inset preview card in the corner, thin top nav.

## Rules

Amended 13 Nov 2026 by **D41**, which is why this heading no longer says
"unchanged": the second bullet used to read "No GSAP / ScrollSmoother /
Lenis". Vlad's decision allows the first of those three, on the marketing site
only. The rest of this section stands as written.

- **Motion is unlocked; the look is not.** The palette, fonts, glass-box cards and tokens stay as they are. This plan changes how things move, layer and reveal.
- **GSAP is allowed here, and only here.** `gsap` core, ScrollTrigger, SplitText and `@gsap/react` (`useGSAP`), on the **public marketing site only** (D41, under the GSAP Standard No-Charge licence). Not in the studio app, `packages/ui`, the Remotion templates or any customer-facing animation tooling — those keep to CSS and `motion` (MIT, cleared in D19). **ScrollSmoother and Lenis stay banned everywhere**, marketing included: they were the scroll-hijacking half of the original rule, and that half did not change. Both halves are gated by `pnpm licence-check`.
- **Reach for CSS first anyway.** `animation-timeline: view()/scroll()` costs no dependency and no JavaScript, so a working CSS implementation is not replaced with GSAP for its own sake — the D33 argument, still true. GSAP earns a section only where CSS cannot go: splitting text into lines, a long pinned timeline with ordered steps, or shared-element flight between two layouts.
- **Native scroll only.** No scroll-jacking. Pinned sections use `position: sticky`, or ScrollTrigger's `pin`, which keeps the browser's own scroll.
- **GSAP loads on marketing routes only** — dynamically, inside the component that needs it, never from a shared layout or a barrel file the studio could reach.
- **Cleanup is not optional:** `useGSAP` for every timeline and trigger, so a route change cannot leave one running.
- **Reduced motion is `gsap.matchMedia()`**, scoped to `(prefers-reduced-motion: no-preference)`, with a Playwright test asserting that every animated section shows its **final** state when reduced motion is on.
- **Reduced motion:** every effect has a static fallback under `prefers-reduced-motion: reduce`. Parallax off, reveals become instant, counters show final values.
- **Accessibility:** dim states stay ≥ 4.5:1. No information is visible only through motion. Focus states are never animated away.
- **Performance budget:** animate only `transform`, `opacity`, `filter` and `clip-path`. CLS 0, INP < 200 ms, LCP unchanged. Added JS < 30 KB gzipped. Parallax layers get `will-change` only while on screen. Images are WebP/AVIF and lazy.
- **Honesty:** every image or video is either sample data (labelled) or AI-generated (labelled). No fake logos or testimonials.

## Motion tokens (add to the existing ones, don't replace them)

| Token | Value | Use |
|---|---|---|
| `--ease-out-expo` | cubic-bezier(0.16, 1, 0.3, 1) | Reveals, card entrances |
| `--ease-in-out-quint` | cubic-bezier(0.83, 0, 0.17, 1) | Pinned transitions |
| `--dur-micro` | 160 ms | Hover and press |
| `--dur-reveal` | 600 ms | Section reveals |
| `--stagger` | 60 ms | Lists and grids |
| Parallax depths | back 0.15 · mid 0.35 · front 0.6 | Translate-Y factor relative to scroll |

## 1. Macro animations (page level)

| # | Where | Effect | How |
|---|---|---|---|
| M1 | Hero | **Layered depth parallax:** background image (slow), gold glow and grain (mid), 3 floating 9:16 "cut" cards with captions (fast, slight rotation). The headline splits into lines and rises in. A cinematic **inset preview card** (Aura) in the bottom-right corner plays a sample cut on loop, labelled "Sample". | CSS `scroll()` timeline for depth; split-line reveal on load; the card is muted, autoplays and pauses off-screen and under reduced motion |
| M2 | Every section | **Numbered section rail** (Arigo "01 —— What we do"): index + thin line + label. The line fills gold as the section passes through view. | `view()` timeline on `scaleX` |
| M3 | Sound familiar? | Cards rise in a stagger. Opening one morphs its height smoothly and rotates its icon. | `motion` layout animation |
| M4 | What changed in 2026 | **Stacked pinned cards:** the three rule cards stack on top of each other as you scroll (Arigo "Latest work"). | sticky + `view()` scale/translate |
| M5 | We built the opposite | **Scroll-lit rows:** as each row reaches the middle, "What you got" dims and gets a thin strike line, and "What we do" lights to full. | `view()` range `cover 35%–65%` on color/opacity |
| M6 | Any niche | Recipe card "assembles": hook, beats and CTA chips slide in one by one, then the fit score counts up. | `view()` + CountUp on entry |
| M7 | **Output** | Full rebuild: see section 3 | — |
| M8 | Seven agents | Keep D35's pin. Add a progress spine down the left and the metric each agent owns appearing as its card activates. | existing pin + `view()` |
| M9 | Metrics preview | Goal bar fills, KPI numbers count, sparklines draw (stroke-dashoffset), funnel bars grow one after another. All on entry, not on mount. | `view()` + CountUp |
| M10 | Two or three bands | **Oversized background words** ("ORIGINAL", "OWNED", "PROVEN") at very low contrast, moving slower than the content. Trial on one band first. | sticky layer + `view()` translateX |
| M11 | Between pages | **View Transitions:** short cross-fade and slide between marketing pages. The pricing card morphs into the checkout header. | View Transitions API with fallback |
| M12 | Final CTA | A gold light sweeps across the button once on entry, then rests. | CSS mask animation, runs once |

## 2. Micro-interactions (component level)

- **Buttons:** arrow slides and rotates on hover (MOTION_STUDY item 5). The primary CTA gets a subtle magnetic pull of 4 px max (desktop pointer only). Press scales to 0.98.
- **Account picker** (Business/Individual × New/Existing): the selection pill slides between options (`layoutId`), and the examples below cross-fade to match.
- **Cards:** on hover, the gold border brightens and the light follows the pointer (radial gradient at pointer position). No lift on cards that aren't links (D31).
- **Forms (Niche Scan, contact):** gold focus ring fades in; inline validation slides down; on submit the button morphs into a spinner, then a drawn checkmark.
- **App sidebar and Results tabs:** the active indicator slides between items (`layoutId`). Tab content cross-fades; numbers tick to new values on tab switch.
- **KPI cards:** the info icon reveals the definition with a 160 ms fade. "Not connected" pulses the connect button once, then stops.
- **Calendar:** drag shows a ghost card and the drop slot highlights; approve shows a check sweep. On mobile, swipe right approves and left holds (with button fallbacks).
- **Loading:** skeleton shimmer in gold-tinted neutrals. Toasts slide in from the bottom-right.
- **Hover-reveal list** (Arigo services) on /product: large agent names; hovering one shows a small floating preview card that follows the pointer (desktop only; static on touch).

## 3. The Output section ("One episode, twelve cuts"): rebuild as a pinned multiply sequence

Today it is a grid of cards with one blurred image layer behind it. It should *show* the product's core promise: one long video becomes many original cuts.

**Sequence (pinned, about 250 vh of scroll):**
1. **Episode:** a wide 16:9 player with a 52:14 timeline bar. A playhead scans the waveform, and 12 moments light up as gold markers.
2. **Lift:** each marker lifts out of the timeline and flies into a 9:16 frame (shared-element animation), staggered.
3. **Shape:** the frames settle into a fanned deck, then a grid of 12. Each frame gets its hook caption typed on, a length chip, and a format tag.
4. **Gate:** a scanning line sweeps across the grid. 9 frames get a green "Passed" stamp and 3 get an amber "Held for you" stamp, matching the gate section's numbers.
5. **Schedule:** the passed frames slide into a mini week calendar strip at the bottom: "Posting Mon–Sun, 3 a day".

**Depth (real parallax, not one image):**
- **Back layer (0.15):** blurred frames from the episode, very dark.
- **Mid layer (0.35):** the 9:16 frames.
- **Front layer (0.6):** caption chips, stamps and the playhead.
- **Desktop pointer tilt:** ±4° on the deck, off for touch and reduced motion.

**Fallbacks:**
- **Reduced motion:** the final grid with stamps, shown statically.
- **Mobile:** the pin is shortened (about 150 vh); the frames form a horizontal snap-scroll row instead of a grid.

All frames use the existing sample cut images (/reels/cut-01…), labelled "Sample data". Generate 4 more AI frames if needed (labelled), never stock faces of real people.

## 4. Imagery needed for parallax

- Hero depth: cut-out layers from the existing AI hero image (background, glow, foreground) plus 3 floating cut cards.
- Output: the existing 8 cut frames + 4 new AI frames.
- Background words: type only, no images.
All AI images labelled as such in a caption or alt text.

## 5. Acceptance

- Before/after screen recordings (desktop and mobile, 10–15 s each) of the hero, the Output sequence, the scroll-lit rows and the metrics preview, saved to docs/screens-built/motion-v2/.
- Lighthouse performance ≥ 90 on mobile for /. CLS 0.
- axe: 0 serious or critical, in both themes and with reduced motion on.
- A Playwright test that, under reduced motion, every animated section shows its final state.

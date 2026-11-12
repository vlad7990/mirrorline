# Motion study: Arigo, and what we can take from it

Vlad supplied <https://arigo-reactjs.vercel.app/> on 2026-11-12 and asked what
transitions, automations and components would modernise our site.

This is not a competitor. It is **"Arigo — Creative Agency & Portfolio React JS
Template"**, a commercial theme. That matters for how it is read: a template is
built to demo well in sixty seconds to a designer deciding whether to buy it,
which is a different job from selling a retainer to a coach who has been burned
by a growth agency before. Some of its devices are excellent and some exist to
impress other designers. They are separated below.

Measured rather than described, the same way
`docs/design/COMPETITOR_REFERENCES.md` treats the five competitor sites.

---

## The headline: we cannot use its stack

| | |
|---|---|
| Motion engine | **GSAP** + **ScrollTrigger** + **ScrollSmoother** + **SplitText** |
| Carousels | Swiper |
| Physics | matter.js |
| Rendering | Vite SPA, **no SSR** — the served HTML is 608 bytes |
| JS bundle | **775 KB** uncompressed, one chunk |
| Images | **2.39 MB** across 43 files, largest 417 KB |
| `prefers-reduced-motion` | **0 occurrences in the bundle** |

**GSAP is already rejected** in `docs/plan/DESIGN_BACKLOG.md` — its licence is
not on CLAUDE.md non-negotiable 10's allowlist (MIT, Apache-2.0, BSD, ISC,
MPL-2.0). That stays true now GSAP is free of charge: free is not the same as
permissively licensed, and SplitText and ScrollSmoother are GSAP plugins under
the same terms.

So **every technique below has to be reimplemented**, not installed. In
practice that is less painful than it sounds, because we already own the two
tools that cover most of it: `animation-timeline: view()` (in use, zero JS,
run off the main thread) and `motion@14.12.0` (MIT, cleared in D19, still not
installed because nothing has needed it yet).

### Three things we must not copy

1. **ScrollSmoother.** It hijacks the scroll. `DESIGN_BACKLOG.md` already
   declined Lenis for exactly this reason — it overrides native scrolling and
   is an accessibility risk. Nothing about Arigo changes that argument.
2. **Zero reduced-motion handling.** Searching its bundle for
   `prefers-reduced-motion` returns nothing; its `matchMedia` calls are
   breakpoints. We run 36 axe checks, `ReelMedia` refuses to play under
   reduced motion, and `theme.css` gates every scroll reveal behind
   `@media (prefers-reduced-motion: no-preference)`. Their floor is below ours
   and we are not lowering ours to match.
3. **Its proof devices.** The logo wall, "99+ client satisfaction rate",
   "250+ projects completed", testimonials with faces. Non-negotiable 7
   forbids all of it and we have no customers to draw real ones from. This is
   the same wall D21 hit, and the capacity bar is still our answer.

---

## What is genuinely worth taking

Ranked by value to us, not by how impressive the demo is.

### 1. The scroll-lit list — strongest fit, and we already have the content

Their services section is a column of very large words sitting at low
contrast, each lighting to full white as it reaches the middle of the
viewport, with supporting imagery drifting in at the sides. It turns a list
into a sequence read at the pace you scroll.

**Why it fits us.** We have ideal content for it and currently render it as a
static ladder: the **seven agents**. Trend Scout → Remake Producer →
Multiplier → Compliance → Client Concierge → Publisher → Performance Analyst
is already a hand-off, already ordered, and already the clearest explanation
of what the product is. "Scroll-telling" is the one thing `DESIGN_BACKLOG.md`
still lists as untouched under macro animation.

**How, without GSAP.** `animation-timeline: view()` with a range like
`cover 35% cover 65%`, animating `color` on each row. No JavaScript. One
constraint we already know from `mirrorline-reveal`: a view-timeline animation
**holds its start state**, so the dim state must stay above 4.5:1 or axe will
fail it — and would be right to. Dim-to-bright is fine; invisible-to-visible
is not.

### 2. Numerals that count as they arrive

Their stat quadrant counts 250+ / 120+ / 140+ / 15+ on entry.

**We already have `CountUp`** (`apps/web/components/marketing/count-up.tsx`)
on the proof metrics, so this is not a new device. It is a reminder to check
ours triggers on *entry* rather than on mount — the exact bug D30 found in the
cut wall, where `.log-in` fired twelve sections below the fold and was over
before anyone saw it. Worth auditing for the same class of error.

### 3. Oversized section words as a background layer

Behind each project card, "LATEST" and "WORK" sit at the left and right
margins in huge type, travelling at a different rate from the cards.

**Where it suits us.** The showcase marquee and the proof section already run
full-bleed. A very large, very quiet word behind a band gives the page
structure at a glance without adding a claim — rare for us, since most
"catchy" devices turn out to be claims. Pure CSS: a `position: sticky` layer
translated by the same view timeline.

**The risk.** It is decoration, and DESIGN.md's register is "an instrument,
not consumer software". Worth one trial on a single band before it spreads.

### 4. The card that splits image and detail

Their work cards are a 50/50 split: full-bleed image left, title plus metadata
plus one action right, with a large index numeral. It reads as a record rather
than an advert.

**Where it suits us.** Close to what the trust page became in `4c09249` (rule
left, meaning right), and it is the shape the **home audience cards** still
need. Those four are the last flat stack, and D31's note stands: they are not
interactive, so a hover-lift would lie about them. An image/detail split is
structure rather than fake affordance, and it gives them the thing they
actually lack — something to look at.

### 5. Arrow buttons that resolve on hover

Their primary buttons carry a circular arrow that slides and rotates on hover.
Small, cheap, and the one micro-interaction on the page that is about feedback
rather than spectacle.

**Where it suits us.** `SiteCta`, the header's "Book a private demo", and the
"Next: …" page links. Honest, because those genuinely are links. One
transform, respects reduced motion, no dependency. This is the kind of thing
`DESIGN_BACKLOG.md` means by "nothing that reads as craft".

---

## What we should decline, with reasons

| Device | Why not |
|---|---|
| Full-screen overlay menu | We have five pages and a visible nav. Hiding navigation behind a click suits a portfolio with little to say; it is wrong for a site whose job is answering "is this legitimate". |
| Custom cursor | Replaces a system affordance with a decorative one. Hurts anyone relying on pointer size or contrast settings, and does nothing for a phone visitor. |
| matter.js physics | A six-figure-byte dependency for a toy. No argument for it on a page about compliance. |
| Scattered-image collage | Needs a library of attractive stock imagery. Ours is one fictional client's podcast, and inventing more drifts toward implying customers we do not have. |
| Swiper carousels | We have the marquee already, hand-rolled, and a carousel hides content behind an interaction. |

---

## Recommended order

1. **The scroll-lit agent list.** Highest value, best content fit, closes the
   last open "macro animation" row, needs no dependency.
2. **Arrow micro-interaction** on the real links. Small, no risk.
3. **Audience cards as image/detail splits.** Clears the last flat stack.
4. **Oversized background word**, one band only, as a trial.

Items 1–3 are CSS plus existing components. If anything here ever needs real
spring physics or layout animation, `motion@14.12.0` is the cleared route
(D19) — none of items 1–4 do.

**The honest summary.** Arigo is more eye-catching than our site and will stay
that way, because much of its appeal is stock imagery and social proof we are
not allowed to fake. What we can take is its **pacing**: it gives the reader
one thing at a time and lets the scroll set the rhythm. That is a structural
idea, it costs no dependency, and it needs no claim we cannot stand behind.

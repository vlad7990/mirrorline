# Five reference sites, measured

Vlad supplied these on 2026-11-11 as design references to borrow approach and
structure from:

- https://becreatives.co/ — done-for-you editing retainer (closest to our
  business model, not our product)
- https://www.opus.pro/ — OpusClip, AI clipping
- https://www.submagic.co/ — AI shorts editing
- https://vizard.ai/ — AI clipping (closest to our product)
- https://repurpose.io/ — cross-posting automation (closest to our Publisher)

Everything below is measured off the live pages with Playwright, not eyeballed.
Screenshots in `./references/`.

---

## 1. The measurements

| | beCreatives | OpusClip | Vizard | Submagic | **Mirrorline** |
|---|---|---|---|---|---|
| h1 size @1440 | **128px** | 60px | 88px | 48px | **72px** |
| h1 leading | 1.0 | 0.96 | 1.0 | 1.1 | **1.0** |
| h1 tracking | normal | −0.04em | +0.011em | −0.04em | **−0.03em** |
| h1 weight | 700 | 600 | 400 | 600 | **700** |
| heading face | NeutrifPro | **Geist** | Vizard-Title | Inter | **Geist** |
| body size | **22px** | 16px | 16px | 16px | 16px |
| page ground | #F7F7F7 / dark hero | #000 | purple gradient | #FFF | light + dark |
| fluid `clamp()` rules | 10 | 4 | **0** | 3 | yes |
| `<video>` on page | 0 (lazy) | 5 | **13** | 1 | **0** |
| …vertical 9:16 | 0 | 0 | **10** | 0 | **0** |
| …autoplay+loop+muted | – | 5 | 13 | 1 | – |
| …with `poster` | – | 4 | 0 | 0 | – |
| thumb corner radius | – | – | **24px** | – | **6px** |
| motion stack | CSS only | **GSAP** + Swiper | CSS only | marquee only | CSS `view()` |
| platform | Astro | Webflow | custom | custom | Next.js |

### What this says, bluntly

**Our type is not the problem.** The recurring complaint has been that the
fonts "look like 2001". Measured, our hero is 72px at leading 1.0 and tracking
−0.03em in Geist — the same recipe as OpusClip (Geist, 0.96, −0.04em), and
larger than both OpusClip and Submagic. We are mid-pack, not dated. Chasing
the type scale further is the wrong fix and has already been tried twice.

**The real gap is video, and it is total.** Vizard runs 13 autoplaying loops,
ten of them 9:16. OpusClip runs 5. We run zero. That single row explains the
"not catchy" complaint better than any type measurement, and it is the thing
named twice in `../plan/DESIGN_BACKLOG.md`.

**Second real gap: corner radius.** Vizard's clip tiles are 24px. Ours are 6px
(`--radius-thumb`). At 9:16, a 6px corner reads like a table cell and a 24px
corner reads like a phone. One token, large payoff, no content dependency —
it can ship before any footage exists.

---

## 2. Structure worth borrowing

### 2.1 The hero input is the product (OpusClip, Vizard) — borrow this

Both put a working field in the hero, above the fold:

- OpusClip: `Drop a video link or upload a file` → **Get free clips** / Auto-edit
- Vizard: `Paste a YouTube link here` → **GET CLIPS FOR FREE** / Upload, with a
  `Try it free. No sign up needed` tag pinned to the field

The hero is not a picture of the product, it *is* the product's first step. We
are unusually well placed to copy this: the engine shipped
(`/api/engine/jobs`), and `EngineLive` already does upload → job → cuts.
Lifting that control into the marketing hero is a real differentiator, not a
mock.

Caveat to settle before building: both competitors accept a YouTube URL, and
non-negotiable 1 forbids us ingesting anything but client-owned material. Our
hero field takes an **upload**, never a link. That constraint is worth saying
out loud on the page rather than hiding — see §4.

### 2.2 Sticky announcement bar (beCreatives, OpusClip, Vizard)

- beCreatives: `5 dedicated editor spots open this week. Book a call to reserve →`
  — acid-green, full-bleed, scarcity framing for a **retainer** business
- OpusClip: `OpusClip 4.0 is here.`
- Vizard: `Meet Vizard Agent: Your Personal Video Editor`

beCreatives' is the relevant one: it sells a done-for-you retainer, which is
our Day-0 model too. Capacity-based scarcity is honest for a retainer in a way
that "4.8/5 from 10,000 reviews" is not, and it works with a customer count of
zero.

### 2.3 Section architecture

Measured h2 order on each page:

**beCreatives** → social-proof bar → "You Create. We Edit." → platform demo →
"Edits Pay Off" → AI tools → logo wall → "We Edit It All" → comparison table
("The Video Editing Choices In 2026") → FAQ → CTA

**OpusClip** → "Used by 20M+ creators" → "AI that understands every pixel" →
"Your video creation process — now on autopilot" → "AI that edits with you,
not just for you" → "Scale your creative output…without scaling overhead" →
"A partner to your growth" → FAQ → CTA

**Vizard** → "Turn long video into 30+ clips, in one click." → "Built for
everyone, every team" → Teams → "AI features that actually work" → "From raw
footage to social-ready clips" → editor → testimonials → CTA

The shared spine, in order:

1. Hero with a working input
2. One-line proof bar
3. **The output, shown** — clips, immediately
4. How it works, 3–4 beats
5. Who it is for
6. Differentiator section
7. Social proof
8. Pricing
9. FAQ
10. Closing CTA

Our landing page already follows most of this. The missing link is **3** —
everyone else shows the output in the first screen or just under it, and ours
is a wall of coloured rectangles.

### 2.4 Comparison table (beCreatives) — borrow

"The Video Editing Choices In 2026" sets the retainer against freelancers,
in-house hires and agencies. In a category where the buyer's default is "hire
an editor on Upwork", naming the alternatives does the buyer's work for them.
We have a sharper version available: *us vs. the tools that get accounts
banned*, which is literally this project's origin story.

### 2.5 Pricing presentation (repurpose.io) — borrow the framing, not the claims

Three tiers priced **per day** with the monthly figure secondary:
`$1.17/day`, `$35 billed monthly`. Tiers named by who they are for (solo /
growing teams / agencies), with the constraint that actually differs stated
first (3 vs 10 vs 25 accounts per network). An annual toggle drops it to
`$0.97/day`.

Per-day framing on a retainer is legitimate and we should use it.

---

## 3. Motion, measured

Only one of the five uses an animation library: **OpusClip runs GSAP** (plus
Swiper for carousels). beCreatives, Vizard and Submagic ship CSS-only motion.
Submagic's entire animation budget is a marquee.

This settles the open question in `../plan/DESIGN_BACKLOG.md` step 3. The
category standard is **not** a heavy motion stack. Three of four direct
competitors get their modern feel from autoplaying video and large type, not
from scroll choreography. Our existing `animation-timeline: view()` layer is
already at parity.

So: do not add Motion to chase these sites. `motion` stays cleared-but-unused
(D19) until something specific needs it. The life on these pages comes from
**moving footage**, which is exactly what we are blocked on.

---

## 4. What we must NOT borrow

Every one of these five leans on proof we are forbidden to manufacture:

| Site | Claim | Why we can't |
|---|---|---|
| repurpose.io | "980,434+ creators", "100,000+ videos a day" | We have zero customers. Non-negotiable 7. |
| OpusClip | "Used by 20M+ creators and businesses" | Same. |
| Submagic | "Loved by 4M+ businesses", Trustpilot 4.8/5 | Fabricated ratings, explicitly banned. |
| beCreatives | "helped over 1,000+ companies", logo wall | No customers, no logo rights. |
| repurpose.io | Case studies: "11.5M views, 100 → 4,230 subs" | No fake customer results. |
| All five | Testimonials with names and faces | No fake testimonials. |

This is not a minor omission. **Social proof is the primary persuasion device
on all five pages**, and it is unavailable to us. Faking it — a testimonial
carousel with placeholder faces — would breach the non-negotiables and is the
exact failure the earlier project died of.

What we substitute, which none of them have:

1. **The output itself**, labelled sample data. Vizard shows clips of real
   creators; we show twelve cuts of a fictional client, honestly labelled.
   Weaker as proof, stronger as a demo.
2. **The compliance gate, shown working.** No competitor shows anything
   refusing to publish. We have `GateReadout` already. "Here is what we
   *blocked*" is proof of judgement, and it is a claim we can actually make.
3. **The method, in the open.** Seven named agents with visible handoffs.
4. **Capacity scarcity** instead of volume bragging (§2.2).

---

## 5. Ordered recommendations

Cheapest and least blocked first.

1. **Raise `--radius-thumb` from 6px toward ~16–24px.** One token, no content
   dependency, the most visual modernity per line changed on this list. Check
   it against `StoryboardFrames` and the studio grids, which share the token.
2. **Put a working upload control in the marketing hero.** Borrowed from
   OpusClip and Vizard, and we already have the engine behind it. Upload only,
   never a URL (non-negotiable 1).
3. **Capacity announcement bar**, beCreatives-style, honest for a retainer.
4. **Fill the cut wall with real 9:16 footage** — still blocked on Higgsfield
   credits, still the top item in `docs/PROGRESS.md` "Needs Vlad". Match
   Vizard's treatment (autoplay, loop, muted) but keep our posters, which
   Vizard omits and which make a twelve-tile wall far cheaper to load.
5. **Comparison section**, beCreatives-style, framed as us vs. the tools that
   get accounts banned.
6. **Per-day pricing framing**, repurpose.io-style.
7. **Do not add a motion library.** §3.

Explicitly rejected: testimonials, user-count claims, ratings, logo walls, and
any case-study metric, until they are real — §4.

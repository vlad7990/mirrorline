# 19 — Inner pages: bring every page up to the home page

Audit of the PR B2 preview (14 Nov 2026). The home page now has varied AI sample reels, the pinned Output sequence, parallax, scroll-lit rows, counters and section rails. The 16 inner pages have **none of the 12 sample reels**, mostly 1–3 images (the hero background or a dashboard screenshot), and are mainly numbered text lists. They read like documentation next to a cinematic home page.

## Shared rules for every page

- **Same kit as home:** numbered section rails, serif headings with one gold phrase, SplitText headline reveal, `reveal` stagger, CountUp on numbers, and the hover-loop reels from PR E. Same locked tokens and colours.
- **Visual in every second section.** No more than two text-only sections in a row. Use a sample reel, an app screenshot from the current gold studio, a small animated diagram or a KPI card.
- **Reels:** use `public/samples/`, and generate more where a page needs its own (same rules: fictional, varied trades and people, no real likeness, labelled "AI-generated sample"). Never repeat the exact same reel set in two sections of one page.
- **Page hero pattern** (Aura-style): full-bleed AI image with depth parallax, editorial headline, and an inset preview card bottom-right showing a looping sample relevant to that page. Remove vertical labels that sit over images.
- **Every page ends with the persona-aware final CTA** (Niche Scan + plan), then the footer.
- **Length:** inner pages stay between 4 and 8 screens at 1440×900.
- **Honesty:** sample and AI labels everywhere; no testimonials, logos or invented results.

## Page by page

| Page | Add |
|---|---|
| /product | Hero inset: one upload becoming cuts. A tabbed feature tour (Upload → Niche Scan → Remake → Calendar → Results → Agents), each tab with a current studio screenshot inside a browser frame and a short loop. A reel strip of varied outputs. An Originality Gate mini-demo (source vs remake, similarity meter animating). |
| /how-it-works | A pinned 3-phase timeline (Scan → Make → Post & prove) with a progress spine. Each phase gets a visual: recipe card (Scan), split "you send / we create" reels (Make), a week calendar filling and KPI cards ticking (Post & prove). A "Your first week" day-by-day strip (Mon–Sun) with what happens each day. |
| /agents | Each of the 7 agents gets a card with its icon, job, spend cap, the metric it owns and a looping micro-visual (e.g. Trend Scout ranks frames; Compliance stamps a reel; Publisher drops reels onto phone frames). Reuse the scroll-lit list from home for the hand-off order. Live-looking activity log (sample). |
| /metrics | Interactive goal picker: choose one of the 7 goals → KPI cards, funnel and targets change (sample data, animated). The 7 KPI tiers as a stacked visual. A dashboard screenshot with hotspots that explain each part on hover. Honesty rules as icon cards. |
| /compare | Scroll-lit comparison table (as on home) plus four category columns with a short reel or visual each: clipping tool output (raw files), agency (generic post), DIY (empty calendar), Mirrorline (filled calendar + ledger). Categories only, no brands. |
| /pricing | Plan cards rise in a stagger. Selecting a plan highlights it with the gold sweep. Per plan, a "What a month looks like" mini-calendar showing post volume. The long-form YouTube add-on card (PR D). Pricing FAQ accordion. |
| /trust | The rules as icon cards (allowed vs never). An Originality Gate walkthrough with a source/remake comparison. An AI label example on a reel. A "where your data goes" simple diagram. |
| /businesses, /individuals | Hero with a reel collage relevant to the page (shops, services and products for businesses; creators and people starting out for individuals). New vs existing account cards each get a reel. The 7 goals as visual tiles. A sample week strip. |
| /niche-scan | Multi-step form with animated stepper (PR E). Beside it, a preview of what comes back: three recipe cards animating in. Trust note on sources. |
| /niche-scan/sample | Recipe cards with beats that reveal on scroll, a mini reel per recipe, and views-per-follower bars that grow. |
| /about | Story told as a short scroll sequence: the problem (complaint quotes paraphrased) → what we built → how we work. Principles as icon cards. No investigation details, no team photos we don't have. |
| /contact | Two-path layout (book a call, send a message) with a small reel or studio visual; form success animation. |
| /faq | Category tabs, search filter and smooth accordion; a "still unsure? Ask about Mirrorline" link to the website co-pilot (PR C). |
| /resources | Article cards with cover images (AI-generated, labelled), reading time, and hover lift. Article pages get a reading-progress line and a related-reels block. |
| /changelog | Timeline with dated entries, a small screenshot per significant entry, entries revealing on scroll. |
| /legal/*, /accessibility | No reels. Readable layout: sticky table of contents, anchor links, last-updated date. Light motion only. |

## Acceptance

- Each page: before/after screenshots at 1440 and 390, saved to docs/screens-built/inner-pages/.
- No page has more than two text-only sections in a row.
- Lighthouse mobile ≥ 90 on /product, /how-it-works and /pricing; CLS 0; axe 0 serious/critical in both themes and with reduced motion on.
- The banned-phrase test and the sample/AI labelling checks still pass.

---

# v2 — required sections per page

Written at the start of F1, 14 November 2026. The table above is one line per
page and was never a checklist: it says "a tabbed feature tour" without saying
how many tabs, and "a reel strip" without saying whether a page is finished
without one. This half of the document is the checklist.

**A section marked ★ must exist before its page is called done.** Anything not
marked is allowed but not owed. The order of the ★ list is the order of the
page, top to bottom, and the final CTA plus the footer always close it.

Vlad reordered the queue on 14 November: F runs **before** PR C, D and E. Three
things the §"Shared rules" above lean on therefore do not exist yet, and v2
says what happens to each rather than leaving it to be discovered in F3:

| Leaned on | Owner | What v2 does instead |
|---|---|---|
| Hover-loop reels | PR E | F1 builds them. They are F1's own `ReelStrip`, so this was never really a dependency. |
| Long-form YouTube add-on card on /pricing | PR D | **Left out.** A card for an add-on whose API audit has not started would be an invented product. /pricing gets the plan set that exists. |
| "Ask about Mirrorline" link on /faq | PR C | **Left out**, and /faq is not in F's scope anyway (see §Scope). |

## Scope of F2–F5

Vlad's order of work on 14 November names nine routes plus the article
template. That is narrower than the sixteen-row table above, and the
difference is deliberate rather than an omission:

| PR | Pages |
|---|---|
| F2 | `/product`, `/how-it-works` |
| F3 | `/pricing`, `/compare` |
| F4 | `/metrics`, `/niche-scan` |
| F5 | `/resources` + the article template, `/sign-in`, `/sign-up` |

**Deferred to a later F6, untouched by F1–F5:** `/agents`, `/trust`,
`/businesses`, `/individuals`, `/niche-scan/sample`, `/about`, `/contact`,
`/faq`, `/changelog`, `/legal/*`, `/accessibility`. They keep the old kit until
then, which is visible as a seam and is the honest cost of the narrower scope.

## The asset budget, fixed up front

The handoff flagged this as the thing F2 would otherwise set a precedent for
that F5 could not afford. So it is decided here, once.

**There are 37 Higgsfield credits.** Nano Banana Pro at 16:9 costs 2; Nano
Banana 2 costs 1.5; Kling 3.0 Turbo costs 7.5 a clip (D29). The spend:

| What | Model | Count | Credits |
|---|---|---|---|
| Page hero images, one per page | Nano Banana Pro, 16:9, 2k | 7 | 14 |
| One shared image behind /sign-in and /sign-up | Nano Banana Pro, 16:9, 2k | 1 | 2 |
| Article cover images for /resources | Nano Banana 2, 16:9 | 6 | 9 |
| **Spent** | | **14** | **25** |
| **Held for regenerations** | | | **12** |

**No new video, and that is the budget deciding a design question.** Nine page
loops through Kling would be 67.5 credits, which we do not have. So the
"looping inset card" in the hero pattern is **a CSS cross-fade through three
existing 9:16 sample stills**, not a video. It costs nothing, decodes nothing,
and every frame in it is a real generated frame that is already labelled —
which is a better answer than a video would have been even with the credits.

**There is no exception, and there was going to be one.** `/product`'s hero
inset was to carry the real `cut-01` loop, because that page's subject *is*
the one-episode story. Lighthouse removed it: a 107 KB mp4 software-decoded on
a throttled mobile CPU is a 1,098 ms long task, which put the page at **57**
against the 90 it is held to (D50). Its inset now cross-fades three stills
from that same episode — cuts 1, 2 and 3, one room, one light, one sweater
(D28) — which makes the same point at no cost.

**So the rule is simply: no `<video>` in a page hero.** Any page later tempted
to add one should read D50 first.

## The image budget, also fixed up front

`/product`, `/how-it-works` and `/pricing` must hold Lighthouse mobile ≥ 90
while being three of the most image-heavy pages described. Per inner page:

- **Exactly one `priority` image:** the hero, 1600×900 WebP, ≤ 160 KB. Nothing
  else above the fold may be `priority`, because two priority images is two
  images racing for the same LCP.
- **At most twelve lazy images**, each with a real `sizes`. Twelve is the cut
  wall's count and it holds on a phone; it is a ceiling, not a target.
- **At most one `<video>` on the whole page.** `ReelStrip` hover-loops are
  stills until hover, so a strip of eight costs no video elements at all.
- **No flat colour tiles anywhere.** `VideoThumb` falls back to a flat demo
  colour when it is given no `media`, which is the honest default on the home
  page's placeholders and the wrong one here. Every frame on an inner page is
  passed real media, and a unit test on `ReelStrip` asserts it.

## Per page

### ★ /product (F2)

1. ★ Page hero — own AI image, labelled, depth parallax, inset = cross-fade of cuts 1–3 of one episode (see §asset budget: this was a real loop until Lighthouse was run on it).
2. ★ Tabbed feature tour, six tabs in product order: Upload → Niche Scan → Remake → Calendar → Results → Agents. Each tab shows a **current gold-studio screenshot inside a browser frame** and three lines of copy.
3. ★ Reel strip of varied outputs — eight frames, real samples, labelled.
4. ★ Originality Gate mini-demo: source beside remake, with a similarity meter that animates to its figure and states the threshold.
5. ★ Page-specific final CTA.

### ★ /how-it-works (F2)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ Three-phase spine: Scan → Make → Post & prove, with a progress rail.
3. ★ A visual per phase, each different: a recipe card (Scan), a split "you send / we create" pair of reels (Make), a week calendar with KPI cards counting up (Post & prove).
4. ★ "Your first week" strip, Monday to Sunday, saying what happens each day.
5. ★ Page-specific final CTA.

### ★ /pricing (F3)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ Plan cards, rising in a stagger; the selected plan takes the gold sweep.
3. ★ Per plan, a "what a month looks like" mini-calendar showing post volume. Derived from the plan's posts-per-week, never typed (D24).
4. ★ Pricing FAQ accordion.
5. ★ Page-specific final CTA.
6. Not built: the long-form YouTube add-on card. PR D owns it.

### ★ /compare (F3)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ Scroll-lit comparison table, categories only and no brand names.
3. ★ Four category columns with a visual each: clipping tool (raw files), agency (one generic post), DIY (an empty calendar), Mirrorline (a filled calendar).
4. ★ **A decision helper that can recommend against us.** Three questions, and where the honest answer is a freelance editor or doing it yourself, it says so and does not show a plan. A comparison page that recommends itself in every branch is a price list wearing a quiz. **Built, and the honesty is a test rather than a promise:** of the eighteen answer combinations, fifteen end somewhere other than a plan of ours, and the suite fails if that ever drops below half (D51).
5. ★ Page-specific final CTA.

### ★ /metrics (F4)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ **Interactive goal picker, replacing the static seven-goal cards.** Choosing one of the seven goals changes the KPI cards, the funnel and the targets. Sample data, labelled, and the preview keeps showing one not-connected KPI and one projection.
3. ★ The seven KPI tiers as one stacked visual, not seven paragraphs.
4. ★ A dashboard screenshot in a browser frame with hotspots that explain each part.
5. ★ Honesty rules as icon cards.
6. ★ Page-specific final CTA.

**The trap, named before anyone writes the picker.** If the goal picker reads
its state from the URL it needs a Suspense boundary **immediately above
itself** — D46 is the record of what happens when that boundary goes in the
layout instead: the whole marketing tree became the fallback and the pages
shipped no HTML at all. The simpler answer, and the one v2 picks: the picker
holds its own state and does not touch the URL.

### ★ /niche-scan (F4)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ Multi-step form with a stepper: four steps, one question a step, state held in the component.
3. ★ Beside it, a preview of what comes back — three sample recipe cards that animate in.
4. ★ A trust note on sources, naming what the scan reads and what it never touches (12 §Allowed and banned sources).
5. ★ Page-specific final CTA.

### ★ /resources + the article template (F5)

1. ★ Page hero — own AI image, labelled, inset = cross-fade of three samples.
2. ★ Article cards: labelled AI cover image, reading time, hover lift.
3. ★ Categories, as a filter that works without JavaScript where it can.
4. ★ Templates and a glossary, each a real list rather than a promise of one.
5. ★ Newsletter signup with **explicit consent**, and the form sends nothing: no address is stored and no email is sent. The screen says so before anyone types.
6. ★ Page-specific final CTA.
7. ★ **Article template:** reading-progress line, the cover labelled, and a related-reels block.

### ★ /sign-in and /sign-up (F5)

1. ★ The ink-and-gold marketing look, not the studio's chrome. One shared AI image, labelled, down one side.
2. ★ Error state: wrong credentials, said plainly and without saying which half was wrong.
3. ★ Forgot-password state.
4. ★ A **neutral example email** in every placeholder. No real-looking person, no `@gmail`, nothing that reads as a customer we have.
5. These two pages have no reels and no final CTA — they are a door, not a page of argument.

## v2 acceptance, in addition to the list above

- Every ★ exists on its page, and the page's own e2e test asserts it.
- No page ships a `VideoThumb` with no `media`.
- No two sections of one page show the same set of sample frames.
- The per-page image budget holds: one `priority` image, ≤ 12 lazy, ≤ 1 `<video>`.
- Every page hero carries its own AI label naming the image as generated.

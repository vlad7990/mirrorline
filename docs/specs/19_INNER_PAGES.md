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

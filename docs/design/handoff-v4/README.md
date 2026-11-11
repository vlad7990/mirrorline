# Handoff: Mirrorline — marketing website, web app, mobile approvals

## Overview
Mirrorline is an AI content studio for coaches, consultants and local businesses. It turns a client's long videos (podcasts, webinars, talks) and formats rising in their niche into original short videos, and publishes them several times a day to the client's own Instagram, TikTok and YouTube Shorts accounts. Seven agents do the work (Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher, Performance Analyst); the client records once a week and approves posts.

This bundle contains three designs:
1. **Marketing website** — 5 pages (Home, Product, Agents, Trust, Pricing). Dark/gold luxury direction, heavy motion.
2. **Web app** — onboarding + 9 screens (desktop, 1440 design width, fluid).
3. **Mobile** — home summary + swipe-to-approve screen (390 × 844).

"Mirrorline" is a placeholder name. All people, brands and numbers are fictional (see `reference/08_MOCK_DATA.md`).

## About the design files
The files in `designs/` are **design references built in HTML** — working prototypes that show the intended look, copy and behaviour. They are **not production code to ship**. Recreate them in the target codebase using its existing framework, component library and conventions. If no codebase exists yet, a sensible default is **Next.js (App Router) + TypeScript + Tailwind CSS**, with Framer Motion for the website animations.

To view a prototype: open the `.dc.html` file in a browser with `support.js` in the same folder (it's the small runtime that renders the template). Each file has an HTML template (inline-styled markup with `{{ }}` holes, `<sc-for>` loops and `<sc-if>` conditionals) and a `class Component` logic block at the bottom. All exact values below are taken from those files — when in doubt, the file is the source of truth.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, copy and interactions. Recreate pixel-accurately. Copy is final unless marked as estimate/placeholder below.

**Known theme split (decide before building):** the website uses the gold + ink palette; the app and mobile still use the original coral Mirrorline palette. The recommended next step is to restyle the app in gold + ink and add a Light / Dark / System theme setting in the app only (the website stays as designed — its dark/light section rhythm is art direction, not a theme).

---

## 1. Marketing website — `designs/Mirrorline Website.dc.html`

### Routing
Hash routes in the prototype: `#/` (Home), `#/product`, `#/agents`, `#/trust`, `#/pricing`. Implement as real routes (`/`, `/product`, `/agents`, `/trust`, `/pricing`). On route change: scroll to top, fade main content in (opacity 0 → 1, translateY 16px → 0, 700ms `cubic-bezier(0.2,0.8,0.2,1)`). The Tweaks prop `startPage` only exists for previewing.

### Global layout
- Page background `#0E1116`, text `#F5F3EC`. Container `max-width:1280px; padding:0 32px` (16px on mobile).
- Section vertical padding: 120–140px; hero 210px top. Alternate bands: ink `#0E1116`, ink-alt `#141920`, warm snow `#F7F6F2` (text `#0E1116`), white `#FFFFFF`.
- **Fixed header** (`position:fixed; top:0; z-index:20`):
  - Announcement bar, 40px min height, gold gradient background, `#0E1116` 14px/600 text: "Now booking December pilots · 2 weeks, 12 videos, $750" + arrow → links to Pricing.
  - Nav row 80px: logo (loop-arrow icon in `#F5B83D`, rotating slowly 18s linear; wordmark "Mirrorline" Fraunces 500 24px), links Product / Agents / Trust / Pricing (15px/500, `#B4B8C0`, active = `#F5F3EC` with a 1px `#C8A24A` underline that scales in from the left, 400ms), "Sign in" text link → app, "Book a private demo" gold pill button (46px high, radius 999, padding 0 22px).
  - On scroll > 40px: header background `rgba(14,17,22,0.82)`, `backdrop-filter: blur(14px)`, bottom border `#262C36`. Transitions 400ms.
- **Scroll progress bar**: fixed 2px bar at top, gold gradient, width = scroll %.
- **Shared footer CTA** on every page (`#cta`): radial gold glow, headline "Record once. *Show up everywhere.*" (Fraunces 500, clamp(56px, 8vw, 128px), line-height .98, gold italic on second phrase), sub-copy, buttons "Book a private demo" (gold, 64px) and "Next: {next page}" (outline, links to the next route in order Home → Product → Agents → Trust → Pricing → Home).
- **Footer**: logo, "Placeholder name. All people and brands shown are fictional.", nav links + Sign in.

### Typography
- Display: **Fraunces** (Google Fonts, opsz 9–144, 400/500/600, italic 400/500). Headlines 500 weight, letter-spacing -0.02 to -0.03em, line-height 0.98–1.05.
- Body/UI: **Inter Tight** 400–700. `font-variant-numeric: tabular-nums` everywhere.
- Sizes: H1 hero clamp(52px, 7.4vw, 112px); page-hero H1 clamp(56px, 8vw, 128px); H2 clamp(44px, 5vw, 80px); card titles 26–40px Fraunces; body 17–23px; eyebrow 13px/600, letter-spacing .12em, uppercase, `#F5B83D` on dark / `#6A6F78` on light.
- **Gold italic accent** (used on one phrase per headline): Fraunces italic, `background: linear-gradient(135deg,#F5B83D 0%,#C8A24A 45%,#A6842F 100%)` clipped to text, `padding-right:.12em; margin-right:-.08em; box-decoration-break:clone` (prevents italic swash clipping — keep these).

### Home (`/`)
1. **Hero** (centered, max-width 1120): pill eyebrow with pulsing dot "AN AI CONTENT STUDIO FOR COACHES AND LOCAL BUSINESSES"; H1 "Turn one long video into" + typed phrase on its own line cycling `a week of posts.` / `twelve short videos.` / `booked calls.` / `a daily presence.` (type 70ms/char, hold 1800ms, delete 35ms/char, 300ms pause; 4px gold blinking caret). Sub-copy 19–23px `#B4B8C0`, max 720px.
   - **Link input** (Opus-style): pill form, max 780px, bg `rgba(26,31,39,0.92)`, border `#353C48`, outer ring `0 0 0 6px rgba(245,184,61,0.06)`. Link icon, input (placeholder "Paste a YouTube, podcast or webinar link"), gold submit "Show me my posts" (56px).
   - Below: "Posts to" + platform pills (Instagram, TikTok, YouTube Shorts, LinkedIn) + "· only material you own".
   - **Demo run on submit**: panel appears with 4 step chips — Transcribing, Finding moments, Cutting 9:16, Compliance check — each becoming active (gold tint) then done (green `#1FBF7B` tint + check) every 750ms; at 3000ms shows 6 cut thumbnails popping in (staggered 130ms, `mlPop` 600ms) and "12 cuts ready. 9 passed, 2 need your eye, 1 blocked for venue music." + outline link "Get yours in 48 hours" → `#cta`. Button text: "Working…" during, "Run it again" after. This is a **canned demo** — in production, either wire to a real lead-capture/booking flow or keep as a scripted sample.
   - Cursor-following radial gold glow (640px) inside hero.
2. **Feature tabs + stage** (Vizard-style numbered slider): 4 tabs (01 Multiply, 02 Remake, 03 Publish, 04 Learn), 4-across or 2×2. Each tab has a 2px track on top; the active tab's track fills gold over 6.5s, then auto-advances. Click jumps and restarts the timer. Stage panel below: dark gradient card, radius 28, padding up to 48, min-height 440. Each panel = left text block (eyebrow, Fraunces headline with gold phrase, body, a stat line) + right visual:
   - Multiply: waveform (84 bars, 14 highlighted gold) with a gold scan line sweeping 4s, then 6 cut thumbnails popping in.
   - Remake: two-column table "RISING FORMAT" vs "YOUR VERSION" — 4 beats, active beat highlighted with gold border, cycling every 1.4s.
   - Publish: 3 platforms × 7 days mini calendar (chips pop in staggered 55ms); Instagram Tue/Fri are gold "Remake" chips. This panel stacks to one column below ~1180px.
   - Learn: funnel bars (Views 48,300 → Profile visits 1,930 → Link clicks 214 → Leads 31 → Calls booked 6), one linear scale, bars grow from left (`scaleX`, 900ms, staggered 140ms). Last bar/number gold.
3. **Showcase marquee**: heading "Made for people who *sell what they know.*"; two rows of 9:16 sample cards (210px wide) scrolling in opposite directions (60s / 70s linear infinite). Each card: niche pill, length pill, hook with sand-highlighted phrase. Labelled as samples for fictional businesses.
4. **Who it's for** (warm snow band): 4 cards — Coaches and consultants / Clinics and wellness / Studios and gyms / Local services — big gold italic number, Fraunces title, body, "Goal: …" line in `#A6842F`. Link to Pricing. Hover lift.
5. **Proof cards**: "One demo week, *in numbers.*" — 3 cards with huge gold count-up numbers (6 / 2.1× / 3 min), title, story, agent caption. Disclaimer that the client is fictional.
6. **Comparison table**: "Four ways to post *every day.*" — columns Do it yourself / AI clipping app / In-house editor / **Mirrorline Growth** (gold-tinted column `rgba(245,184,61,0.08)`, gold header). Rows: Cost a month, Posts a week, Your time, Trend remakes, Rights and AI labels, Reporting. Note: "Typical figures, our estimates." — **marketing must validate these numbers before launch.** Min-width 780px, scrolls horizontally below that.
7. **Go deeper**: 3 link cards to Product / Agents / Trust.

### Product (`/product`)
Page hero (eyebrow "THE PRODUCT", "One video. *Twelve posts.*", sub). Then: Multiply demo card (episode header, waveform with scan, 12 cut thumbnails revealing staggered 70ms, 4 count-up stats: 12 cuts, 31 moments, 48 h, 3×); Trend remake section with 4-beat storyboard cycling; "How it works" 4 step cards (big gold italic numbers 01–04).

### Agents (`/agents`)
Page hero "Seven agents. *One loop.*". Orbit diagram: dashed gold ring, a glowing gold dot orbiting (14s), 7 agent pills placed evenly on the ring (radius 41%), centre "One loop". Selected agent (auto-cycles every 2.8s until the user clicks) shows a detail card: AGENT 0X / 07, spend cap, name, description, "FROM THE LOG" line. Below: 3 control cards (Approve each post / Spend caps / An off switch).

### Trust (`/trust`)
Page hero "Rules we *don't bend.*". 6 rule cards with shield-check icon tile. Then "Every cut passes *five checks.*" with a Compliance agent card listing 5 green checks + a red "Blocked example" note (`#E34858`).

### Pricing (`/pricing`)
Audience segmented toggle (Coaches and consultants / Local businesses) — changes only the "fit" line on each plan. Three plans:
- **Pilot** $750 for 2 weeks · about $54 a day — 12 videos, scheduling on 3 platforms, one results report.
- **Growth** $1,500 a month · about $50 a day — "MOST CHOSEN", gold 2px gradient frame, dark card — 90 posts/month (3 a day), 2 trend remakes a week, 3 platforms, weekly report.
- **Scale** $3,000 a month · about $100 a day — 180 posts/month (6 a day), daily remakes, labelled AI product scenes, A/B hooks + monthly strategy call.
Note under plans: Studio self-serve plan from $49/month coming later. FAQ accordion (4 Qs, one open at a time; grid-rows 0fr→1fr 400ms; plus icon rotates 45°).

### Website motion system
- Scroll reveal: every `[data-reveal]` starts `opacity:0; translateY(28px)` and animates in once at 12% visibility, 900ms `cubic-bezier(0.2,0.8,0.2,1)`, with per-element delay (`data-delay`, usually 80–120ms steps). Cut thumbnails use `translateY(40px) scale(.85)`.
- Count-up on reveal: 1600ms, ease-out cubic, respects decimals.
- Hover lifts: translateY(-4 to -6px), shadow `0 8px 30px -6px rgba(200,162,74,0.45)`, border → `#C8A24A`, 300ms.
- **Respect `prefers-reduced-motion`**: no typing (show first word), no marquees/orbit/scan/auto-advance, reveals shown immediately.

---

## 2. Web app — `designs/Mirrorline App.dc.html`
Desktop app shell: fixed 240px left sidebar + fluid main (max content 1200px, padding 36px 40px). Screens switch in-place (the prototype keeps state in one component; implement as routes). Tweaks props for preview only: `startScreen`, `uploadState` (done/loading/empty), `instagramError`.

**Sidebar**: logo (coral loop icon `#FF5A36`, Inter Tight 700 20px; click → website), workspace card "Maya Torres Coaching · Growth plan", nav (44px items, radius 10; active bg `#FFE8E1` text `#8F2C11` 600): Home, Upload, Trends, Calendar, Results, Agents, Brand kit, Settings; usage meter "Posts this month 63 of 90" at the bottom.

**Screens** (full copy and data are in the file and `reference/03_SCREENS_SPEC.md` / `08_MOCK_DATA.md`):
- **Onboarding (3 steps)**: progress bars header + "Skip to demo". (1) Brand kit — logo, 3 colours, fonts, 3 tone sliders that live-update a sample 9:16 caption. (2) Connect accounts — Instagram/TikTok/YouTube/LinkedIn cards with connect toggles; rights checkbox "I own or have rights to everything I upload." (required to finish). (3) Niche and goal — niche select, nearby niche chips, booking URL, goal radio list, posts-per-day stepper (1–6). Final button "Start my first upload" → Upload (empty state).
- **Home**: greeting, optional Instagram disconnected error banner (red, "Reconnect Instagram"), 4 metric cards with sparklines, "Needs you" list (chip + text + action; resolving removes the row), "Today" schedule, Agent activity feed, dark "Learning loop" card.
- **Upload & multiply**: states empty (dashed drop zone, "Choose a video" / "Import from my YouTube channel") → loading (5-step progress, shimmer skeleton grid) → done (12 cut cards, 9:16 thumbnails, score, status chip Passed / Needs review / Blocked with reason; Approve / Undo / Review / Fix actions; filter chips; "Schedule N passed cuts").
- **Trends**: filter chips, blue info banner "We remake the format, never the footage.", trend cards (niche, growth %, 4-beat recipe, why, fit bar, "Remake for my brand").
- **Remake studio**: 3 columns — format recipe, new script + shot list (Client footage / AI scene / Graphic tags) + voice consent, 9:16 preview + 3 hooks to A/B (selectable); Compliance agent "Passed" card; "Approve and make 5 variants".
- **Calendar & approvals**: mode switch (Approve each post / Auto-approve after 24h), 7-day × 3-platform grid of post chips (left edge colour = status: published `#8A9099`, scheduled `#2F6FDE`, needs review `#C98A12`, approved `#1F9D6B`), right detail panel (preview, caption, link, AI-label toggle locked on for AI posts, Send back / Approve), dark batch bar "Approve all 9 for tomorrow".
- **Results**: headline numbers, funnel (one shared scale), top posts table, hook-type bars, best-times heatmap, ranked formats, "Download weekly report (PDF)".
- **Agents**: loop chain of 7 agents, agent cards (status pill Working / Idle / Waiting for you / Off, spend vs cap bar, on/off switch), sticky log panel for the selected agent.
- **Brand kit**: logo & colours, caption style presets (3), intro/outro, voice selection with consent badge, always/never words.
- **Settings & billing**: connected accounts with status chips, data & rights, plan card (dark), invoices, team.
- Toast: fixed bottom-centre dark pill with green check, auto-hides after 2.6s.

**App tokens (current coral palette)**: bg `#FAFAF7`, card `#FFFFFF`, border `#E6E4DD`, strong border `#D6D3CA`, text `#14171C`, secondary `#3E444D`, muted `#5F6672`, primary button `#C8401C` (white text), brand accent `#FF5A36`, accent tint `#FFE8E1`/`#8F2C11`, dark card `#14171C` with `#FF7A5C` accent. Status chips: passed/approved `#E3F4EC`/`#145C40`, needs review `#FBF0D9`/`#6E4A07`, blocked `#FBE3E3`/`#8E2626`, scheduled `#E3ECFB`/`#1F4FA8`, neutral `#EFEDE7`/`#3E444D`. Fonts: Inter Tight 600/700 (headings, H1 32px), Inter 400–600 (body 15px, meta 13px). Radii: cards 12, buttons 10, chips 9999. Min hit target 44px.

## 3. Mobile — `designs/Mirrorline Mobile.dc.html`
Two 390 × 844 screens shown side by side.
- **M2 Home**: greeting, 4 metric tiles (2×2), "Needs you" list + coral "Review N posts" button, "Next up" list, bottom tab bar (Home / Approvals / Calendar / Results).
- **M1 Approvals** (dark `#0E1116`): full-height 9:16 card stack. Drag horizontally: card follows the pointer with rotation `dx/25deg`; "Approve" (green) / "Send back" (amber) stamps fade in with distance; release past ±90px commits, otherwise springs back (220ms ease-out). Reason chips (Wrong tone / Wrong fact / Change the hook) — **a reason is required to send back**. Buttons Send back / Approve (56px). Empty state "All caught up" with summary.

---

## State (summary)
- Website: `page` (route), typing (`wordIndex`, `length`, `deleting`), `tab` + timer, `demo` ('idle'|'working'|'done') + `step`, `link` input, `beat` (0–3), `agent` (0–6) + `userPicked`, `audience` ('coaches'|'local'), `faqOpen`.
- App: `screen`, onboarding step + form values, cut statuses map, filters, selected post, posts array with statuses, AI-label overrides, approval mode, agent on/off array, selected agent, brand preset/voice, Instagram error flag, resolved "needs" items, toast.
- Mobile: queue index, drag dx, selected reason, results array.
- All data is mock. Real implementations need: platform OAuth connections, upload/transcription job status (poll or websocket for the step progress), cuts + compliance results, schedule CRUD, analytics endpoints, agent logs and spend.

## Website design tokens (gold + ink)
- Gold: `#C8A24A` (primary), `#A6842F` (deep, on light), `#F5B83D` (bright, on dark), `#F6E7B8` (soft wash). Gradient `linear-gradient(135deg,#F5B83D 0%,#C8A24A 45%,#A6842F 100%)`.
- Ink surfaces: `#0E1116`, `#141920`, card `#1A1F27`, border `#262C36`, strong border `#353C48`. Dark-panel gradient `linear-gradient(180deg,#1A1F27 0%,#0E1116 100%)`.
- Dark text: `#F5F3EC` / `#B4B8C0` / `#7A8089`. Light surfaces `#FFFFFF`, `#F7F6F2`, `#EFEDE6`, border `#E6E3DA`/`#D4CFC2`; light text `#0E1116` / `#3A3F48` / `#6A6F78`.
- Semantic: positive `#1FBF7B`, negative `#E34858`, info `#3A8DDE`. Sample clip fills: `#12545A`, `#1E3A40`, `#2F3E46`, `#6B4F3A`; caption highlight `#F3E9DC` on `#12545A` text.
- Radii: 8 / 10 / 12 / 16 / 20 / 24 / 28, pills 999. Shadows: `0 24px 48px rgba(0,0,0,0.4)` (floating, dark), `0 24px 48px rgba(14,17,22,0.08)` (light), gold glow `0 8px 30px -6px rgba(200,162,74,0.45)`.
- Easing: `cubic-bezier(0.2,0.8,0.2,1)`; durations 240–300ms (hover), 400–700ms (state), 900ms (reveal).
- Keyframes used: float (translateY 0↔-14px), marquee (translateX 0→-50% on a doubled list), orbit/spin (rotate 360°), blink (caret), scan (left 0→100%), pulse (gold ring), fill (width 0→100%), pop (fade + rise + scale .92→1), grow (scaleX 0→1).

## Assets
- No raster images. All icons are inline Lucide-style outline SVGs (stroke 1.8–2.4, round caps/joins): loop-arrow logo mark, arrow-right, check, link, shield-check, info, alert-circle, chevron-down. Use `lucide-react` (`RotateCw`/`RefreshCw`-style mark, `ArrowRight`, `Check`, `Link`, `ShieldCheck`, `Info`, `AlertCircle`, `ChevronDown`).
- Video thumbnails are solid colour placeholders — replace with real client clips.
- Fonts: Fraunces + Inter Tight (website), Inter Tight + Inter (app) — Google Fonts.

## Files
- `designs/Mirrorline Website.dc.html` — marketing site, all 5 pages (latest version, v4).
- `designs/Mirrorline App.dc.html` — web app, onboarding + 9 screens.
- `designs/Mirrorline Mobile.dc.html` — mobile home + approvals.
- `designs/support.js` — prototype runtime, only needed to open the files above.
- `reference/` — original product brief, brand & voice, screen spec and mock data. Brand voice rules (calm, plain words, no hype, no guarantees of views/followers) apply to any new copy.

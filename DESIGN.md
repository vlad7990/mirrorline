---
name: Mirrorline
description: Glass-box design system for an AI content studio that turns a brand's own videos into daily short-form posts. Precision instrumentation you can inspect. Placeholder product name.
colors:
  primary: "#C8401C"
  primary-hover: "#B33716"
  on-primary: "#FFFFFF"
  accent: "#FF5A36"
  accent-soft: "#FFE7E0"
  on-accent-soft: "#8F2C11"
  background: "#F6F7F9"
  surface: "#FFFFFF"
  surface-subtle: "#EFF1F4"
  border: "#E2E5EA"
  border-strong: "#CBD0D8"
  text: "#0E1116"
  text-muted: "#596273"
  ink: "#11151B"
  on-ink: "#EEF1F6"
  viewer: "#07090D"
  on-viewer: "#E9ECF2"
  success: "#128A5E"
  success-soft: "#DEF2E8"
  on-success-soft: "#0E5940"
  warning: "#B7790A"
  warning-soft: "#FAEFD6"
  on-warning-soft: "#6B4606"
  danger: "#C9343C"
  danger-soft: "#FBE2E3"
  on-danger-soft: "#8C2126"
  info: "#2563D9"
  info-soft: "#E2EAFA"
  on-info-soft: "#1C4AA3"
  neutral-soft: "#E9ECF1"
  on-neutral-soft: "#3A4250"
  dark-background: "#0F141B"
  dark-surface: "#19202A"
  dark-surface-subtle: "#222A36"
  dark-border: "#2D3542"
  dark-border-strong: "#404A59"
  dark-text: "#EEF1F6"
  dark-text-muted: "#9BA4B2"
  dark-ink: "#1C2430"
  dark-accent: "#FF7A5C"
  brand-demo-teal: "#12545A"
  brand-demo-sand: "#F3E9DC"
typography:
  display:
    fontFamily: Geist
    fontSize: 46px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.025em
  headline:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.02em
  title:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.28
    letterSpacing: -0.012em
  subtitle:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.008em
  body:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: -0.002em
  body-strong:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: -0.002em
  label:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.004em
  meta:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.004em
  metric:
    fontFamily: Geist Mono
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.02em
  mono:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  overlay-caption:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: -0.01em
rounded:
  sm: 4px
  thumb: 6px
  md: 8px
  lg: 10px
  xl: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
  sidebar: 240px
  touch: 44px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 0 20px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 0 16px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 22px
  nav-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.on-accent-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: 44px
  chip-passed:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.on-success-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-needs-review:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.on-warning-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-blocked:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.on-danger-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-scheduled:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.on-info-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  chip-published:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.on-neutral-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  viewer-panel:
    backgroundColor: "{colors.viewer}"
    textColor: "{colors.on-viewer}"
    typography: "{typography.meta}"
    rounded: "{rounded.lg}"
    padding: 16px
  video-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 10px
  video-thumbnail:
    backgroundColor: "{colors.brand-demo-teal}"
    textColor: "{colors.on-primary}"
    typography: "{typography.overlay-caption}"
    rounded: "{rounded.thumb}"
  metric-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.metric}"
    rounded: "{rounded.lg}"
    padding: 18px 20px
  agent-log-line:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: 6px 10px
  spend-cap:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.mono}"
    rounded: "{rounded.full}"
    height: 24px
  insight-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.lg}"
    padding: 22px
  progress-bar:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    height: 6px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: 44px
  input-outline:
    backgroundColor: "{colors.border-strong}"
    height: 1px
  dark-outline:
    backgroundColor: "{colors.dark-border}"
    height: 1px
  meta-text:
    textColor: "{colors.text-muted}"
    typography: "{typography.meta}"
  status-dot-success:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-warning:
    backgroundColor: "{colors.warning}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-danger:
    backgroundColor: "{colors.danger}"
    rounded: "{rounded.full}"
    size: 8px
  status-dot-info:
    backgroundColor: "{colors.info}"
    rounded: "{rounded.full}"
    size: 8px
  caption-highlight:
    backgroundColor: "{colors.brand-demo-sand}"
    textColor: "{colors.brand-demo-teal}"
    rounded: "{rounded.sm}"
  mobile-screen-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-text}"
  mobile-card-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-muted}"
    rounded: "{rounded.xl}"
  mobile-button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.xl}"
    height: 56px
  mobile-log-line-dark:
    backgroundColor: "{colors.dark-surface-subtle}"
    textColor: "{colors.dark-text-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: 6px 10px
  mobile-insight-card-dark:
    backgroundColor: "{colors.dark-ink}"
    textColor: "{colors.dark-text}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 22px
  dark-outline-strong:
    backgroundColor: "{colors.dark-border-strong}"
    height: 1px
---

## Overview

Mirrorline is a web app (with a small mobile companion) for coaches, consultants and local service businesses. It turns a client's own long videos, and formats trending in their niche, into original short vertical videos. A team of seven AI agents (Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher, Performance Analyst) then posts them several times a day to the client's own accounts, and learns from the results.

The design should feel like a **glass box**: precision instrumentation you are allowed to open. Mirrorline's one real differentiator is that you can watch the machine work — seven agents with logs, costs, spend caps, stated limits, and a compliance gate nothing passes without. So the interface shows its workings instead of hiding them behind a friendly surface. It stays quiet, because the client's 9:16 videos and the numbers are the content, but it is quiet the way a measuring instrument is quiet, not the way a brochure is.

The design also has to make trust visible. AI labels, compliance checks, approvals and honest numbers are part of the product, not fine print.

Personality: clear, exact, trustworthy. Voice: plain verbs, real numbers, sentence case, no exclamation marks, no guarantees. Examples: "12 cuts ready. 3 need your eye before they post." · "We remake the format, never the footage." · "TikTok posts stay private until our app is approved."

The demo content belongs to a fictional client, "Maya Torres Coaching". "Mirrorline" is a placeholder name.

## Colors

- **Primary (#C8401C):** a deep coral for primary buttons and key actions. White text on it passes 4.5:1 (4.99:1). It darkens to #B33716 on hover, in both themes — lightening it in dark mode drops white text below AA.
- **Accent (#FF5A36):** a bright coral for the loop logo, sparklines, progress and fit bars, and highlights. It never carries white body text.
- **Accent soft (#FFE7E0):** the active navigation item, selected options and "working" agent states.
- **Background (#F6F7F9) and surface (#FFFFFF):** a cool, precise near-white page with white cards and 1px #E2E5EA borders. The neutrals sit on one cold, almost chroma-free axis rather than the old warm off-white: a tool you inspect should not read as paper, and the colder ground gives the coral somewhere to be loud. The page-to-card step is 1.07:1, which is what lets a flat card have a visible edge without a shadow.
- **Surface subtle (#EFF1F4):** inset blocks — agent log wells, read-only fields, storyboard frames.
- **Text (#0E1116) and text muted (#596273):** a cool near-black for content, cool slate for metadata.
- **Ink (#11151B):** dark emphasis panels, such as the "Learning loop" card and the batch-approval bar. In dark mode ink steps **up** to #1C2430, not down: there is no room below the page, so emphasis has to sit above the card instead.
- **Viewer (#07090D) and on-viewer (#E9ECF2):** the lightbox. Every 9:16 frame — the preview, the approvals queue, the player — sits on the viewer surface, and it is **the same near-black in both themes**. A client's footage must not change colour because somebody flipped a theme. The viewer is deliberately deeper and cooler than ink: ink is a panel that belongs to the page, the viewer is meant to disappear and leave only the video.
- **Status colours:** green = passed or published, amber = needs review, red = blocked or error, blue = scheduled or info. Each one is used as a soft background with darker text in pills, and always paired with a word.
- **Dark theme:** background #0F141B, surface #19202A, inset #222A36, border #2D3542, text #EEF1F6, muted #9BA4B2, accent #FF7A5C. The same cool axis read from the other end. The mobile approvals screen uses it.
- **Demo brand colours (inside thumbnails only):** teal #12545A, sand #F3E9DC. Thumbnails rotate #12545A, #1E3A40, #2F3E46 and #6B4F3A.

Every foreground and background pair named here is checked at 4.5:1 or better, in both themes, by `packages/ui/src/__tests__/contrast.test.ts`. If a pair fails, the colour changes, not the test.

## Typography

Mirrorline speaks in **two voices**, and the typeface is how you tell them apart.

- **Geist — the studio's voice.** Everything the product says to a person: headings, body copy, labels, button text, and the captions burned into a video. Page titles 32px, card titles 17–20px, body 15px at a 1.6 line height.
- **Geist Mono — the machine's voice.** Everything the agents produced or measured: agent log lines, costs ($1.84), timings (0:24, 52:14), similarity percentages (12%), spend caps ($6 / $25), post counts, step rates, and every metric tile. Tabular figures, so columns line up.

This split is semantic, not decorative. A number in mono means "a machine measured this and you can audit it". Never set a sentence of product copy in mono to look technical, and never set a cost in Geist Sans because it happens to sit in a paragraph.

- **Scale:** display 46px/700, headline 32px/700, title 20px/600, subtitle 17px/600, body 15px/400, label 14px/600, meta 13px/400, caption 12px/600, metric 30px/600 mono, mono 13px/500.
- **Tracking:** Geist runs tighter than Inter, so display sizes take real negative tracking (-0.025em at 46px, -0.02em at 32px), mid sizes a token amount, and 12–13px text goes back to zero or slightly positive.
- **Captions on video thumbnails:** Geist 700, white, with the key phrase highlighted on a sand background in teal.
- **Case:** sentence case everywhere. Uppercase only for small section eyebrows (12–13px, letter-spacing 0.06em).

## Layout

- **Desktop at 1440px:** a fixed 240px left sidebar and a fluid content area with 32–40px padding. Sidebar contents, in order:
  - logo
  - workspace switcher ("Maya Torres Coaching · Growth plan")
  - navigation: Home, Upload, Trends, Calendar, Results, Agents, Brand kit, Settings
  - usage meter ("63 of 90 posts", the figures in mono) at the bottom
- **Content layout:** a page header with a small eyebrow, a title and the primary action on the right. Below it sit card grids, 3–4 columns for metric tiles and trend cards, with auto-fill grids of 172px-minimum cards for videos.
- **Spacing:** an 8px grid. Gaps between cards are 16–24px; card padding is 18–22px.
- **Mobile at 390 × 844:** single column, 18px side padding, large touch targets, primary actions at the bottom within thumb reach.
- **Wide content** (the calendar week grid, tables, agent logs) scrolls horizontally inside its card instead of breaking the page.

## Elevation & Depth

- **Flat by default:** depth comes from 1px borders and the contrast between surface and background, not shadows. The cooler neutrals make that step legible without help.
- **Three dark roles, in order of depth:** ink (emphasis panel, belongs to the page), viewer (lightbox, carries video, identical in both themes), and the demo thumbnail fills (inside the frame only). Do not substitute one for another.
- **Selected items:** a 2px #0E1116 (or primary) border instead of a shadow.
- **Dark ink panels:** the strongest emphasis on a light page. Use at most one or two per screen.
- **Segmented controls:** the active segment may use a very subtle shadow (0 1px 2px rgba(0,0,0,0.08)).
- **Avoid, in the studio:** gradients, glows and glassmorphism. This is a rule about the instrument, not about the brand — the public site uses all three deliberately (see "The public site" below). Scoped on 2026-11-11 with D25; before that it read as universal, which the gold-and-ink site would have silently broken.

## The public site — gold and ink

Adopted 2026-11-11 from `docs/design/handoff-v4` (D25). The site and the studio are two registers and do **not** share a palette. Everything above this section describes the studio; this section is the marketing pages only.

- **It is not a theme.** The site alternates bands — ink `#0E1116`, ink-alt `#141920`, snow `#F7F6F2`, white `#FFFFFF` — section by section, as art direction. There is no light/dark toggle on the public pages and `.dark` does not reach them. The `.band-*` utilities in `theme.css` remap the semantic tokens inside their own subtree, so `Card` and `Button` render correctly in any band with no site-specific variants.
- **Gold:** `#C8A24A` primary, `#F5B83D` bright (on ink), `#A6842F` deep (display text on light), `#F6E7B8` wash. The display gradient is `linear-gradient(135deg, #F5B83D 0%, #C8A24A 45%, #A6842F 100%)`, used on **one accent phrase per headline, never two**.
- **Small gold text on a light band uses `#886611`, not `#A6842F`.** The deep gold scores 3.26:1 on snow — fine for display at 44px and up, where the bar is 3:1, and a failure for a 13px eyebrow. Two tokens, not one, and they are not interchangeable.
- **The faintest text on ink is `#80868F`.** The handoff specified `#7A8089`; it scores 4.16:1 on the darkest card, under AA. Corrected by the smallest step that clears 4.5:1.
- **Display face: Geist Serif**, weight 400, from the `geist` package. The handoff asks for Fraunces; Vlad kept Geist (D25). There is no italic in the family, so the handoff's gold *italic* accent phrase is upright here and the gradient carries the emphasis alone.
- **Gradients, glows and a scroll progress bar are correct here** and wrong in the studio.

## Shapes

- **Cards:** 10px radius; large previews and wizard panels 14px.
- **Buttons and inputs:** 8px radius. Tiny thumbnails and log rows 4px.
- **Video thumbnails: 20px.** The one deliberate exception to the machined scale, and the only place that reads as consumer software on purpose. A 9:16 frame is a phone screen, and at 6px it read as a table cell. Measured against the references in `docs/design/COMPETITOR_REFERENCES.md`: Vizard ships 24px on the same shape. 20px rather than 24px so the frame still sits inside a 10px card without the corners fighting.
- **Chips, pills and progress bars:** fully rounded.
- The rest of the scale tightened by about 2px from the first version. Softer corners read as consumer software; machined corners read as an instrument — the chrome stays an instrument, the footage does not. Nothing goes below 4px, because a 2px corner on a 1px border renders as a notch rather than a radius.
- **Logo:** an open circle with an arrow (a loop) in accent coral. The loop motif repeats in empty states and the learning-loop card.
- **Icons:** simple 1.6–2px stroke icons. No emoji, no 3D, no robots or sparkles.

## Motion

Motion explains state changes. It never decorates.

- **Explicit curves.** The CSS keywords are too weak to read as intent. Entering uses `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, the default for UI. Something already on screen moving somewhere else uses `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`. Drawers and sheets use `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
- **Never `ease-in` on UI.** It starts slow, which reads as lag. There is no token for it.
- **Durations:** press 140ms, tooltip 160ms, dropdown 200ms, modal 280ms. Nothing over 300ms; past that an interface stops feeling like an instrument. Exits run at about 65% of their enter, because the user has already decided to leave.
- **Press:** interactive surfaces may dip to `scale(0.97)` on `:active` over 140ms, on fine pointers only. Touch has no `:active` window worth animating.
- **Stagger:** a list may offset its children by 60ms a step (`animation-delay: calc(var(--index) * 60ms)`), up to about six items. Past that it stops feeling like one gesture.
- **Reduced motion:** everything collapses under `prefers-reduced-motion: reduce`. The duration tokens themselves go to about zero, so components built on them go still too, and the press transform is dropped rather than merely sped up.

## Components

- **Button primary:** primary fill, white label, 48px tall (44px minimum). One per section. Labels: "New upload", "Remake for my brand", "Approve and make 5 variants".
- **Button secondary:** white with a #CBD0D8 border and dark text. A tertiary text button in deep coral is used for low-emphasis actions.
- **Sidebar nav item:** 44px tall; the active one uses accent-soft with dark-coral text.
- **Metric tile:** label in Geist, big number in Geist Mono, coral sparkline, and a green delta line ("+18% vs last week").
- **Viewer panel:** a near-black lightbox holding the 9:16 frame, in both themes, with the AI label and any length or cut badges sitting on it. Controls and captions use on-viewer text.
- **Video card:** 9:16 thumbnail with a burned-in caption, a length badge (top left) and cut number (top right); then format and score, a compliance chip, an optional reason line, and Preview plus Approve/Review/Fix buttons.
- **Status chip:** a soft background and dark text, always with a word: Passed, Needs review, Blocked, Scheduled, Published, Published (private).
- **Agent status pill:** a dot plus a word: Working (coral), Idle (grey), Waiting for you (amber), Blocked (red), Off.
- **Agent log line:** one line per step in an inset well, in Geist Mono — timestamp, agent, what it did, what it cost. Lines may arrive staggered at 60ms a step. This is the glass box; it is never collapsed by default on the Agents screen.
- **Spend cap:** a mono pill reading spent against limit ("$6 / $25") with a thin bar. It shows wherever an agent can spend money, not only in Settings.
- **Trend card:** niche chip and growth figure, the format name, an abstract 4-frame storyboard (empty 9:16 frames with a coloured bar and a beat label, never a real video), "why it works", a "Fit for Maya" bar, and the primary "Remake for my brand".
- **Compliance panel:** green border with a "Passed" pill and a ticked checklist, e.g. "No original footage used" and "New wording · 12% similar (limit 30%)" — the figures in mono.
- **Calendar post chip:** time in mono, tiny thumbnail and truncated title, with a 4px left edge showing status: grey published, blue scheduled, amber review, green approved.
- **AI label:** a small white badge reading "AI scene" on any thumbnail or preview with AI-generated footage.
- **Funnel:** horizontal bars on one shared scale, with counts and step rates in mono, so the real drop-off shows.
- **Empty state:** the loop logo, a short title and one helpful line ("Drop a long video. We'll find the moments worth posting.").
- **Alert bar:** soft red background, dark red text and a solid action button ("Reconnect Instagram").

## Do's and Don'ts

**Do**

- Keep the client's videos as the visual hero; the interface stays quiet.
- Put 9:16 video on the viewer surface, in both themes, so footage looks the same to everyone who approves it.
- Set the machine's output — logs, costs, timings, caps, counts, rates — in Geist Mono, and everything the studio says in Geist.
- Show trust on screen: AI labels, compliance results, approvals, consent records.
- Pair every colour-coded status with a word.
- Use real-looking but fictional data from the demo client, consistently across screens, and label demo data as sample data on public pages.
- Keep white text only on primary (#C8401C), ink or the viewer; never on the bright accent.
- Keep touch targets at 44px or larger and text contrast at 4.5:1 or higher.
- Animate with the easing tokens, out-curves for entering, and let everything collapse under reduced motion.

**Don't**

- Don't use purple or blue "AI" gradients, glowing robots, sparkles or emoji.
- Don't set product sentences in mono to look technical, or costs and timings in Geist Sans.
- Don't swap ink and the viewer, and don't let the viewer surface follow the theme.
- Don't show real people, real creators' videos or real brand logos (small platform names and icons are fine).
- Don't promise results: no "go viral", "10x your followers" or guaranteed views.
- Don't show a trend as someone else's video; show the format as an abstract storyboard.
- Don't use heavy shadows, glassmorphism or more than one bright accent per area.
- Don't use `ease-in`, a UI duration over 300ms, or motion a user cannot turn off.

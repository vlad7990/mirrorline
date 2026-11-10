---
name: Mirrorline
description: Calm, editorial design system for an AI content studio that turns a brand's own videos into daily short-form posts. Placeholder product name.
colors:
  primary: "#C8401C"
  on-primary: "#FFFFFF"
  accent: "#FF5A36"
  accent-soft: "#FFE8E1"
  on-accent-soft: "#8F2C11"
  background: "#FAFAF7"
  surface: "#FFFFFF"
  border: "#E6E4DD"
  border-strong: "#D6D3CA"
  text: "#14171C"
  text-muted: "#5F6672"
  ink: "#14171C"
  on-ink: "#F2F2EE"
  success: "#1F9D6B"
  success-soft: "#E3F4EC"
  on-success-soft: "#145C40"
  warning: "#C98A12"
  warning-soft: "#FBF0D9"
  on-warning-soft: "#6E4A07"
  danger: "#D23F3F"
  danger-soft: "#FBE3E3"
  on-danger-soft: "#8E2626"
  info: "#2F6FDE"
  info-soft: "#E3ECFB"
  on-info-soft: "#1F4FA8"
  neutral-soft: "#EFEDE7"
  on-neutral-soft: "#3E444D"
  dark-background: "#0E1116"
  dark-surface: "#161A21"
  dark-border: "#2A2F38"
  dark-text: "#F2F2EE"
  dark-text-muted: "#A3A9B4"
  dark-accent: "#FF7A5C"
  brand-demo-teal: "#12545A"
  brand-demo-sand: "#F3E9DC"
typography:
  display:
    fontFamily: Inter Tight
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  headline:
    fontFamily: Inter Tight
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: Inter Tight
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  subtitle:
    fontFamily: Inter Tight
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.55
  label:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
  metric:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.1
  overlay-caption:
    fontFamily: Inter Tight
    fontSize: 17px
    fontWeight: 700
    lineHeight: 1.25
rounded:
  sm: 6px
  md: 10px
  lg: 12px
  xl: 16px
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
  video-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 10px
  video-thumbnail:
    backgroundColor: "{colors.brand-demo-teal}"
    textColor: "{colors.on-primary}"
    typography: "{typography.overlay-caption}"
    rounded: "{rounded.sm}"
  metric-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.metric}"
    rounded: "{rounded.lg}"
    padding: 18px 20px
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
---

## Overview

Mirrorline is a web app (with a small mobile companion) for coaches, consultants and local service businesses. It turns a client's own long videos, and formats trending in their niche, into original short vertical videos. A team of seven AI agents (Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher, Performance Analyst) then posts them several times a day to the client's own accounts, and learns from the results.

The design should feel like a **calm, expert studio partner**: editorial, light, generous white space, with the client's 9:16 videos as the hero. The interface stays quiet so the content and the numbers stand out.

The design also has to make trust visible. AI labels, compliance checks, approvals and honest numbers are part of the product, not fine print.

Personality: clear, alive, trustworthy. Voice: plain verbs, real numbers, sentence case, no exclamation marks, no guarantees. Examples: "12 cuts ready. 3 need your eye before they post." · "We remake the format, never the footage." · "TikTok posts stay private until our app is approved."

The demo content belongs to a fictional client, "Maya Torres Coaching". "Mirrorline" is a placeholder name.

## Colors

- **Primary (#C8401C):** a deep coral for primary buttons and key actions. White text on it passes 4.5:1 contrast.
- **Accent (#FF5A36):** a bright coral for the loop logo, sparklines, progress and fit bars, and highlights. It never carries white body text.
- **Accent soft (#FFE8E1):** the active navigation item, selected options and "working" agent states.
- **Background (#FAFAF7) and surface (#FFFFFF):** a warm off-white page with white cards and 1px #E6E4DD borders.
- **Text (#14171C) and text muted (#5F6672):** near-black for content, slate grey for metadata.
- **Ink (#14171C):** dark insight panels, such as the "Learning loop" card and the batch-approval bar.
- **Status colours:** green = passed or published, amber = needs review, red = blocked or error, blue = scheduled or info. Each one is used as a soft background with darker text in pills, and always paired with a word.
- **Dark theme:** background #0E1116, surface #161A21, border #2A2F38, text #F2F2EE, muted #A3A9B4, accent #FF7A5C. The mobile approvals screen uses it.
- **Demo brand colours (inside thumbnails only):** teal #12545A, sand #F3E9DC. Thumbnails rotate #12545A, #1E3A40, #2F3E46 and #6B4F3A.

## Typography

- **Headings:** Inter Tight, 600–700. Page titles 32px, card titles 18–20px.
- **Body:** Inter 15px with a 1.55 line height; metadata 13px; chips and small labels 12px, 600.
- **Metrics:** Inter 30px, 600, tabular figures, so columns of numbers line up.
- **Captions on video thumbnails:** Inter Tight 700, white, with the key phrase highlighted on a sand background in teal.
- **Case:** sentence case everywhere. Uppercase only for small section eyebrows (12–13px, letter-spacing 0.06em).

## Layout

- **Desktop at 1440px:** a fixed 240px left sidebar and a fluid content area with 32–40px padding. Sidebar contents, in order:
  - logo
  - workspace switcher ("Maya Torres Coaching · Growth plan")
  - navigation: Home, Upload, Trends, Calendar, Results, Agents, Brand kit, Settings
  - usage meter ("63 of 90 posts") at the bottom
- **Content layout:** a page header with a small eyebrow, a title and the primary action on the right. Below it sit card grids, 3–4 columns for metric tiles and trend cards, with auto-fill grids of 172px-minimum cards for videos.
- **Spacing:** an 8px grid. Gaps between cards are 16–24px; card padding is 18–22px.
- **Mobile at 390 × 844:** single column, 18px side padding, large touch targets, primary actions at the bottom within thumb reach.
- **Wide content** (the calendar week grid, tables) scrolls horizontally inside its card instead of breaking the page.

## Elevation & Depth

- **Flat by default:** depth comes from 1px borders and the contrast between surface and background, not shadows.
- **Selected items:** a 2px #14171C (or primary) border instead of a shadow.
- **Dark ink panels:** the strongest emphasis on a light page. Use at most one or two per screen.
- **Segmented controls:** the active segment may use a very subtle shadow (0 1px 2px rgba(0,0,0,0.08)).
- **Avoid:** gradients, glows and glassmorphism.

## Shapes

- **Cards:** 12px radius; large previews and wizard panels 16px.
- **Buttons and inputs:** 10px radius. Video thumbnails 8px; tiny thumbnails 4–6px.
- **Chips, pills and progress bars:** fully rounded.
- **Logo:** an open circle with an arrow (a loop) in accent coral. The loop motif repeats in empty states and the learning-loop card.
- **Icons:** simple 1.6–2px stroke icons. No emoji, no 3D, no robots or sparkles.

## Components

- **Button primary:** primary fill, white label, 48px tall (44px minimum). One per section. Labels: "New upload", "Remake for my brand", "Approve and make 5 variants".
- **Button secondary:** white with a #D6D3CA border and dark text. A tertiary text button in deep coral is used for low-emphasis actions.
- **Sidebar nav item:** 44px tall; the active one uses accent-soft with dark-coral text.
- **Metric tile:** label, big number, coral sparkline, and a green delta line ("+18% vs last week").
- **Video card:** 9:16 thumbnail with a burned-in caption, a length badge (top left) and cut number (top right); then format and score, a compliance chip, an optional reason line, and Preview plus Approve/Review/Fix buttons.
- **Status chip:** a soft background and dark text, always with a word: Passed, Needs review, Blocked, Scheduled, Published, Published (private).
- **Agent status pill:** a dot plus a word: Working (coral), Idle (grey), Waiting for you (amber), Blocked (red), Off.
- **Trend card:** niche chip and growth figure, the format name, an abstract 4-frame storyboard (empty 9:16 frames with a coloured bar and a beat label, never a real video), "why it works", a "Fit for Maya" bar, and the primary "Remake for my brand".
- **Compliance panel:** green border with a "Passed" pill and a ticked checklist, e.g. "No original footage used" and "New wording · 12% similar (limit 30%)".
- **Calendar post chip:** time, tiny thumbnail and truncated title, with a 4px left edge showing status: grey published, blue scheduled, amber review, green approved.
- **AI label:** a small white badge reading "AI scene" on any thumbnail or preview with AI-generated footage.
- **Funnel:** horizontal bars on one shared scale, with counts and step rates, so the real drop-off shows.
- **Empty state:** the loop logo, a short title and one helpful line ("Drop a long video. We'll find the moments worth posting.").
- **Alert bar:** soft red background, dark red text and a solid action button ("Reconnect Instagram").

## Do's and Don'ts

**Do**
- Keep the client's videos as the visual hero; the interface stays quiet.
- Show trust on screen: AI labels, compliance results, approvals, consent records.
- Pair every colour-coded status with a word.
- Use real-looking but fictional data from the demo client, consistently across screens.
- Keep white text only on primary (#C8401C) or ink; never on the bright accent.
- Keep touch targets at 44px or larger and text contrast at 4.5:1 or higher.

**Don't**
- Don't use purple or blue "AI" gradients, glowing robots, sparkles or emoji.
- Don't show real people, real creators' videos or real brand logos (small platform names and icons are fine).
- Don't promise results: no "go viral", "10x your followers" or guaranteed views.
- Don't show a trend as someone else's video; show the format as an abstract storyboard.
- Don't use heavy shadows, glassmorphism or more than one bright accent per area.

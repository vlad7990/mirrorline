# Mirrorline · Design Review & Hand-off Brief for Claude & Claude Design

**Product Title:** Mirrorline (Working Title / Placeholder)  
**Session Date:** November 2026  
**Audience:** Claude Design (Visual Critique & Polish), Claude (Architecture & UX Strategy)  
**Deliverable Status:** 17 Complete Screens, Design Token System, 2 Interactive Prototype Players, and Local Next.js 15 Scaffold Kit  

---

## 1. Executive Summary & Product Intent

**Mirrorline** is an AI content engine for coaches, consultants, and boutique service firms. It converts a creator's own long-form videos (webinars, podcast episodes, coaching sessions) and niche trend intelligence into daily, high-converting, compliant 9:16 short-form videos across TikTok, Instagram Reels, and YouTube Shorts.

### The Problem It Solves
Existing AI clip makers often output generic captions, questionable copyright material, and lack brand consistency. Mirrorline operates with a **calm, editorial studio aesthetic** where:
1. **The client's video is the hero:** Quiet UI chrome, 1px structural borders, and generous white space.
2. **Trust & compliance are foregrounded:** Verifiable similarity scores (<30%), voice consent records, explicit "AI scene" disclosures, and creator tone approvals.
3. **Loop learning:** A loop of 7 specialized AI agents where every post's hook and conversion performance informs the next week's scriptwriting.

---

## 2. Inventory of Screens & Artifacts Created

### Public & Authentication Flows
- **`MKT01` · Public Marketing Website:** High-converting landing page showcasing the 7-agent loop, editorial aesthetic, honest pricing, and ethical AI safeguards.
- **`AUTH01` · Studio Sign Up:** 3-step registration flow with Google/Apple SSO, trial setup, and explicit rights confirmation checkbox.
- **`AUTH02` · Studio Sign In:** Clean credentials and magic-link authentication with workspace switcher for multi-account management.

### Desktop Core Studio (S01–S10)
- **`S01` · Onboarding Wizard:** 3-step setup (Brand Kit & Colors → Account Connections → Niche & Goals) paired with an interactive 9:16 Live Preview.
- **`S02` · Home (Command Centre):** Daily cockpit with weekly metrics (Views, Link Clicks, Calls Booked), triage queue (*Needs You*), Today's post schedule, and dark ink *Learning Loop* summary.
- **`S03` · Upload & Multiply:** Ingestion screen turning a 52-minute video into 12 scored 9:16 cuts with compliance status badges (Passed, Needs Review, Blocked).
- **`S04` · Trend Board:** Abstract 4-beat format storyboards (no stolen creator video), niche tags, growth metrics, and "Fit for Maya" ratings.
- **`S05` · Remake Studio:** Format recipe deconstruction, generated script, shot list with AI scene disclosures, 9:16 thumbnail preview, and compliance checklist.
- **`S06` · Calendar & Approvals:** 7-day multi-platform scheduling grid with status indicators, review drawer, and batch approval bar.
- **`S07` · Results & Analytics:** Proportional views-to-calls conversion funnel, top post leaderboard, hook performance analysis, and post-time heatmap.
- **`S08` · The Seven Agents:** Visual loop diagram, individual agent budget/spend caps, kill-switches, and audit log.
- **`S09` · Brand Kit:** Logo asset manager, color swatches (Teal `#12545A`, Sand `#F3E9DC`, Coral `#FF5A36`, Ink `#14171C`), caption typography styles, and voice consent record.
- **`S10` · Settings & Billing:** Connected social accounts, Growth plan usage meter (63/90 posts), Appearance theme selector (Light/Dark/System), and data rights export/revoke.

### Mobile Companion & Prototypes
- **`M1` · Mobile Approvals:** Native 9:16 review experience with swipe-right (approve), swipe-left (send back), feedback tags, and undo capabilities.
- **`M2` · Mobile Executive Home:** Quick daily health pulse, pending approvals banner, and scheduled queue.
- **`PROTO-D` · Unified Desktop Prototype Viewer:** Switch between S01–S10 with theme toggle and live status.
- **`PROTO-M` · Theme-Synced Mobile Companion Prototype:** Interactive mobile viewer supporting touch swipe gestures, undo stack, and completion states.

---

## 3. Design System & Token Foundation

The design system is codified in `design-tokens.css` and `DESIGN.md`:

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--color-primary` | `#C8401C` | `#C8401C` | Primary CTA, passes WCAG AA $\ge$4.5:1 against white |
| `--color-accent` | `#FF5A36` | `#FF7A5C` | Brand loop logo, sparklines, progress bars, highlights |
| `--color-accent-soft` | `#FFE8E1` | `rgba(255,122,92,0.15)` | Active navigation background, agent status chips |
| `--color-bg` | `#FAFAF7` | `#0E1116` | Warm off-white editorial background (Light) / Charcoal (Dark) |
| `--color-surface` | `#FFFFFF` | `#161A21` | Card and panel containers |
| `--color-border` | `#E6E4DD` | `#2A2F38` | Strict 1px structural borders (no heavy drop shadows) |
| `--color-text` | `#14171C` | `#F2F2EE` | Editorial primary text |
| `--color-text-muted` | `#5F6672` | `#A3A9B4` | Secondary metadata |
| `--color-ink` | `#14171C` | `#161A21` | High-contrast dark cards (*Learning Loop*, batch bars) |
| `--color-demo-teal` | `#12545A` | `#12545A` | Client demo thumbnail background |
| `--color-demo-sand` | `#F3E9DC` | `#F3E9DC` | Client demo caption highlight background |

**Typography:**
- **Headings & Accents:** *Inter Tight* (700/600), sentence case, tracking -0.01em.
- **Body & Controls:** *Inter* (400/500/600), 1.55 line height.
- **Data & Metrics:** *Inter* tabular figures (`tnum`, `lnum`) at 30px.

---

## 4. Key Questions & Review Angles for Claude Design

1. **Visual Hierarchy & White Space Rhythm:**
   - Does the 240px fixed sidebar and fluid 32–40px content padding feel appropriately balanced across 1440px viewport widths?
   - Is the contrast between `#FAFAF7` canvas, `#FFFFFF` cards, and `#14171C` ink panels sufficiently clear without feeling stark?

2. **Mobile Interaction States:**
   - In `M1 Mobile Approvals`, is the swipe instruction (*"Swipe right to approve, left to send back"*) and undo affordance clear enough for busy executives?
   - Is the dark focus mode for video review optimal for video viewing compared to the light home screen?

3. **Ethical AI & Compliance Presentation:**
   - Are the "AI scene" badges and similarity percentages positioned clearly without distracting from video engagement?
   - How can we further refine the abstract trend storyboards in `S04` so users intuitively understand they are remaking the format rather than copying content?

---

## 5. Next Steps for Claude Code Handoff

Once review feedback from Claude Design is gathered:
1. Provide `CLAUDE_CODE_EXPORT_PACK.md` and `EXPORT_AND_DOWNLOAD_GUIDE.md` to Claude Code.
2. Initialize repository using the Next.js 15 App Router scaffold script.
3. Import `design-tokens.css` and hook into React Context for Light/Dark/System mode switching.
4. Wire mock data (`mock-data.json`) to dynamic route handlers.

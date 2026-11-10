# Mirrorline · Claude Code Handoff & Implementation Package
**Version 1.0.0** · November 2026  
**Target Environment:** Full-stack Next.js 15 (App Router), Tailwind CSS v4, TypeScript, Lucide Icons, Shadcn UI / Radix primitives.

---

## 1. Executive Summary & Product Architecture

**Mirrorline** (working title) is an AI content engine built for coaches, consultants, and boutique service providers. It transforms long-form client recordings and niche trend intelligence into daily, compliant short-form vertical videos (9:16) published directly across TikTok, Instagram Reels, and YouTube Shorts.

The application operates as an orchestrated autonomous loop of **seven AI agents**:
1. **Trend Scout:** Monitors niche formats, audio, and hook pacing.
2. **Remake Producer:** Drafts new scripts tailored to client voice without infringing on original IP.
3. **Multiplier:** Chunks long-form footage into 8–15 distinct cuts with automated transcription and reframing.
4. **Compliance Agent:** Validates similarity (<30%), detects audio rights, verifies likeness consent, and mandates AI labeling.
5. **Client Concierge:** Manages approval queues, notifications, and client feedback.
6. **Publisher Agent:** Handles scheduling and official platform API dispatching.
7. **Performance Analyst:** Aggregates analytics, correlates hook structures with conversions, and feeds back into the Trend Scout.

---

## 2. Complete Token System (`design-tokens.json`)

```json
{
  "name": "Mirrorline Design Tokens",
  "version": "1.0.0",
  "color": {
    "primary": { "value": "#C8401C", "comment": "Primary CTA, high contrast on white (>=4.5:1)" },
    "primary-hover": { "value": "#B33716" },
    "on-primary": { "value": "#FFFFFF" },
    "accent": { "value": "#FF5A36", "comment": "Bright coral for sparks, loops, fit bars. Never white body text" },
    "accent-soft": { "value": "#FFE8E1", "comment": "Active nav background, selected options, working agent chips" },
    "on-accent-soft": { "value": "#8F2C11" },
    "background": { "value": "#FAFAF7", "comment": "Warm editorial off-white page background" },
    "surface": { "value": "#FFFFFF", "comment": "Pure white card & panel background" },
    "surface-subtle": { "value": "#F4F4F1" },
    "border": { "value": "#E6E4DD", "comment": "Standard 1px structural border" },
    "border-strong": { "value": "#D6D3CA" },
    "text": { "value": "#14171C", "comment": "Near-black editorial primary typography" },
    "text-muted": { "value": "#5F6672", "comment": "Slate metadata and secondary copy" },
    "ink": { "value": "#14171C", "comment": "High-emphasis dark card containers" },
    "on-ink": { "value": "#F2F2EE" },
    "status": {
      "success": { "value": "#1F9D6B" },
      "success-soft": { "value": "#E3F4EC" },
      "on-success-soft": { "value": "#145C40" },
      "warning": { "value": "#C98A12" },
      "warning-soft": { "value": "#FBF0D9" },
      "on-warning-soft": { "value": "#6E4A07" },
      "danger": { "value": "#D23F3F" },
      "danger-soft": { "value": "#FBE3E3" },
      "on-danger-soft": { "value": "#8E2626" },
      "info": { "value": "#2F6FDE" },
      "info-soft": { "value": "#E3ECFB" },
      "on-info-soft": { "value": "#1F4FA8" },
      "neutral-soft": { "value": "#EFEDE7" },
      "on-neutral-soft": { "value": "#3E444D" }
    },
    "dark": {
      "background": { "value": "#0E1116" },
      "surface": { "value": "#161A21" },
      "surface-container": { "value": "#1E242E" },
      "border": { "value": "#2A2F38" },
      "border-strong": { "value": "#3B4250" },
      "text": { "value": "#F2F2EE" },
      "text-muted": { "value": "#A3A9B4" },
      "accent": { "value": "#FF7A5C" }
    },
    "demo": {
      "teal": { "value": "#12545A" },
      "teal-deep": { "value": "#1E3A40" },
      "teal-slate": { "value": "#2F3E46" },
      "sand": { "value": "#F3E9DC" },
      "warm-earth": { "value": "#6B4F3A" }
    }
  },
  "typography": {
    "fontFamily": {
      "heading": "Inter Tight, sans-serif",
      "body": "Inter, sans-serif",
      "mono": "ui-monospace, SFMono-Regular, monospace"
    },
    "fontSize": {
      "display": { "size": "44px", "lineHeight": "1.1", "weight": "700", "letterSpacing": "-0.01em" },
      "headline": { "size": "32px", "lineHeight": "1.15", "weight": "700" },
      "title": { "size": "20px", "lineHeight": "1.3", "weight": "600" },
      "subtitle": { "size": "18px", "lineHeight": "1.3", "weight": "600" },
      "body": { "size": "15px", "lineHeight": "1.55", "weight": "400" },
      "body-strong": { "size": "15px", "lineHeight": "1.55", "weight": "600" },
      "label": { "size": "14px", "lineHeight": "1.4", "weight": "600" },
      "meta": { "size": "13px", "lineHeight": "1.45", "weight": "400" },
      "caption": { "size": "12px", "lineHeight": "1.35", "weight": "600" },
      "metric": { "size": "30px", "lineHeight": "1.1", "weight": "600" },
      "overlay-caption": { "size": "17px", "lineHeight": "1.25", "weight": "700" }
    }
  },
  "radius": {
    "sm": "6px",
    "md": "10px",
    "lg": "12px",
    "xl": "16px",
    "full": "9999px"
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "xxl": "40px",
    "sidebar": "240px"
  }
}
```

---

## 3. Tailwind CSS Configuration (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#C8401C',
          'primary-hover': '#B33716',
          accent: '#FF5A36',
          'accent-soft': '#FFE8E1',
          'on-accent-soft': '#8F2C11',
          bg: '#FAFAF7',
          surface: '#FFFFFF',
          'surface-subtle': '#F4F4F1',
          border: '#E6E4DD',
          'border-strong': '#D6D3CA',
          text: '#14171C',
          'text-muted': '#5F6672',
          ink: '#14171C',
          'on-ink': '#F2F2EE',
          // Dark mode
          'dark-bg': '#0E1116',
          'dark-surface': '#161A21',
          'dark-container': '#1E242E',
          'dark-border': '#2A2F38',
          'dark-border-strong': '#3B4250',
          'dark-text': '#F2F2EE',
          'dark-muted': '#A3A9B4',
          'dark-accent': '#FF7A5C',
          // Demo Brand
          'demo-teal': '#12545A',
          'demo-sand': '#F3E9DC',
        },
        status: {
          success: '#1F9D6B',
          'success-soft': '#E3F4EC',
          'on-success': '#145C40',
          warning: '#C98A12',
          'warning-soft': '#FBF0D9',
          'on-warning': '#6E4A07',
          danger: '#D23F3F',
          'danger-soft': '#FBE3E3',
          'on-danger': '#8E2626',
          info: '#2F6FDE',
          'info-soft': '#E3ECFB',
          'on-info': '#1F4FA8',
          neutral: '#EFEDE7',
          'on-neutral': '#3E444D',
        }
      },
      fontFamily: {
        heading: ['Inter Tight', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      width: {
        sidebar: '240px',
      }
    },
  },
  plugins: [],
};
export default config;
```

---

## 4. Screen Directory & Route Map

| Screen ID | Canvas ID | Route | Device | Screen Name & Purpose |
|---|---|---|---|---|
| **MKT01** | `{{DATA:SCREEN:SCREEN_8}}` | `/` | Desktop | Public Marketing Website (Pitch, Hero, Agent Loop, Pricing, Ethics) |
| **AUTH01** | `{{DATA:SCREEN:SCREEN_7}}` | `/signup` | Desktop | Sign Up — Studio Registration (Email/SSO, Trial, Rights Consent) |
| **AUTH02** | `{{DATA:SCREEN:SCREEN_5}}` | `/signin` | Desktop | Sign In — Studio Access (Credentials, Magic Link, Workspace Selector) |
| **S01** | `{{DATA:SCREEN:SCREEN_17}}` | `/app/onboarding` | Desktop | Onboarding 3-Step Wizard (Brand Kit, Accounts, Niche & Live Preview) |
| **S02** | `{{DATA:SCREEN:SCREEN_27}}` | `/app/home` | Desktop | Command Centre (Daily metrics, Needs You review list, Today's schedule, Learning Loop) |
| **S03** | `{{DATA:SCREEN:SCREEN_25}}` | `/app/upload` | Desktop | Upload & Multiply (One long video → 12 scored cuts with status) |
| **S04** | `{{DATA:SCREEN:SCREEN_24}}` | `/app/trends` | Desktop | Trend Board (Rising niche formats, abstract storyboards, fit scores) |
| **S05** | `{{DATA:SCREEN:SCREEN_23}}` | `/app/remake` | Desktop | Remake Studio (Format recipe, new script, 9:16 preview, compliance checklist) |
| **S06** | `{{DATA:SCREEN:SCREEN_22}}` | `/app/calendar` | Desktop | Calendar & Approvals (Multi-platform weekly grid, review drawer, batch approve) |
| **S07** | `{{DATA:SCREEN:SCREEN_20}}` | `/app/results` | Desktop | Results & Analytics (Views-to-calls funnel, hook performance rankings, heatmap) |
| **S08** | `{{DATA:SCREEN:SCREEN_21}}` | `/app/agents` | Desktop | The Seven Agents (Pipeline loop, individual agent spend/caps/toggles, audit log) |
| **S09** | `{{DATA:SCREEN:SCREEN_19}}` | `/app/brand-kit` | Desktop | Brand Kit (Logos, colors, caption styles, voice releases, word rules) |
| **S10** | `{{DATA:SCREEN:SCREEN_18}}` | `/app/settings` | Desktop | Settings & Billing (Accounts, Growth plan meter, Appearance theme controls, Data rights) |
| **M1** | `{{DATA:SCREEN:SCREEN_16}}` | `/m/review` | Mobile | Mobile Approvals (9:16 card focus, swipe right/left, reasons, undo) |
| **M2** | `{{DATA:SCREEN:SCREEN_15}}` | `/m/home` | Mobile | Mobile Executive Home (Daily health, pending approvals counter, queue, loop insight) |
| **PROTO-D** | `{{DATA:SCREEN:SCREEN_14}}` | `/prototype/desktop` | Desktop | Unified Interactive Desktop Demo Player (Full multi-screen switcher & state sync) |
| **PROTO-M** | `{{DATA:SCREEN:SCREEN_3}}` | `/prototype/mobile` | Mobile | Interactive Mobile Companion Prototype (Swipeable queue, Light/Dark/System sync) |

---

## 5. Domain Mock Data (`mock-data.json`)

```json
{
  "client": {
    "name": "Maya Torres Coaching",
    "owner": "Maya Torres",
    "handle": "@mayatorres.coach",
    "plan": "Growth plan",
    "monthlyQuota": 90,
    "usedQuota": 63,
    "trafficUrl": "mayatorres.example/call",
    "voiceReleaseDate": "2026-11-09",
    "niche": "Coaching",
    "nearbyNiches": ["Leadership", "Productivity", "Wellness"]
  },
  "metrics": {
    "postsThisWeek": 21,
    "views": 48300,
    "viewsGrowth": "+18%",
    "profileVisits": 1930,
    "linkClicks": 214,
    "linkClicksGrowth": "+22%",
    "leads": 31,
    "callsBooked": 6,
    "callsBookedGrowth": "+2"
  },
  "agents": [
    { "id": "trend-scout", "name": "Trend Scout", "status": "working", "spend": 6, "cap": 25, "active": true },
    { "id": "remake-producer", "name": "Remake Producer", "status": "waiting", "spend": 18, "cap": 60, "active": true },
    { "id": "multiplier", "name": "Multiplier", "status": "idle", "spend": 9, "cap": 40, "active": true },
    { "id": "compliance", "name": "Compliance", "status": "working", "spend": 3, "cap": 15, "active": true },
    { "id": "client-concierge", "name": "Client Concierge", "status": "idle", "spend": 2, "cap": 10, "active": true },
    { "id": "publisher", "name": "Publisher", "status": "working", "spend": 1, "cap": 10, "active": true },
    { "id": "performance-analyst", "name": "Performance Analyst", "status": "working", "spend": 4, "cap": 20, "active": true }
  ],
  "reviewQueue": [
    {
      "id": "cut-5",
      "cutNumber": 5,
      "platform": "TikTok",
      "scheduledTime": "Today 7:45 pm",
      "hook": "New managers: stop saying \"let me know if you need anything\"",
      "body": "Try this instead: \"What's one thing I can take off your plate this week?\" Book a free call, link in bio.",
      "status": "needs-review",
      "reason": "Wait for creator tone confirmation",
      "tags": ["Wrong tone", "Wrong fact", "Change the hook"]
    },
    {
      "id": "cut-6",
      "cutNumber": 6,
      "platform": "Instagram",
      "scheduledTime": "Today 2:15 pm",
      "hook": "What I'd tell myself in my first month as a manager",
      "body": "At my old agency, I thought being accessible meant replying in 30 seconds. It actually just burned my team out. Let's talk boundaries.",
      "status": "needs-review",
      "reason": "Mentions a former employer by name",
      "tags": ["Remove name", "Wrong tone", "Mute company ref"]
    },
    {
      "id": "cut-9",
      "cutNumber": 9,
      "platform": "YouTube Shorts",
      "scheduledTime": "Tomorrow 9:00 am",
      "hook": "A listener asked: how do I say no to my boss?",
      "body": "When your plate is already overflowing, saying 'yes' isn't helpful—it's risky. Here's the exact script I give my coaching clients.",
      "status": "needs-review",
      "reason": "A listener's name is visible on screen overlay",
      "tags": ["Blur name", "Wrong tone", "Re-cut hook"]
    }
  ]
}
```

---

## 6. Implementation Guide & Instructions for Claude Code

### A. Repository Setup
1. Initialize repository: `npx create-next-app@latest mirrorline --typescript --tailwind --app --eslint`
2. Configure Tailwind with `@/lib/tokens` or direct theme extension matching Section 3.
3. Configure `ThemeContext` providing `'light' | 'dark' | 'system'` state synced to `localStorage`.

### B. Core Architectural Principles to Uphold
1. **The Client's Video is the Hero:** Keep UI container chrome subdued (borders `#E6E4DD`, surfaces `#FFFFFF`, background `#FAFAF7`).
2. **Visible Trust & Compliance:** Every single video card must render compliance badges (Passed/Needs review/Blocked) and explicit "AI scene" badges on synthesized footage.
3. **Calm Editorial Voice:** Sentence case everywhere. Plain verbs, verified statistics. Avoid exclamation points, "10x virality" tropes, purple AI gradients, or glowing bots.
4. **Mobile Approval State Machine:**
   - Supports touch drag left (`send-back`) and right (`approve`).
   - Maintains an undo stack for the last rejected/approved card.
   - Transitions to the verified "All caught up" state upon queue exhaustion.
5. **Horizontal Scroll Containment:** The calendar 7-day grid and results heatmaps must scroll within their cards rather than breaking the outer desktop viewport.

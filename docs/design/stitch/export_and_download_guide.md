# Mirrorline · Export & Download Guide for Claude Code / Developers

This guide provides step-by-step instructions and ready-to-run extraction scripts to download and organize all 17 screens, interactive prototypes, design tokens, and mock data from this Stitch canvas into your local codebase.

---

## 1. Export Overview

All artifacts from the Mirrorline design studio session are cataloged below.

| Category | Artifact Count | Details |
|---|---|---|
| **Public & Authentication** | 3 screens | Marketing landing page, Sign Up wizard, Sign In studio access |
| **Desktop App (S01–S10)** | 10 screens | Onboarding, Home, Upload & Multiply, Trends, Remake, Calendar, Results, Agents, Brand Kit, Settings |
| **Mobile Companion (M1–M2)** | 2 screens | Mobile Approvals (swipe/undo/compliance), Mobile Executive Home |
| **Interactive Prototypes** | 2 screens | Unified Desktop Prototype Viewer, Theme-Synced Mobile Companion Prototype |
| **Design System & Data** | 3 files | `design-tokens.json`, `tailwind.config.ts`, `mock-data.json` |

---

## 2. Quick Download via Stitch Canvas UI

You can download individual screens or all screens directly from the Stitch interface:

1. **Download HTML / Code for any screen:**
   - Click on any screen card on the canvas (e.g. `Unified Desktop Prototype Viewer` or `Mirrorline Public Marketing Website`).
   - Click the **Code (`</>`)** or **Export** button in the canvas inspector top bar.
   - Choose **Download HTML** to save the complete standalone file with inline Tailwind styles, Inter fonts, and SVG assets.
2. **Export to Figma:**
   - Select the desired screens on the canvas.
   - Use the **Export to Figma** option in the canvas toolbar to transfer native vector frames and auto-layout structures directly.

---

## 3. Project Directory Structure for Next.js 15 & Claude Code

When importing into a fresh Next.js project (`npx create-next-app@latest mirrorline --typescript --tailwind --app`), arrange your files as follows:

```
mirrorline/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider and Inter fonts
│   ├── page.tsx                # MKT01: Public Marketing Website
│   ├── (auth)/
│   │   ├── signup/page.tsx     # AUTH01: Sign Up Studio Registration
│   │   └── signin/page.tsx     # AUTH02: Sign In Studio Access
│   ├── app/
│   │   ├── layout.tsx          # Studio layout with 240px persistent sidebar
│   │   ├── onboarding/page.tsx # S01: Onboarding 3-step Wizard
│   │   ├── home/page.tsx       # S02: Command Centre
│   │   ├── upload/page.tsx     # S03: Upload and Multiply
│   │   ├── trends/page.tsx     # S04: Trend Board
│   │   ├── remake/page.tsx     # S05: Remake Studio
│   │   ├── calendar/page.tsx   # S06: Calendar & Approvals
│   │   ├── results/page.tsx    # S07: Results & Analytics
│   │   ├── agents/page.tsx     # S08: The Seven Agents Loop
│   │   ├── brand-kit/page.tsx  # S09: Brand Kit
│   │   └── settings/page.tsx   # S10: Settings, Billing & Theme
│   ├── m/
│   │   ├── home/page.tsx       # M2: Mobile Home
│   │   └── review/page.tsx     # M1: Mobile Approvals (Swipe & Undo)
│   └── prototype/
│       ├── desktop/page.tsx    # PROTO-D: Unified Desktop Prototype Player
│       └── mobile/page.tsx     # PROTO-M: Mobile Companion Prototype
├── components/
│   ├── ui/                     # Shadcn / Radix primitives
│   ├── navigation/             # TopNavBar, Sidebar (240px)
│   ├── video/                  # 9:16 VideoCard, Thumbnail, CaptionHighlight
│   └── compliance/             # ComplianceBadge, AIScenePill
├── context/
│   └── theme-context.tsx       # Light / Dark / System mode state sync
├── lib/
│   ├── tokens.ts               # Mirrorline design tokens
│   └── mock-data.json          # Fictional client data (Maya Torres)
└── tailwind.config.ts          # Extended brand & status color palette
```

---

## 4. Automated Project Setup Script (`setup-project.sh`)

Save and run this script in your terminal to initialize the project and write the configuration files:

```bash
#!/usr/bin/env bash
set -e

echo "🚀 Initializing Mirrorline project..."
mkdir -p mirrorline && cd mirrorline

# 1. Initialize Next.js project structure
mkdir -p app/(auth)/signup app/(auth)/signin
mkdir -p app/app/{onboarding,home,upload,trends,remake,calendar,results,agents,brand-kit,settings}
mkdir -p app/m/{home,review}
mkdir -p app/prototype/{desktop,mobile}
mkdir -p components/{ui,navigation,video,compliance}
mkdir -p context lib public

# 2. Write design tokens (lib/tokens.json)
cat << 'EOF' > lib/tokens.json
{
  "colors": {
    "primary": "#C8401C",
    "primaryHover": "#B33716",
    "accent": "#FF5A36",
    "accentSoft": "#FFE8E1",
    "onAccentSoft": "#8F2C11",
    "bg": "#FAFAF7",
    "surface": "#FFFFFF",
    "surfaceSubtle": "#F4F4F1",
    "border": "#E6E4DD",
    "borderStrong": "#D6D3CA",
    "text": "#14171C",
    "textMuted": "#5F6672",
    "ink": "#14171C",
    "onInk": "#F2F2EE",
    "darkBg": "#0E1116",
    "darkSurface": "#161A21",
    "darkContainer": "#1E242E",
    "darkBorder": "#2A2F38",
    "darkText": "#F2F2EE",
    "darkMuted": "#A3A9B4",
    "darkAccent": "#FF7A5C",
    "demoTeal": "#12545A",
    "demoSand": "#F3E9DC"
  }
}
EOF

# 3. Write Tailwind configuration (tailwind.config.ts)
cat << 'EOF' > tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
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
          'dark-bg': '#0E1116',
          'dark-surface': '#161A21',
          'dark-container': '#1E242E',
          'dark-border': '#2A2F38',
          'dark-text': '#F2F2EE',
          'dark-muted': '#A3A9B4',
          'dark-accent': '#FF7A5C',
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
      width: {
        sidebar: '240px',
      }
    },
  },
  plugins: [],
};
export default config;
EOF

# 4. Write Mock Data (lib/mock-data.json)
cat << 'EOF' > lib/mock-data.json
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
  }
}
EOF

echo "✅ Mirrorline repository scaffolded successfully!"
```

---

## 5. Giving This to Claude Code

To build the complete working web application with Claude Code, run:

```bash
claude "Read CLAUDE_CODE_EXPORT_PACK.md and EXPORT_AND_DOWNLOAD_GUIDE.md. Scaffold the full Next.js App Router repository with Tailwind CSS v4, TypeScript, Lucide Icons, and dark/light mode context. Implement the 10 desktop screens and 2 mobile screens adhering to the calm editorial design tokens."
```

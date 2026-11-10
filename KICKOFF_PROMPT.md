# Kickoff prompt · overnight build (paste into Claude Code)

> Read `CLAUDE.md` first, then `docs/00_INDEX.md`, `docs/plan/30_DAY_PLAN.md`, `DESIGN.md`, all of `docs/specs/`, `docs/design/STITCH_REVIEW.md` and `docs/tools/MCP_AND_SKILLS.md`. Look at every PNG in `docs/design/claude-design/screens/` and `docs/design/stitch/screens/`.
>
> **Goal by morning:** a working, clickable prototype of the Mirrorline **web app** and **public website**, running locally and on a Vercel preview, built to DESIGN.md with the mock data in `docs/specs/08_MOCK_DATA.md`. Mobile apps come later; just make the web responsive down to 390px.
>
> **How to work:**
> - You are running in auto mode, unattended. Do not stop to ask questions: decide, log the decision in `docs/DECISIONS.md`, and continue.
> - Follow the non-negotiables in CLAUDE.md at all times.
> - Before using any tool, run `claude mcp list` and check the installed skills. Use the design, frontend, testing and deployment MCPs and skills listed in `docs/tools/MCP_AND_SKILLS.md` where they're available. Where one is missing, use the CLI fallback named there, and note it under "Needs Vlad" in `docs/PROGRESS.md`.
> - Work through the milestones below in order. After each one: lint, typecheck, test and build must pass. Then commit, update `docs/PROGRESS.md` (done, how to see it, known gaps), and move on.
> - Spawn subagents for independent screens when it speeds things up. Keep one source of truth for tokens and mock data.
>
> **Milestones:**
>
> **M1 · Scaffold (about 45 min)**
> - pnpm monorepo per CLAUDE.md.
> - Next.js App Router + TypeScript + Tailwind + shadcn/ui.
> - `packages/ui`: tokens generated from DESIGN.md and `docs/design/design-tokens.json`, light, dark and system themes, Inter and Inter Tight.
> - `packages/mock`: typed mock data.
> - Vitest and Playwright set up; GitHub Actions CI (lint, typecheck, test, build, licence check).
> - `.env.example`; `docs/PROGRESS.md` and `docs/DECISIONS.md`.
>
> **M2 · App shell and Home (about 1 h)**
> - The `/app` layout: 240px sidebar, workspace switcher, usage meter, theme switch.
> - Routes: `/app/home`, `/app/upload`, `/app/trends`, `/app/remake/[id]`, `/app/calendar`, `/app/results`, `/app/agents`, `/app/brand-kit`, `/app/settings`, `/app/onboarding`.
> - Build S02 Home pixel-close to the references.
>
> **M3 · Core studio screens (about 3 h)**
> - S03 Upload and multiply, S04 Trend board, S05 Remake studio, S06 Calendar and approvals, S07 Results, S08 Agents, S09 Brand kit, S10 Settings and billing, S01 Onboarding wizard.
> - Keep every interaction from the Claude Design source (`docs/design/claude-design/source/*.dc.html`):
>   - wizard steps
>   - trend filters
>   - hook A/B selection
>   - calendar selection, approve and approve-all, approval mode
>   - agent on/off and logs
>   - caption-style picker
> - Client-side state with mock data. Show empty, loading, error and compliance-blocked states.
>
> **M4 · Public website and auth UI (about 1.5 h)**
> - Pages: `/` (landing), `/how-it-works` (the 7-agent loop), `/pricing` (Pilot $750 for 2 weeks · Growth $1,500/mo · Scale $3,000/mo · Studio self-serve "coming later"), `/trust` (our rules: format not footage, AI labels, consent, official APIs, compliance gate), `/sign-in`, `/sign-up`, `/privacy` and `/terms` (placeholders marked "Draft, not legal advice").
> - Use Stitch's marketing and auth layouts, with every fix in `docs/design/STITCH_REVIEW.md` applied: no testimonials, results, ratings, certifications or guarantees. Any demo numbers are labelled "Sample data".
> - Sign-up and sign-in: use Supabase Auth if keys exist in `.env.local`; otherwise a mock session.
> - "Book a demo" and "Start a pilot" open a form that stores leads locally (or in Supabase if available).
>
> **M5 · Quality pass (about 1 h)**
> - Playwright end-to-end test of the demo path: sign up → onboarding → home → upload → trends → remake → calendar → results → agents.
> - Visual screenshots at 1440px and 390px for every page, saved to `docs/screens-built/`. Compare them with the references and fix gaps.
> - Accessibility: labels, focus states, contrast of at least 4.5:1, touch targets of at least 44px.
> - Lighthouse or axe check on `/` and `/app/home`.
>
> **M6 · Preview deploy (about 20 min)**
> - Deploy a Vercel **preview** (never production).
> - Put the preview URL and local run steps at the top of `docs/PROGRESS.md`.
> - If Vercel isn't authenticated, note it under "Needs Vlad" and keep the local build.
>
> **M7 · Stretch, only if M1–M6 are done**
> 1. `automation/n8n/`: a docker-compose for self-hosted n8n, plus two **inactive** workflow JSON files:
>    - "Stripe test customer → create workspace → welcome email"
>    - "Weekly report → email"
>    Add a README on importing them.
> 2. `services/pipeline/`: engine v0 skeleton.
>    - Adapters: transcribe, cut, caption, compliance.
>    - A `make-samples <video> <brand.json>` CLI that runs end to end on a local test video, using ffmpeg and WhisperX if they're installed, otherwise clearly marked stubs.
>    - Compliance v1 checks with unit tests.
>    - No paid APIs.
>
> **Definition of done for the morning:**
> - `pnpm dev` shows the website at `/` and the full studio at `/app/home`, matching the references.
> - The demo path is clickable end to end, and the Playwright test passes.
> - A Vercel preview URL works, or "Needs Vlad" says why it doesn't.
> - `docs/PROGRESS.md` lists what's done, what's stubbed, what needs Vlad, and the next 5 tasks for Day 2 from `docs/plan/30_DAY_PLAN.md`.

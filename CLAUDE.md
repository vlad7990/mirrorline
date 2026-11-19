# Mirrorline · project memory for Claude Code

"Mirrorline" is a placeholder name. Owner: Vlad Breygin. Read this file fully at the start of every session.

## What we are building

A multi-agent short-video growth service for **everyone**: any business or individual, in any industry, with a new or an existing account. It is **industry-agnostic** — we do not build industry pages, because the agents research each account's niche (the Niche Scan) and adapt to it. There are two ways in: the client **sends** their own long videos (podcasts, webinars, talks), or **we create** originals remade from formats growing in their niche — the structure only, never other people's footage or audio, with AI scenes always labelled. Either way a team of **seven AI agents** turns them into original short vertical videos and posts them several times a day to the client's own Instagram, TikTok and YouTube accounts, through official APIs, then learns from the results. Every account tracks its own goal through KPIs on its dashboard.

> Corrected 2026-11-13 (D38). This paragraph used to read "for coaches, consultants and local service businesses", which `docs/specs/11 §5`, `13` and `16 §1` supersede. Segmentation is by account type and goal only, never by industry.

Agents: Trend Scout · Remake Producer · Multiplier · Compliance · Client Concierge · Publisher · Performance Analyst (spec: `docs/specs/04_AGENTS_SPEC.md`).

## Why

This is the legal turnaround of an earlier project that failed on legal and platform grounds: it reposted other creators' videos, evaded detection, and ran fake accounts. The goal is to recover an investor's money with a legitimate, fast-growing product: done-for-you retainers first, self-serve later. Everything we build must be something we could show a platform, a lawyer or an investor.

## Where we are in the 30-day plan

Full plan: `docs/plan/30_DAY_PLAN.md`. Current phase: **Day 0–1, the overnight prototype.**

**Order of work:**
1. Web app (client studio) with mock data
2. Public website (marketing, pricing, trust, sign-in, sign-up)
3. Engine v0 (make real sample videos)
4. Mobile: **later**. The web app must still work in a phone browser.

## Source of truth, in priority order

1. This file and `KICKOFF_PROMPT.md`
2. `DESIGN.md` (design system in Google's DESIGN.md format) and `docs/design/design-tokens.*`
3. `docs/specs/` (01 product brief, 02 brand and voice, 03 screens, 04 agents, 07 technical handoff, 08 mock data)
4. **`docs/design/handoff-v4/`** — the current design, adopted 2026-11-11 (D25).
   `README.md` is the written spec; `designs/*.dc.html` are the prototypes and
   win on any exact value. Gold + ink for the public site, five pages. It
   outranks everything below it, which is the previous direction.
   **Three standing amendments, decided by Vlad — the handoff does not
   override these:**
   - The hero takes an **upload, never a link** (non-negotiable 1, D22).
   - The hero run is driven by the **real engine**, not the handoff's canned
     demo. We have the engine; a scripted result would be a step backwards.
   - **Geist stays.** Geist Serif is the display face, not Fraunces. The gold
     accent phrase is upright serif in the gold gradient — neither Geist Serif
     nor the `next/font` Sans export carries a true italic.
5. Older screen references, superseded by 4 but still the studio's basis until
   the app restyle lands:
   - `docs/design/claude-design/screens/*.png` and `source/*.dc.html`
   - `docs/design/stitch/screens/*.png` and `docs/design/stitch/code/*.html`
6. `docs/design/STITCH_REVIEW.md`: claims and copy from Stitch that must NOT be used.
7. `docs/design/COMPETITOR_REFERENCES.md`: five competitor sites, measured.

If sources conflict, the higher one wins. Log every decision in `docs/DECISIONS.md`.

## Sources of truth for content, structure and scope

Added 2026-11-13 at Step 0 of `docs/prompts/MASTER_PROMPT_v4.md`. The list
above governs **design**; this one governs **what the product is, what it
says, and which pages exist**. Higher wins:

1. `docs/specs/09_SERVICES.md` — the services, the plans and their prices
2. `docs/specs/16_SITE_MAP_AND_GAPS.md` — the site map, the home-page section
   order, and which routes and app screens are New or Update
3. `docs/specs/15_METRICS_AND_KPIS.md` — goals, the KPI tiers, the Results
   tabs and the honesty rules
4. `docs/specs/11_MARKET_RESEARCH.md` — P1–P10 and the evidence behind them
5. `docs/specs/13_PERSONA_ALIGNMENT.md` — account types and goals, the only
   segmentation we use
6. `docs/specs/14_STORY_AND_FUNNEL.md` — the story beats, the funnel and the
   events we track
7. `docs/specs/12_NICHE_PLAYBOOK.md` — the Niche Scan, its allowed and banned
   sources, and the internal starting recipes
8. `docs/specs/10_SALES_FOCUS.md` — our own outreach, by account type and goal

**The design is locked, and no spec in this list overrides it.** Where a
content spec implies a visual change, the design wins and the conflict is
logged. Only the layout fixes named in Step 2 of the master prompt are
allowed; anything else visual is a bug to revert. `DESIGN.md`, the
design-token files and the existing `@mirrorline/ui` components are not edited
except to fix a bug.

**Specs 01–08 are the earlier, narrower product** and are superseded by this
list wherever they disagree — most of all on who we serve (`01`) and on colour
and type (`02`). They remain correct on voice, the studio screens, the agents'
mechanics, the reuse list and the mock data. Every conflict found at Step 0 is
written up in `docs/DECISIONS.md` as **D38**, and what I understood from all of
it is in `docs/RESEARCH_BRIEF.md`.

Every pull request description must name the P-number(s), the story beat, or
the KPI tier it serves.

## Stack

- **Web:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + lucide icons; pnpm.
- **Data, auth, storage:** Supabase. Tonight, mock data only; wire Supabase only if keys exist in `.env.local`.
- **Billing:** Stripe, **test mode only**.
- **Hosting:** Vercel, **preview deployments only**.
- **Media engine (later):** Python workers + queue. ffmpeg, WhisperX, ClipsAI, Remotion; Claude API for writing.
- **Automation:** n8n, self-hosted, for back-office flows only (`docs/automation/N8N_AND_ZAPIER.md`). Zapier only for low-volume links when no API exists.
- **Tests:** Vitest for units, Playwright for end-to-end and visual checks against the reference PNGs.

## Repo layout

```
apps/web/            Next.js: marketing site at "/", client studio at "/app/*"
packages/ui/         Shared tokens, theme, components (generated from DESIGN.md)
packages/mock/       Typed mock data from docs/specs/08_MOCK_DATA.md
services/pipeline/   Python media workers, one folder per agent (engine v0)
automation/n8n/      docker-compose and exported workflow JSON (inactive by default)
docs/                Specs, plan, designs, decisions, progress
```

## Non-negotiables (never break, never work around)

1. **Inputs:** only client-owned material, or footage we hold rights to. Never download, store or reuse other creators' videos or audio.
2. **Remakes copy the format only:** new script, new footage, new voice.
3. **Publishing:** only through official platform APIs, via Postiz, to client-connected accounts. No device automation, app clones, proxies, fake accounts or scraping.
4. **AI labels:** AI scenes are always labelled, in the UI and on the platform.
5. **Consent:** no face-swaps; voice or likeness only with a stored consent record.
6. **Compliance gate:** every video passes the Compliance agent before it can be scheduled.
7. **Claims:**
   - No fake testimonials, ratings, customer results or certifications (no SOC-2 and no "certified" badges unless real).
   - No guarantees of views, followers, compliance or "zero" anything.
   - Demo data is labelled "Sample data" on public pages.
8. **Old drives:** code from the GenAIUniq drives is NOT in this repo and must not be added until a written IP assignment exists. Then only modules on the reuse list in `docs/specs/07_CLAUDE_CODE_HANDOFF.md`.
9. **Secrets:** never in code or commits; use `.env.local` (git-ignored). Never print secrets.
10. **Licences:** dependencies must be MIT, Apache-2.0, BSD, ISC or MPL-2.0. AGPL tools (Postiz) run only as separate, unmodified services. FLUX.1 dev is not allowed. **One named exception, and it is scoped: the GSAP family, on the public marketing site only** — `gsap` core, ScrollTrigger, SplitText and `@gsap/react` for `useGSAP`. Vlad's decision: D33 admitted it, **D41 scoped it**. Free for commercial use under the GSAP Standard No-Charge licence (https://gsap.com/standard-license/) and we are not reselling it — but it is not an OSI-permissive licence: Webflow may terminate it at their discretion, may amend the terms unilaterally, and bars use in tools competing with their visual animation builder. **Not allowed in the studio app, `packages/ui`, the Remotion templates, or any customer-facing animation tooling** — those stay on CSS and `motion` (MIT, D19). **ScrollSmoother and Lenis are banned everywhere**, marketing included: both replace native scroll. Enforced by two gates in `pnpm licence-check` — the allow-list pins the exception to those package names and that licence URL, and `scripts/gsap-scope.mjs` denies a GSAP import from outside the marketing scopes by default. It widens nothing else.
11. **Money and production:** no paid API calls beyond test mode; no real social posting. **Production exists now, and it is not yours to touch** (D85, 17 November 2026). Vercel's production branch is `main`, the production URL is `mirrorline-eosin.vercel.app`, and production has its own environment variables, which Vlad adds. You **never deploy, never promote, and never merge to `main`** — every change reaches production through a pull request that Vlad reviews and merges, and merging is the only thing that deploys. Preview deployments stay yours to use freely, with deployment protection on until launch. The old wording said "no production deploys" because there was no production; the rule now is that deploying is somebody else's job, which is stricter rather than looser.

## Working rules (auto mode, unattended)

- **Don't stop to ask.** When something is unclear, choose the option most consistent with the sources above, log it in `docs/DECISIONS.md`, and continue.
- **Work in milestones** (see `KICKOFF_PROMPT.md`). After each one: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass, then commit with a clear message, then update `docs/PROGRESS.md`.
- **Never force-push, rewrite history, or delete files you did not create.**
- **When blocked** (missing key, failing service): stub it behind an adapter with mock data, note it in `docs/PROGRESS.md` under "Needs Vlad", and move on.
- **Pull requests:** keep each under ~400 lines where practical.
- **Verify every screen:**
  1. Take a Playwright screenshot at 1440px and at 390px.
  2. Compare it with the reference PNG.
  3. Fix obvious gaps.

## Commands (create these during scaffolding)

- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e`
- `docker compose -f automation/n8n/docker-compose.yml up` (n8n, local)

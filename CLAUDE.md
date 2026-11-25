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
11. **Money and production:** no paid API calls beyond test mode; no real social posting. **Production exists** (D85, 17 November 2026). Vercel's production branch is `main`, the production URL is `mirrorline-eosin.vercel.app`, and production has its own environment variables, which Vlad adds. You **never deploy and never promote** — a change reaches production only through a pull request, and **merging is the only thing that deploys**. Preview deployments stay yours to use freely, with deployment protection on until launch.

    **Amended 24 November 2026 (D130): a migration is approved by Vlad adding the label `migrate-production` to the pull request.** That label is the whole procedure — a workflow checks it was Vlad who added it, that the PR is from this repo, and that `verify`, `pipeline` and `e2e` are green on its head; runs the additive-only gate; applies the migrations to production from that exact head SHA; verifies production now holds every migration in the tree; then **merges the PR and comments**. On any failure: no merge, a comment saying why, and the label removed. **You never add that label** — asking for it is still one of the four things you stop for, and the actor check means your adding it would be refused anyway. `migrate-production.yml` is kept as the emergency route (migrating `main` after a merge that skipped the label, or recovery when the normal path is broken); its `ref` is an **input**, so the CLI form is `-f ref=<branch>` and **not** `--ref <branch>`, which selects the branch the workflow file comes from. D104's order is unchanged — schema first, then code.

    **A pull request carrying a migration is merged by the label and by nothing else. Never the Merge button, never auto-merge, never `gh pr merge`.** Added 25 November 2026 after both halves of this went wrong inside a minute: #31 was merged by hand, so `main` deployed code for a table production did not have and `Production schema check` went red; #32 was merged by hand while still stacked, so it landed on **`feat/worker-heartbeat` instead of `main`** and its migration reached nothing at all. Neither failure was loud — the first is a red check somebody has to look at, the second is a green merge into the wrong branch. The button does not migrate, does not verify, and does not check the base branch; the label does all three. This applies to Vlad too, which is why the rule is written here rather than left as a habit. If a migration PR has already been merged by hand, the recovery is the emergency route — *Migrate production* with the **`ref` input** set to `main` — not a re-label, because the merge has already happened.

    **Amended 22 November 2026 (D114): you may merge your own green pull requests, with five exceptions.** When `verify`, `pipeline` and `e2e` are green, enable auto-merge yourself with `gh pr merge --auto --merge`; the `main` ruleset requires those three checks, so the rule is enforced by the repository rather than by your judgement. **Leave these five for Vlad, and never auto-merge them:** anything with a **migration** (he dispatches Migrate production first), anything touching **payments**, **auth**, **account deletion**, or **secrets**. The line is drawn at reversibility — everything outside that list is recoverable with a revert; a migration changes production data, money moves, auth and deletion destroy access or records, and a secret cannot be un-leaked. **Never push to `main`.** D85's reason has not evaporated; the risk is now carried by the ruleset and the exception list instead of by a blanket ban.

## Working rules (auto mode, unattended)

- **Don't stop to ask.** When something is unclear, choose the option most consistent with the sources above, log it in `docs/DECISIONS.md`, and continue.
- **Work in milestones** (see `KICKOFF_PROMPT.md`). After each one: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass, then commit with a clear message, then update `docs/PROGRESS.md`.
- **Force-pushing** (D92, enforced since D114). Never force-push `main`, and never force-push a branch with an open pull request somebody else is reviewing. On your own feature branch, after a rebase, `--force-with-lease` is allowed — and **never plain `--force`**, which overwrites whatever arrived while you were not looking. This is now mechanical rather than remembered: `.claude/settings.json` allows `Bash(git push --force-with-lease:*)` and denies the plain form and any push to `main`. Still never rewrite history that is not yours, and never delete files you did not create.
- **When blocked** (missing key, failing service): stub it behind an adapter with mock data, note it in `docs/PROGRESS.md` under "Needs Vlad", and move on.
- **Evidence, when something fails** (D111). The end-to-end suite builds into
  `.next-e2e`, so a manual `pnpm build` can no longer collide with a running
  suite — but the lesson generalises past that one collision: **a branch switch
  isolates only what git tracks.** `.next`, `node_modules`, `.playwright` and
  the shared preview database all survive a `git checkout`, so "it reproduces
  on `main`" proves nothing until the shared state has been rebuilt or cleared.
  Rebuild from clean before calling a failure pre-existing, and treat "I have
  been running builds in this directory" as a confound to remove rather than
  background noise.
- **The scan eval gates the scan** (D134, 24 November 2026). **Before merging any
  change to the scan or the script agents, run `pnpm eval:scan` on preview and
  put its summary in the pull request** — the success rate, and per case the
  time, the searches and the cost. The files it covers are
  `niche-scan/research.ts`, `write-leg.ts`, `notes.ts`, `scan.ts`, `report.ts`,
  `scripts/first-videos.ts` and `scripts/fact-check.ts`. It costs about five
  dollars a run and it exists because three live production scans produced one
  report and no test said so — the hermetic suite cannot, because what broke was
  the model's behaviour rather than our parser. `pnpm eval:scan:dog` runs the
  reviewed dog-trainer profile three times, which is the bar for a change to the
  legs themselves.
- **Pull requests:** keep each under ~400 lines where practical. Merge your own when green, within the five exceptions in non-negotiable 11.
- **Every end of day** (D114): post a short demo note in `docs/PROGRESS.md` — **what a user can now do**, with screenshots — then stop for Vlad's ten-minute review before continuing.
- **Manage your own context** (D114): write the handoff at every milestone rather than trusting auto-compact to keep the right half.
- **Stop and ask for exactly four things** (D114, amended D130): **the `migrate-production` label** on a PR that carries a migration — say which PR and stop, because the label both migrates and merges it — a payments/auth/secrets merge, the video generator choice, or a product decision the specs do not cover. Everything else: choose, log it, continue.
- **Verify every screen:**
  1. Take a Playwright screenshot at 1440px and at 390px.
  2. Compare it with the reference PNG.
  3. Fix obvious gaps.

## Commands (create these during scaffolding)

- `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e`
- `docker compose -f automation/n8n/docker-compose.yml up` (n8n, local)

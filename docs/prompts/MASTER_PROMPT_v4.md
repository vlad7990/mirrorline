# Mirrorline: master prompt v4 (start the next round of development)

Replaces every earlier prompt: the combined prompt, ADDENDUM_MARKET_RESEARCH_PROMPT.md and MASTER_PROMPT_v3.md.

**How to start**
1. Open Terminal and go to the repo: `cd ~/Documents/Projects/mirrorline/mirrorline`
2. Start Claude Code: `caffeinate -dimsu claude --permission-mode auto`
3. Paste everything below the line.

---

You are continuing the Mirrorline build in this repo. Work through every step below in auto mode, without stopping for approval, except where CLAUDE.md says to stop. Use our design and frontend skills, the shadcn and 21st.dev MCPs, Playwright, the Supabase and Vercel MCPs, and the review, QA and accessibility agents, as before. Work in small PRs with tests. Deploy previews only.

## What we are building (read this twice)

Mirrorline is a multi-agent short-video growth service for **everyone**: any business or individual, in any industry, with a new or existing account. It is **industry-agnostic**. We do not build industry pages. Our seven AI agents research each account's niche and adapt everything to it:

1. **Trend Scout:** the Niche Scan.
2. **Remake Producer:** turns proven formats into the client's own original videos (new script, new footage, the client's voice).
3. **Multiplier:** turns one of the client's videos into many cuts.
4. **Compliance:** checks every video, including the Originality Gate.
5. **Client Concierge:** handles approvals and the weekly report.
6. **Publisher:** posts several times a day to the client's own accounts through official APIs.
7. **Performance Analyst:** sets goals, KPIs, targets, insights and next week's plan.

There are two ways in:
- **You send:** the client sends their own videos.
- **We create:** we remake formats that are growing in their niche. We copy the structure only, never other people's footage or audio, and AI scenes are always labelled.

Every account tracks progress against its own goal through KPIs on its dashboard.

We exist because users of clipping tools, agencies and DIY posting keep hitting the same problems (P1–P10 in 11). The platforms now punish reposts and farms. We built the honest opposite.

## Step 0: understand before you build (do not skip)

1. Read these files in order:
   - CLAUDE.md
   - docs/specs/01–08
   - docs/specs/11_MARKET_RESEARCH.md
   - 12_NICHE_PLAYBOOK.md
   - 13_PERSONA_ALIGNMENT.md
   - 14_STORY_AND_FUNNEL.md
   - 15_METRICS_AND_KPIS.md
   - 16_SITE_MAP_AND_GAPS.md
   - DESIGN.md
   - docs/DECISIONS.md, docs/PROGRESS.md, docs/plan/DESIGN_BACKLOG.md
2. Write **docs/RESEARCH_BRIEF.md** (one page, in your own words). Cover:
   - who we serve (everyone; industry-agnostic)
   - P1–P10 and our answer to each
   - the story and the funnel
   - the metrics system
   - what each agent does and which metric it owns
   - why we are not a farm
   - what we reuse from the drives, and how
   - open questions
3. Add a **Sources of truth** block to CLAUDE.md, in this order: 09_SERVICES → 16 → 15 → 11 → 13 → 14 → 12 → 10. The design is locked (Step 2) and no spec overrides it. Log every conflict between specs in DECISIONS.md.
4. Every PR description must name the P-number(s), the story beat, or the KPI tier it serves.

## Step 1: services and sales focus (create docs/specs/09_SERVICES.md and 10_SALES_FOCUS.md)

**09_SERVICES.md.** Describe the services as follows:
- The two inputs.
- The seven agents.
- The Niche Scan.
- Calendar with approvals.
- Daily posting to the client's own accounts.
- The Originality Gate and compliance checks.
- Metrics and KPIs per account (15).
- The weekly Results Ledger.
- Repost Watch.
- Plain billing: no credits, cancel anytime, the client keeps every file.

**Plans** (each shows "best for" from 13):

| Plan | Price | Includes |
|---|---|---|
| Pilot | $750 | 2 weeks |
| Growth | $1,500/mo | 90 posts, 2 remakes a week |
| Scale | $3,000/mo | 180 posts, daily remakes, strategy call, portfolio view |
| Creator | $499/mo | ~40 posts, 1 remake a week, 2 platforms |
| Studio | $79/mo | Waitlist now. From month 2: 60 posts and 4 created videos |

**Who we serve:** everyone. Regulated niches get rule packs automatically. Not served: political, gambling, crypto, adult, anyone under 18.

**10_SALES_FOCUS.md:** there is no industry focus, and no persona or industry is featured above another. Our own outreach is aimed at account types and goals.

## Step 2: design lock (do not redesign)

The current gold glass-box design is approved and locked. This prompt changes **content, structure, pages, the funnel and the metrics features only**.

- **Do not change:** the palette, fonts (Geist Serif / Geist Sans), the glass-box card style, gold accents, radii, shadows, motion, icons, logo, nav and footer styling, or the light and dark themes.
- **Do not edit** DESIGN.md, the design-tokens files or the existing @mirrorline/ui components, except to fix a bug.
- **Build new sections, pages and screens from existing components and tokens only.** If a new component is truly needed (for example a KPI card or a funnel chart), compose it from the existing tokens so it matches the current style. Record it in DECISIONS.md with a screenshot.
- **Allowed layout fixes** (already requested):
  - align every section to the hero's left edge
  - use the hero heading style for all section headings
  - use one spacing scale
  - remove the lone light band
  - shorten the 3,183px loop section
- **Also remove:** the untrue line "run happens on this machine" and the fake "4 places" limit.
- **Before you start,** screenshot every existing route at 1440px and 390px, in light and dark, into docs/screens-built/before-v4/. The final report must show before/after pairs. Any visual change beyond content and the allowed fixes is a bug: revert it.

## Step 3: home page

Build the home page in the exact 19-section order of 16 §3. Keep and update the existing sections; add the new ones. Key points:

- **Hero picker:** Business or Individual, then New or Existing account. Store the choice in a URL param plus localStorage (wrapped in try/catch). It changes the examples and CTAs further down the page. No industry lists anywhere.
- **"Sound familiar?", "What changed in 2026", "We built the opposite":** use 11 and 14. Name categories only, never competitor brands.
- **"Any niche: our agents research yours":** explains the Niche Scan, with one sample recipe card.
- **Metrics section:** dashboard preview with sample data (goal bar, KPI cards, funnel, ledger) and the 7 goals from 15 §2.
- **Mark all sample data** "Sample data".
- **Main CTA:** "Get my free Niche Scan".

## Step 4: pages

Build every route marked New or Update in 16 §4:

- /how-it-works
- /metrics
- /niche-scan and /niche-scan/sample
- /businesses
- /individuals
- /compare (categories only)
- /faq
- /about (no investigation details)
- /contact
- /resources (3 starter articles)
- /changelog
- the legal pages under /legal/* (keep redirects from /privacy and /terms)
- /accessibility
- a cookie consent banner (non-essential cookies declined by default)

Also update /product, /agents, /pricing and /trust, and use the nav and footer from 16 §4.

**Funnel:**
- The /niche-scan form saves to Supabase, or to a mock adapter in the prototype, and fires an n8n webhook stub. It sends no real emails.
- /pricing: pre-selects the plan from the visitor's account type. Stripe checkout in test mode for Pilot and Creator. A booking placeholder for Growth and Scale. A waitlist form for Studio.
- Track the funnel events in 14 §4 (console adapter in dev). Build an internal /admin/funnel chart with sample data.

## Step 5: account dashboard, metrics and KPIs (per 15)

1. **Onboarding:**
   - Business or Individual
   - New or Existing account
   - main goal (plus an optional second)
   - industry and niche in free text, plus up to 3 inspiration handles
   - connect accounts
   - a notice that targets will be proposed after a 14-day baseline
   
   Pre-fill the plan, input mix, posts per week and KPI set (13, 15).
2. **Results** becomes 7 tabs: Overview, Funnel, Content, Accounts, Goals and KPIs, Ledger, Agent insights (15 §5). Use sample data, labelled.
3. **Goals and KPIs:** the outcome → objectives → key results → KPIs cascade. Targets can be edited. Users can add custom KPIs, entered manually or by CSV. Show baseline, target, trend and sparkline.
4. **Accounts:** one card per connected social account, with its own KPIs. Add a **Portfolio** view for Scale.
5. **Home:** goal progress bar, the top 3 KPI cards, and alerts for any KPI off track 2 weeks in a row.
6. **Niche Scan screen:** replaces the trend board. Shows recipes, views per follower, why each is growing, and a fit score, with links only.
7. **Remake studio:** beats, the business fact cited in the script, and the Originality Gate result.
8. **Settings:**
   - Repost Watch
   - plain billing with a cancel button
   - export all files
   - custom KPIs
9. **Every KPI** shows its definition, source and how fresh the data is. If a source isn't connected, show "Not connected" with a connect button, never a zero. Projections are dashed and labelled.

## Step 6: data, agents and reuse

1. **Supabase migrations** for:
   - `goals`, `objectives`, `key_results`
   - `kpi_definitions`, `metric_snapshots`
   - `ledger_weekly`, `alerts`
   - `leads`
   - the extended `trends` fields (from 11/12)
   
   Seed the KPI definitions from 15 §3.
2. **Update 04_AGENTS_SPEC.md:**
   - Trend Scout runs the Niche Scan (allowed and banned sources per 12 §1).
   - Every agent has the metric job listed in 15 §6.
   - Performance Analyst owns the baseline, targets, alerts and weekly insights.
   - Compliance includes the Originality Gate: it blocks and rewrites, and never perturbs content just to pass.
3. **Reuse from the drives,** per 07:
   - the GPU job runner, generation calls, expenses.py cost tracking (feeds the Agent operations KPIs), dashboard charts and Telegram alerts (feeds KPI alerts)
   - check_uniq.py, used in reverse as the Originality Gate
   
   Until the IP assignment is signed, build these against interfaces with stubs, and record the planned sources in docs/provenance.md. Never reuse anything on the "never reuse" list.

## Step 7: sweep every route

1. **SERVICES_AUDIT.md:** every service in 09 must be described the same way on every page.
2. **SWEEP_REPORT.md:** every route, with the P-numbers, story beats and KPI tiers it serves, and what changed.
3. **Banned-phrase CI test:** fail the build on any of these:
   - "guaranteed", "go viral", "10x", "#1", "best in the world"
   - competitor brand names
   - industry-exclusive phrasing such as "for coaches" or "built for clinics"
   - "run happens on this machine"

## Step 8: quality and preview

1. Run lint, typecheck, Vitest, Playwright (1440 and 390, light and dark) and the accessibility checks (WCAG AA, keyboard). Fix whatever fails.
2. Deploy a preview only (never production).
3. Report:
   - the preview URL
   - before/after screenshot pairs
   - the pages and screens added or changed
   - open questions
   - anything in the specs you disagreed with, and why

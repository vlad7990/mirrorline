# 14 — Website story and funnel

Purpose: every visitor should recognise their own problem within 5 seconds, see that we understand it better than the tools they've already tried, and take one next step that fits who they are. Built from 11, 12, 13, 15 and 16. Industry-agnostic.

## 1. The story (one spine for every page)

| Story beat | What the visitor feels | Mirrorline copy direction | Evidence from 11 |
|---|---|---|---|
| **1. The hero is the client** | "This is about me." | Name the visitor (business or individual) and their goal: "You're great at your work. Your feed doesn't show it." | P6, P8 |
| **2. The problem they've lived** | "Yes, that happened to me." | The three things they've already tried and why each failed: clipping tools (40% unusable, credit traps), agencies (contracts, vanity reports, generic posts), doing it yourself (burnout). | P1–P8 |
| **3. The new rule of the game** | "Oh — that's why it stopped working." | Platforms now reward original content, sends and saves, and stop recommending reposts and recycled pages. Shortcuts got punished. | P9, section 3 |
| **4. The guide** | "These people get it." | "We studied what people complain about in clipping tools, agencies and repost pages, and built the opposite." Show empathy first, then authority (how we work, not fake stats). | Section 6 |
| **5. The plan (3 steps)** | "That's simple." | **Scan** your niche → **Make** original videos from your footage or proven formats → **Post & prove** every day, with a weekly ledger of leads and sales. | 12 §1, §3 |
| **6. The promise and the proof format** | "I'll know if it works." | Show a Results Ledger row (labelled "example"). No guarantees. Month-to-month. | 13 |
| **7. Stakes** | "If I keep doing what I'm doing…" | Reach keeps sliding, money goes to clips you delete, the treadmill continues. Calm tone, no fear-mongering. | P1, P8, P9 |
| **8. One clear next step** | "I know what to click." | Persona-specific CTA (section 3). | — |

**Brand rule:** we name problem *categories* ("clipping tools", "agencies", "repost pages"), never competitor brands, and we paraphrase complaints instead of quoting reviewers. Sources live in docs, not on the public site.

## 2. Home page order (replaces the current 15-section order where they conflict)

1. **Hero** — headline on outcome; sub names both inputs ("your videos, or proven formats remade for you"); a simple picker: Business or Individual, then New or Existing account (no industries); primary CTA "Get my free Niche Scan", secondary "See plans".
2. **"Sound familiar?" problem picker** — 6 cards (the top complaints from 11, written in the visitor's words). Clicking one scrolls to the matching answer and remembers the choice for the rest of the page.
3. **What changed in 2026** — originality rule, sends and saves; 3 short facts, one sentence each.
4. **"We built the opposite"** — two-column table: what you got before → what Mirrorline does (P1–P10).
5. **How it works** — Scan → Make → Post & prove, with the agent cards.
6. **Two ways in** — your footage / created videos (remade formats, AI scenes labelled).
7. **Who it's for** — the 4 account types from 13 and the 7 goals from 15; link to /businesses and /individuals.
8. **Metrics preview** — dashboard with sample data: goal bar, KPI cards, funnel, ledger (see 15).
9. **Not a farm** — owned accounts, official APIs, originality gate, AI labels, Repost Watch.
10. **Pricing teaser** — Pilot, Growth, Scale, Creator, Studio (Studio "joining waitlist"), each with "best for".
11. **FAQ** — the objections from 11 ("Will it sound like me?", "What if I cancel?", "Do I own the files?", "Will this get my account penalised?").
12. **Final CTA** — adapts to the Business/Individual and New/Existing choice.

Design: every section aligns to the hero's left edge and uses the hero heading style (fixes from the site review).

## 3. The funnel

| Stage | Page / asset | Visitor action | What we capture | Next step |
|---|---|---|---|---|
| Attract | Our own accounts, run with Mirrorline (we eat our own cooking); posts aimed at different account types and goals using the 12 formats | Clicks link in bio | UTM source, persona | /businesses or /individuals |
| Recognise | `/businesses` or `/individuals` (industry-agnostic), plus `/compare` and `/metrics` | Reads their problem in their words | Scroll depth, problem picked | Free Niche Scan |
| Lead magnet | **Free Niche Scan** form: niche, handle(s), goal, account type | Submits | Email, niche, handles, goal | Thank-you page + "your scan arrives in 48h" email |
| Proof | Niche Scan report (3 format recipes + 1 sample remade script; human-checked) | Opens report | Opens, clicks | Book a 15-min call or start a plan |
| Convert | `/pricing` with account type pre-selected → Stripe checkout (test mode) or Cal booking for Growth/Scale | Pays / books | Plan, value | Onboarding |
| Activate | Onboarding (account type and goal → plan, input mode, KPIs pre-filled) | Connects accounts, uploads first video | Time to first approved post | First week of posts |
| Retain | Weekly Results Ledger email | Opens ledger | Leads, bookings, sales | Upgrade prompt when the ledger shows wins |

Main button for everyone: free Niche Scan. Second button by account type: business → Pilot $750 or a call for Growth/Scale; individual with an audience → Creator $499; individual starting new → Studio waitlist (launches month 2).

Back office (n8n, invisible to clients): form → CRM → notify strategist → scan delivered → 3-email nurture (problem → plan → proof) → ledger emails.

## 4. Events to track (for our own funnel dashboard)

`account_type_selected`, `goal_selected`, `problem_card_clicked`, `niche_scan_started`, `niche_scan_submitted`, `scan_report_opened`, `call_booked`, `checkout_started`, `checkout_completed`, `account_connected`, `first_post_approved`. Show a funnel chart in an internal /admin/funnel page (mock data in prototype).

## 5. Copy rules

- Visitor's words first, our product second.
- No guarantees, fake testimonials, ratings, client logos or invented numbers. Example data says "Example".
- No competitor brand names on the public site.
- Regulated niches get rule packs automatically (shown in onboarding and on /trust).


> Note: the full home-page section list and every page to build are in 16_SITE_MAP_AND_GAPS.md, which wins over §2 here if they differ.

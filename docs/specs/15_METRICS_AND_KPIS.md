# 15 — Metrics, KPIs and the account dashboard

Every Mirrorline account gets its own goals, KPIs and progress tracking, set up and kept up to date by our agents. Industry doesn't matter: the KPI set follows the account's **goal** and **account type**, not its industry.

## 1. How goals become KPIs (the cascade)

**Outcome → Objectives → Key results → KPIs → weekly actions**

| Level | Example (any industry) | Who sets it |
|---|---|---|
| Outcome | "Get more customers from short video" | The user, in onboarding (pick one main goal, see §2) |
| Objectives (2–3) | Grow reach with the right people; turn viewers into enquiries | Performance Analyst proposes; user edits |
| Key results (per quarter) | 120 leads; 3,000 new followers; 25 sends per 1,000 reach | Proposed after a 14-day baseline + Niche Scan benchmarks; user approves |
| KPIs (tracked daily) | See §3 tiers | Automatic |
| Weekly actions | "Double the 'myth vs fact' format, test 2 new hooks, move posts to 7pm" | Performance Analyst → Trend Scout and Remake Producer |

Targets are proposals, not promises. The UI always says "target", never "guaranteed".

## 2. Main goals (user picks one, may add a second)

| Goal | Headline KPI | Supporting KPIs |
|---|---|---|
| Leads / enquiries | Leads per week | Link clicks, CTR, DM keyword replies, cost per lead |
| Bookings / appointments | Bookings per week | Booking-page visits, show-up rate (if connected) |
| Sales | Revenue from tracked links | Orders, conversion rate, revenue per 1,000 views |
| Audience growth | Net new followers per week | Follows per 1,000 views, non-follower reach % |
| Awareness / reach | Unique reach per week | Views, share of views from non-followers |
| Community / engagement | Sends + saves + comments per 1,000 reach | Reply rate, returning viewers |
| Launch a new account | Days to first 1,000 followers | Posts on schedule, follows per 1,000 views |

## 3. KPI tiers (same structure for every account)

| Tier | KPIs | Source |
|---|---|---|
| **1. Production** | Videos made, posts published, posts on schedule %, approval time, backlog days | Our system |
| **2. Content health** | 3-second hold, average watch %, completion rate, sends per 1,000 reach, saves per 1,000 reach, comments per 1,000 reach | Platform insights APIs |
| **3. Growth** | Net followers, follows per 1,000 views, profile visits, non-follower reach % | Platform insights APIs |
| **4. Outcome** | Link clicks, CTR, leads, bookings, sales, revenue | Our tracked links, DM keywords, booking and commerce connectors (Cal.com/Calendly, Stripe, Shopify), manual entry |
| **5. Return** | Cost per lead, cost per booking, revenue ÷ plan cost (ROI) | Calculated |
| **6. Quality and safety** | Originality Gate pass rate, items rewritten, AI-labelled share, compliance blocks | Compliance agent |
| **7. Agent operations** | Agent spend vs cap, failed jobs, time from upload to first post | Job queue |

Each KPI has: definition, formula, source, refresh time, target (optional), trend vs last period, and a tooltip. Missing data shows "Not connected" with a connect button, never zero.

## 4. Scope: per social account and per Mirrorline account

- Every metric is stored per **connected social account** (e.g. Instagram @shop, TikTok @shop) and per **post**.
- The **workspace** (one Mirrorline account) rolls them up.
- Scale-plan users with several brands get a **portfolio view** across workspaces.
- Users can add **custom KPIs** (name, unit, target, manual or CSV entry), e.g. "phone calls", "walk-ins", "Google reviews".

## 5. In-app dashboard (S7 becomes "Results", with these tabs)

1. **Overview:** goal progress bar; 4–6 KPI cards (headline + supporting) with target, trend arrow and sparkline; this week vs last week.
2. **Funnel:** views → profile visits → link clicks → leads → bookings/sales, with conversion rate at each step, filterable by platform.
3. **Content:** top posts by the user's goal (not by views); format leaderboard; hook leaderboard; best posting times.
4. **Accounts:** one card per connected social account with its own KPIs.
5. **Goals and KPIs:** the cascade (§1); edit goals, targets and custom KPIs.
6. **Ledger:** weekly Results Ledger table (posts, views, sends, saves, follows, leads, bookings, sales), exportable as CSV and PDF.
7. **Agent insights:** the Performance Analyst's weekly note: what worked, what we'll change, and what we need from you.

Home (S2) shows the goal progress bar and the three most important KPI cards. Alerts appear when a KPI is off track for two weeks in a row.

## 6. Agents and metrics

| Agent | Metric job |
|---|---|
| Trend Scout | Benchmarks from the Niche Scan (views per follower, typical hold, length) to seed targets |
| Remake Producer, Multiplier | Tag every video with format, hook type, length and CTA, so results can be compared |
| Compliance | Quality and safety tier |
| Publisher | Production tier; posting times |
| Performance Analyst | Baseline, targets, KPI calculations, alerts, weekly insights, next week's plan |
| Client Concierge | Sends the weekly ledger and insights; collects manual outcomes ("did that lead buy?") |

## 7. Data model additions

- `goals` (workspace_id, goal_type, is_primary, outcome_text, period)
- `objectives` (goal_id, text)
- `key_results` (objective_id, kpi_key, baseline, target, due)
- `kpi_definitions` (key, name, unit, formula, source, tier, is_custom, workspace_id null|id)
- `metric_snapshots` (social_account_id, post_id null|id, kpi_key, value, captured_at)
- `ledger_weekly` (workspace_id, week, posts, views, sends, saves, follows, leads, bookings, sales_usd)
- `alerts` (workspace_id, kpi_key, status, message, created_at)

## 8. Honesty rules

- Never show projected numbers as actuals. Projections are dashed lines labelled "projection".
- Prototype and demo data says "Sample data".
- Show data freshness ("updated 2h ago") and platform limits (e.g. TikTok posts stay private until our app is audited).
- On the public site, show the dashboard with sample data only, clearly labelled.

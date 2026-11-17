# Backend phase — the plan

**Status: plan only. Nothing in here is built.** Written 16 November 2026, at
the end of the site/prototype phase, against the repo as it stands on
`v4/site-and-metrics`.

Read `docs/plan/ENGINE_WIRING.md` for how the media engine is already joined to
the app, and `supabase/README.md` for why the database is optional today.

---

## 0. What already exists, so nobody builds it twice

This phase is smaller than it looks, because four pieces of it landed during
the prototype:

| Already here | Where | State |
|---|---|---|
| **The schema for metrics and goals** | `supabase/migrations/20261113120000_metrics_and_goals.sql` | Eleven tables — `workspaces`, `goals`, `objectives`, `key_results`, `kpi_definitions`, `metric_snapshots`, `ledger_weekly`, `alerts`, `social_accounts`, `leads`, `trends`. **RLS is enabled on all eleven and there is not one policy.** |
| **The twelve KPI definitions** | `supabase/seed.sql` | Idempotent, and `lib/studio/kpi-seed.test.ts` fails if it drifts from the TypeScript. |
| **A storage adapter chosen at runtime** | `lib/leads/scan-store.ts` | Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, a git-ignored JSON file otherwise. |
| **An n8n notifier** | `lib/leads/scan-store.ts` → `notifyN8n` | Posts when `N8N_WEBHOOK_URL` is set. Nothing sets it. |
| **The engine seam** | `lib/engine/{jobs,runner,types}.ts`, `/api/engine/*` | Jobs are directories under `.data/engine-jobs`; `services/pipeline` does the work through `adapters/`. |

So: **the tables exist and nothing is allowed to read them, the adapter exists
and has no credentials, and every studio screen still reads sample data.**

Two things CLAUDE.md's repo layout promises that do **not** exist:
`automation/n8n/` (no docker-compose, no exported workflow) and any Stripe code
at all — `STRIPE_TEST_SECRET_KEY` appears in exactly one test, as a string.

---

## 1. B1 — Real auth, workspaces and RLS

**The piece everything else waits on.** Until a request carries a user, no
policy can be written and no row can be owned.

- **Supabase Auth, email + password, plus a magic link.** No social login: it
  adds an OAuth app per provider for a product whose users arrive from a sales
  conversation.
- `/sign-in` and `/sign-up` are complete screens with no server behind them.
  They keep their markup and gain actions.
- **A `profiles` table** keyed to `auth.users(id)`, and a **`memberships`**
  table joining a profile to a workspace with a role (`owner`, `member`). The
  migration has `workspaces` but nothing that says who may see one.
- **A second migration, policies only.** Every policy reads membership:
  `exists (select 1 from memberships m where m.workspace_id = t.workspace_id
  and m.user_id = auth.uid())`. `kpi_definitions` is the exception — shared
  reference data, readable by any authenticated user, writable by none.
- **The service-role key never reaches the browser.** It stays in route
  handlers and server actions; the client gets the anon key and RLS.
- **Tests that would fail without policies**: a second workspace's rows are
  invisible to the first; an anonymous client reads nothing; the service role
  reads everything. Written against a real Supabase instance — local or a
  dedicated test project — because a mocked RLS test proves nothing.

**Open question for Vlad:** previews. A preview deployment has no database
today, and that is deliberate. Either (a) one shared `mirrorline-preview`
project that every preview points at, or (b) Supabase branching, a database per
branch, which costs more and is cleaner. **(a) unless you say otherwise.**

## 2. B2 — The studio off sample data

In dependency order, because each is a different shape of write:

1. **Goals and KPIs** (`goals`, `objectives`, `key_results`, `kpi_definitions`,
   `metric_snapshots`). Mostly reads; the one write is a **target** on a key
   result, which is what "targets persisting" means. 15 §7 is the schema and it
   is already in the migration.
2. **Calendar moves.** `lib/studio/schedule-moves.ts` is already a pure module
   — `PostMove`, `applyMoves`, `movedPost` — with the moves held in a React
   context. It needs a `scheduled_posts` table and a `post_moves` write, and
   the pure functions do not change. **A move is an edit to a row, not a new
   row**: the calendar shows one post, moved.
3. **Accounts** (`social_accounts`) — connection state only. **No tokens stored
   in this phase**, because nothing may post yet (§6).
4. **Results, the Ledger and alerts** last: they read `metric_snapshots` and
   `ledger_weekly`, which stay empty until something real is published.

**The sample data does not get deleted.** `packages/mock` is what the public
site's "Sample data" surfaces render, and non-negotiable 7 requires that label
stay honest. The studio stops reading it; the marketing site does not.

## 3. B3 — Stripe, test mode only

Two products, both from `pricing-tiers.ts`, which is the only place prices
live:

| Plan | Price | Shape |
|---|---|---|
| **Pilot** | $750 | One-off payment. Two weeks of work, not a subscription. |
| **Creator** | $499 | Monthly subscription. |

- **Checkout Sessions**, not a custom card form: it keeps card data out of the
  app entirely.
- **One webhook route**, `/api/stripe/webhook`, verifying the signing secret
  and handling `checkout.session.completed`,
  `customer.subscription.updated` and `customer.subscription.deleted`.
  **Idempotent by event id** — a replayed webhook must not grant a second
  month.
- **A `subscriptions` table** keyed by workspace, holding the Stripe customer
  and subscription ids, the plan, the status and the current period end. The
  app reads status from our own table, never from a live Stripe call during a
  page render.
- **Test mode is enforced in code**, not by discipline: the client refuses to
  start if the secret key does not begin `sk_test_`. Non-negotiable 11.
- Growth, Scale and Studio stay sales-led — Studio's `priceUsd: null` is
  already the "talk to us" signal on `/pricing`.

**Not in this phase:** the Customer Portal, proration, coupons, tax, invoices,
dunning. A pilot that can be bought and a subscription that can be cancelled is
the whole of it.

## 4. B4 — The Niche Scan form, for real

The smallest piece, because `scan-store.ts` already has both halves.

- Give it the keys and the Supabase branch of the adapter starts writing to
  `leads`. **Keep the file fallback** — previews still have no database, and a
  scan request that 500s is worse than one written to disk.
- **n8n**: stand up `automation/n8n/` as CLAUDE.md's layout already promises —
  a `docker-compose.yml` and an exported workflow JSON, inactive by default.
  The webhook carries the lead id, the account type, the goal and the
  free-text niche, **never the email address in the URL**, and is signed with a
  shared secret in a header so the endpoint cannot be posted to by anyone who
  finds it.
- **The scan itself stays manual.** The flow notifies a human; Trend Scout
  researching a niche end to end is engine work, not back-office plumbing.
- `/api/leads` (the demo form) gets the same adapter treatment — it is the one
  route still writing only to `.data/leads.json`.

## 5. B5 — The video pipeline behind the adapter

`services/pipeline` already transcribes, finds moments, renders 9:16 with
burned-in captions, and runs all four compliance rules. What it does not have
is anywhere to put the result.

- **Jobs move from directories to rows.** `lib/engine/jobs.ts` is the whole
  surface — `readJob`, `writeJob`, `listJobIds`, and the paths. A `jobs` table
  plus Supabase Storage for the media, behind those same functions, and
  `/api/engine/*` does not change.
- **Storage buckets**: `uploads` (client source video), `renders` (finished
  cuts), `posters` (stills) — all private, reached by short-lived signed URLs.
  Nothing public.
- **A worker, not a request.** Rendering takes minutes and a Vercel function
  cannot hold it. The pipeline runs where ffmpeg already does — a long-running
  container or a queue consumer — and the app polls the row, exactly as
  `use-engine-job.ts` polls today.
- **The compliance gate becomes a column with a verdict and its reasons**,
  written by the Compliance agent before anything is schedulable.
  Non-negotiable 6 turns into a database constraint rather than a convention:
  a cut with no passing verdict cannot be referenced by a scheduled post.

## 6. Posting stays off, and this is the gate

**No posting to Instagram, TikTok or YouTube is built in this phase**, and the
product already says so on `/pricing` and `/trust`.

What has to be true first — all of it yours, none of it code:

- **Meta** (Instagram Graph API): app created, business verification done,
  `instagram_content_publish` approved in App Review.
- **TikTok** (Content Posting API): developer app approved and **audited** —
  an unaudited app can only post to private accounts, which is exactly what the
  product tells users today.
- **YouTube** (Data API): OAuth client, quota granted, and the audit if the
  requested quota needs one.
- **Postiz** running as a separate, unmodified service (non-negotiables 3 and
  10), with its own credentials.

Until then the schedule is a schedule: approved cuts, with times, that nothing
sends. **The honest version of this is already shipped.**

---

## 7. What I need from you, exactly

Nothing below is in the repo and nothing should be pasted into a chat — put
them in `apps/web/.env.local` locally and in the Vercel project's environment
variables for previews. **I will never print them.**

### Supabase — needed for B1, blocks everything

| Key | Where it goes | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | The project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Safe in a browser; RLS is what protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Already read by `scan-store.ts`. Never in a client component. |
| project ref + database password | my shell, for `supabase link` / `db push` | Or you apply the migrations and tell me when they are in. |

**Also needed:** which region, and the preview answer from §1 — one shared
preview project, or branching.

### Stripe — needed for B3

| Key | Note |
|---|---|
| `STRIPE_TEST_SECRET_KEY` | Must start `sk_test_`. The code will refuse anything else. |
| `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | `pk_test_…`. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…`, from a test-mode endpoint pointed at the preview URL. |

**Also needed:** whether I create the Pilot and Creator products in the test
dashboard via the API, or you create them and send me the two price ids.
Default: I create them, so the ids live beside the prices in
`pricing-tiers.ts`.

### n8n — needed for B4

| Key | Note |
|---|---|
| `N8N_WEBHOOK_URL` | Already read by `notifyN8n`. |
| `N8N_WEBHOOK_SECRET` | New. Sent as a header, so the endpoint is not open to the world. |

**Also needed:** is there a self-hosted n8n already, or do I add the
`automation/n8n/` docker-compose and you run it? And where a scan notification
should actually land — an email address, a Slack channel, a Telegram chat.

### Email

Supabase Auth sends confirmation and magic-link mail. Its built-in sender is
rate-limited and comes from a Supabase address: fine for a test, wrong for a
client. **If you want it from our domain**, I need an SMTP provider and the
domain verified — a Resend API key and a verified sending domain is the
shortest path.

### Later, not this phase — the platform apps

Please start these when you can: the review queues are the long pole and none
of it is code. **Meta** app + business verification + App Review, **TikTok**
developer app + audit, **YouTube** OAuth client + quota. The posting work in
§5–6 is blocked on all three.

---

## 8. Order, and how each step is proved

| Step | Done when |
|---|---|
| B1 auth + RLS | A second workspace cannot read the first, proved against a real instance. Anonymous reads nothing. |
| B2 studio | Goals, targets and calendar moves survive a reload and a different browser. Sample data still only on marketing. |
| B3 Stripe | A test card buys a Pilot and a Creator; a replayed webhook changes nothing; a live key is refused at startup. |
| B4 scan | A scan request lands in `leads` and fires the webhook; with no keys it still writes to disk. |
| B5 pipeline | A real upload produces cuts, a compliance verdict and a row the studio renders — with posting still impossible. |

Every step keeps the existing gates: `pnpm lint && pnpm typecheck && pnpm test
&& pnpm build && pnpm licence-check`, the e2e suite, and the axe gate — which
now fails on `moderate` too (D75). Lighthouse mobile ≥ 90 stays a gate on the
public pages; the studio is not held to it.

## 9. What this phase deliberately does not do

- **No production deploys and no real money.** Non-negotiable 11, unchanged.
- **No posting.** §6.
- **No multi-tenant billing beyond one plan per workspace.** Agencies with many
  clients are a real requirement in 09 and a different schema; not now.
- **No analytics vendor.** The cookie banner currently tells the truth — "no
  vendor collecting anything about this visit" — and adding one is a decision
  with a consent flow attached rather than a plumbing task.
- **No migration of the sample data into the database.** The fictional client
  is a demo, not a seed.

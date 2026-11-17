# Backend phase — the plan

**Status: plan only. Nothing in here is built.** Written 16 November 2026, at
the end of the site/prototype phase, against the repo as it stands on
`v4/site-and-metrics`.

**Updated 16 November 2026 with Vlad's answers** — D76 (previews share one
database), D77 (I create the Stripe test products), D78 (n8n is deferred; B4
emails instead), D79 (auth mail stays on Supabase's sender) and D80 (the plan
now covers cancellation, account deletion and a self-service export, because
the site already promises all three). §1, §3, §4, §7 and §8 say what was
decided rather than what was assumed.

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
| **An n8n notifier** | `lib/leads/scan-store.ts` → `notifyN8n` | Posts when `N8N_WEBHOOK_URL` is set. Nothing sets it, and **nothing will this phase** — D78 defers n8n and the adapter stays exactly as it is, inactive. |
| **The engine seam** | `lib/engine/{jobs,runner,types}.ts`, `/api/engine/*` | Jobs are directories under `.data/engine-jobs`; `services/pipeline` does the work through `adapters/`. |

So: **the tables exist and nothing is allowed to read them, the adapter exists
and has no credentials, and every studio screen still reads sample data.**

Two things CLAUDE.md's repo layout promises that do **not** exist:
`automation/n8n/` (no docker-compose, no exported workflow) and any Stripe code
at all — `STRIPE_TEST_SECRET_KEY` appears in exactly one test, as a string.
**The first stays missing**: D78 defers n8n out of this phase. The second is
B3.

And three things the **site** promises that the app does not have: a cancel
control (`/legal/cancellation-refunds` and five other places), a working
export (two stub buttons in Settings) and account deletion (`/legal/privacy`,
with no control at all). D80 puts all three in this phase — §1, §2 and §3.

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

### Previews: one shared database (D76, decided)

**Every preview deployment points at a single `mirrorline-preview` Supabase
project, region `us-east-1`.** Not branching, not a database per branch.
**Production gets its own project later**, when there is something to put in
production — and the two never share a key.

What follows from one shared database, and has to be built rather than hoped
for:

- **The RLS tests run against it**, which is the point: a policy proved on a
  real instance is a proof, and a mocked one is a sentence. The suite creates
  two workspaces, asserts each is blind to the other, and tears them down.
- **Preview data is shared, so every test fixture is namespaced and removed.**
  Two branches running the suite at once must not see each other's rows. Each
  run gets its own workspace id and deletes it in teardown; nothing writes to
  a fixed, well-known row.
- **It is not production and will be said so in the UI.** A preview build
  shows the environment, because a shared database that looks like a client's
  own is exactly the confusion non-negotiable 7 exists to prevent.
- **The region is `us-east-1`** so the database sits beside the Vercel
  deployments rather than an ocean away from them.

### Account deletion, from the top (D80)

The privacy notice already says *"You can ask for a copy of your data, or ask
us to delete your workspace."* Today Settings has neither control — the export
buttons are stubs that open a notice, and **there is no delete at all**. A
promise with no mechanism is the thing this product was built to stop doing.

- **A delete-workspace action in Settings**, behind a typed confirmation, not
  a single misclickable button. Owner only: `memberships.role = 'owner'`.
- **It deletes, rather than hides.** `on delete cascade` from `workspaces`
  through every table that carries a `workspace_id`, so there is no orphan row
  left behind claiming otherwise. Storage objects go with it in B5, when
  there are any.
- **The auth user goes too** when the deleted workspace was their last — a
  `profiles` row with no workspace is a login into nothing.
- **An export is offered first.** Deletion is irreversible and the copy says
  the files stay yours; the dialog links to the export rather than assuming
  somebody read the policy page.
- **A test that would fail without it**: after deletion, a service-role read
  of every table returns nothing for that workspace id — the assertion is
  "zero rows across all eleven", not "the workspace row is gone".

The export itself is B2, because it is a read of studio data; the deletion is
B1, because it is an auth and ownership question.

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

5. **The export of the user's own data** (D80), last, because it can only
   export what the four above have made real.

**The sample data does not get deleted.** `packages/mock` is what the public
site's "Sample data" surfaces render, and non-negotiable 7 requires that label
stay honest. The studio stops reading it; the marketing site does not.

### The export, in two halves — because Settings already offers two (D80)

`components/settings/data-rights-card.tsx` ships two buttons and both are
stubs: **"Export all my files"** and **"Export my data"**. They answer
different questions and the plan keeps them apart rather than merging them
into one download:

- **"Export my data"** — the rows. Everything in the workspace the user can
  see through RLS: goals, objectives, key results, targets, scheduled posts
  and their moves, social-account connection state, leads, metric snapshots,
  the weekly ledger, alerts. **JSON, generated server-side from a single
  membership-scoped read**, so the export can never return more than the
  screen would. This one is deliverable in B2.
- **"Export all my files"** — the media. Signed, time-limited URLs to the
  renders and posters in Storage. **It has nothing to export until B5**, and
  the button says so until then rather than producing an empty archive. The
  honest intermediate state is a notice that names what is missing, not a
  zip with nothing in it.

Both run as the user, through their own session — never the service role with
a workspace id taken from the request, which would be an export endpoint that
hands over any workspace to anybody who can guess an id.

**A test that would fail without it**: a second workspace's rows are absent
from the first workspace's export. Same fixture as the RLS tests, one more
assertion — if the export ever bypasses a policy, that is where it shows.

The copy on `/legal/cancellation-refunds` says the export "keeps working after
you cancel", so **export is not gated on subscription status** — only on
having an account. B3 must not break that, and §8 proves it.

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

### The two products are mine to create (D77)

**I create Pilot and Creator in the test dashboard through the Stripe API**,
and the resulting price ids go **beside the prices in `pricing-tiers.ts`** —
the same file, the same object, so a plan carries its own id.

`PricingTier` already holds `price` and `priceUsd` with a test asserting the
two never disagree; the id joins them under the same rule. A new optional
`stripeTestPriceId` field, `null` for the three sales-led plans, and **a test
that fails if a tier with a `priceUsd` and no `comingSoonLabel` has no id** —
that is the condition for "a plan you can buy", so the test asks the question
that matters rather than listing names.

The ids are test-mode `price_…` values. They are not secrets, they are not in
`.env`, and they are committed — a `price_` id without `sk_test_` buys
nothing.

### Cancellation is in this phase (D80)

`/legal/cancellation-refunds` says **"You cancel from Settings, in one click,
at any time. You do not need to email us, give notice, or speak to anyone
first."** `/pricing`, `/individuals`, the home page and the FAQ repeat it.
That is six places promising a control that does not exist, so it is built
here rather than later.

**Our own button, not the Stripe Customer Portal.** The portal is a redirect
off our domain and several clicks deep; "one click, from Settings" is the
promise and a redirect does not keep it. So:

- **`components/settings/plan-card.tsx` already has the cancel affordance** —
  tertiary, visible, with a comment citing 09 §10 — and a notice saying
  billing is not connected. It keeps its markup and gains an action.
- **A confirm step, then `subscriptions.update(cancel_at_period_end: true)`.**
  Cancelling does not delete the workspace and does not cut the month short:
  the user keeps what they paid for until the period ends. "One click" is
  about the absence of a phone call, not the absence of a confirmation.
- **The status comes back through the webhook**, not from the response. The
  `customer.subscription.updated` handler already in this phase writes
  `cancel_at_period_end` and `current_period_end` to our `subscriptions`
  table, and Settings reads our table. One path for state, whatever caused
  the change.
- **Undo, because `cancel_at_period_end` is reversible.** While the period is
  still running the same card offers "Keep my plan" — a cancellation you
  cannot take back before it has taken effect is a worse product and a worse
  support queue.
- **Export keeps working after cancellation** (§2). A test asserts it: cancel,
  advance past the period end, export still returns the rows.

**Still not in this phase:** the Customer Portal, proration, coupons, tax,
invoices, dunning. Invoices and payment-method changes are the portal's real
job and it can be added when a client asks for one.

## 4. B4 — The Niche Scan form, for real

The smallest piece, because `scan-store.ts` already has both halves.

- Give it the keys and the Supabase branch of the adapter starts writing to
  `leads`. **Keep the file fallback** — previews still have no database, and a
  scan request that 500s is worse than one written to disk.
- **n8n is skipped for now (D78).** `automation/n8n/` is not stood up this
  phase, and `notifyN8n` in `scan-store.ts` **stays exactly as it is** —
  present, tested, dormant because `N8N_WEBHOOK_URL` is unset. Deleting an
  adapter that already works to re-add it in a month is churn, so it keeps
  its place and its test. CLAUDE.md's repo layout still promises the
  directory; that promise is deferred, not dropped.
- **Instead, B4 emails Vlad directly from the app.** A new scan writes to
  `leads` and sends one notification: the lead id, the account type, the goal,
  the free-text niche, and a link to the row. **The email address of the
  person who filled the form is in the body, never in a URL or a subject
  line.**
- **A `lib/notify/email.ts` adapter, same shape as `scan-store.ts`** — a
  provider when the key is set, and a logged no-op otherwise, because a scan
  request that 500s because a mail server was down is worse than a scan
  recorded and a notification missed. **The write and the notification are
  never in the same failure path.**
- **This needs one mail credential that Supabase does not provide.** D79
  keeps auth mail on Supabase's built-in sender, but that sender only renders
  Supabase's own auth templates — confirmation, magic link, recovery. It
  cannot send a scan notification. The shortest path that does not need a
  domain we do not have yet: **Resend's test sender, which delivers to the
  account owner's own address** — which is precisely the one address this
  notification goes to. When there is a real name and a domain, the same
  adapter gains a verified sender and D79's auth mail moves to it too.
- **The recipient is an environment variable, not a line in the repo.**
  `SCAN_NOTIFY_EMAIL`. A personal address committed to git is a small leak
  with a long life.
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

**Decided, so no longer asked (D76):** one project named
`mirrorline-preview`, region **`us-east-1`**, shared by every preview
deployment. Production gets its own project later and never shares a key with
this one. **The keys above are that project's keys.**

### Stripe — needed for B3

| Key | Note |
|---|---|
| `STRIPE_TEST_SECRET_KEY` | Must start `sk_test_`. The code will refuse anything else. |
| `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | `pk_test_…`. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…`, from a test-mode endpoint pointed at the preview URL. |

**Decided, so no longer asked (D77):** I create the Pilot and Creator products
in the test dashboard through the API, and the two `price_…` ids go beside the
prices in `pricing-tiers.ts` — committed, because a test-mode price id without
a secret key buys nothing.

### Mail — needed for B4

| Key | Note |
|---|---|
| `RESEND_API_KEY` | Or any SMTP provider; the adapter does not care which. Test sender only — no domain yet. |
| `SCAN_NOTIFY_EMAIL` | Where a new scan lands. Your address, in the environment rather than in the repo. |

**Why this exists at all, given D79:** Supabase's built-in sender only renders
its own auth templates. It cannot send a scan notification, so B4 needs one
mail credential of its own even though auth mail does not. **Without it B4
still works** — the lead is written and the notification is logged instead of
sent — so this blocks the notification, not the feature.

### n8n — not this phase (D78)

**No keys needed.** `N8N_WEBHOOK_URL` and the shared secret are deferred along
with `automation/n8n/`. `notifyN8n` stays in `scan-store.ts`, unset and
dormant, for whenever the back-office flows are worth standing up.

### Auth email — decided (D79)

**Supabase's built-in sender, until there is a real name and a domain.** It is
rate-limited and the mail comes from a Supabase address, which is right for a
test-mode product with no production deploy and no real client on it. **This
is a thing to revisit before the first client**, not after: confirmation mail
from a stranger's domain is the kind of detail that costs an account its first
impression. When the name and domain exist, both this and B4's notifications
move to the same verified sender.

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
| B1 deletion | After a workspace is deleted, a **service-role** read returns zero rows for it across all eleven tables — and the last owner can no longer sign in. |
| B2 studio | Goals, targets and calendar moves survive a reload and a different browser. Sample data still only on marketing. |
| B2 export | "Export my data" returns this workspace's rows and **none of a second workspace's**, run as the user rather than the service role. |
| B3 Stripe | A test card buys a Pilot and a Creator; a replayed webhook changes nothing; a live key is refused at startup. |
| B3 cancellation | Cancel from Settings sets `cancel_at_period_end`, the webhook writes it to our table, "Keep my plan" reverses it, and **the export still works after the period ends**. |
| B4 scan | A scan request lands in `leads` and emails the notification; **with no mail key the lead is still written** and the notification is logged. |
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
- **No n8n, and no `automation/n8n/`** (D78). B4 emails instead; the adapter
  stays dormant for whenever the back-office flows justify a service.
- **No Customer Portal, and no media export.** Cancellation is our own button
  (§3) and "Export all my files" has nothing to export until B5 (§2) — it
  says so rather than sending an empty archive.
- **No production Supabase project.** One shared preview database, and the
  production one is created when there is something to put in it (D76).
- **No migration of the sample data into the database.** The fictional client
  is a demo, not a seed.

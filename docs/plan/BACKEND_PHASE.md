# Backend phase — the plan

**Status: B1 is built and merged. Everything from B1.5 onward is still plan
only.** Written 16 November 2026 at the end of the site/prototype phase;
**revised 19 November 2026** against `main` at `cbdda37`.

> **Section numbers are an API. Do not renumber them.** `lib/supabase/env.ts`
> and `/api/health/supabase` print *"see docs/plan/BACKEND_PHASE.md §7"* **to
> the user** when keys are missing, and `rls.db.test.ts`, `auth-forms.tsx` and
> `e2e/auth.setup.ts` cite §1 and §7 in comments. That is why this revision adds
> **§1.5** and **§5.5** rather than shifting §2–§9 down: a renumber would
> silently turn a live error message into a wrong one. New phases get decimal
> sections; the phase names (B1…B7) and the section numbers were already
> different sequences.

### What changed since the first draft

- **B1 is done and in `main`** (PR #2, merged 19 November as `cbdda37`). Real
  auth, `profiles`, `memberships`, every RLS policy proved against a live
  instance, workspace bootstrap, onboarding's write, workspace deletion and the
  rows export. §1 is kept as a record of what shipped rather than a plan.
- **Production exists, and it tracks `main`** (D85). Vercel's production branch
  is `main`, the production URL is `mirrorline-eosin.vercel.app`, and production
  holds its own environment variables. **Merging is the only thing that
  deploys**, and it is Vlad's. The original draft said "no production deploys"
  because there was no production; the rule is now stricter rather than looser,
  and it is why §1.5's first item exists at all.
- **Previews have a database** (D76, now real): one shared `mirrorline-preview`
  project in `us-east-1`, which every preview and the e2e suite point at.
  `supabase/README.md`'s "the database is optional today" is no longer true of
  `/app/*` — it is true only of the marketing site.
- **13 tables in `public`**, not eleven: `profiles` and `memberships` joined the
  original eleven in B1. **All 13 carry policies now** — the draft's "RLS is
  enabled on all eleven and there is not one policy" was the most important
  line in it, and it is spent.
- **D91 — the onboarding lesson**, which changed how this plan proves things.
  Onboarding's submit silently stopped working: the form hung for ever, and the
  diagnosis "the server action never settles" was wrong three times over. The
  action was never *called*. Mirroring a wizard step into the URL with
  `router.replace` dispatched a navigation, and two overlapping navigations
  strand every later action — a server action included — in Next's action
  queue. Three lessons are now load-bearing in §8:
  **(a)** a test that passes before the fix guards nothing, so every "done
  when" below names a check that fails without the work;
  **(b)** never raise a timeout to make a symptom go away;
  **(c)** a latency-dependent race looks exactly like "the environment
  changed", so "no code changed between the green run and the red one" is not
  evidence that a cause is environmental.
- **D92 — force-pushing** is now aimed at `main` and at branches under someone
  else's review, with `--force-with-lease` allowed on your own feature branch
  after a rebase. Relevant here because §1.5's migration gate and its e2e
  sharding both assume feature branches are rebased rather than merged back
  into.
- **D113 — the value sprint comes first**, added 22 November 2026. A new
  **§2.5** inserts V1–V7 *before* B3, B6 and B7: the Niche Scan agent, the
  script and hook agent, the Originality Gate, the inline AI assists, the video
  agent, an internal ops console, and the co-pilot triggers. The target is a
  **hand-run Pilot on day 7**, which needs no checkout, no metrics ingestion
  and no posting API. **B3, B6 and B7 are deferred, not cut**, and keep their
  section numbers — §2.5 is a decimal section for the reason §0's note gives.
  **B2 is complete once PR #11 merges** (B2.1–B2.5 are all built; #11 was
  green and unmerged when this was written), which is what frees the sequence
  to change.

Read `docs/plan/ENGINE_WIRING.md` for how the media engine is already joined to
the app, and `supabase/README.md` for the database's history.

---

## 0. What already exists, so nobody builds it twice

This phase is smaller than it looks, because four pieces of it landed during
the prototype:

| Already here | Where | State |
|---|---|---|
| **The schema, with policies** | `supabase/migrations/` (6 files) | **13 tables** — the original eleven (`workspaces`, `goals`, `objectives`, `key_results`, `kpi_definitions`, `metric_snapshots`, `ledger_weekly`, `alerts`, `social_accounts`, `leads`, `trends`) plus `profiles` and `memberships` from B1. **Every one carries policies now**, proved against a live instance by `rls.db.test.ts`. |
| **Auth, workspaces and ownership** | `lib/supabase/`, `middleware.ts`, `app/(auth)/` | B1, merged. Email + password, magic link, reset, Remember me; `ensure_workspace_for_current_user` at sign-in; `save_onboarding`; owner-only workspace deletion that refuses while other members remain; the rows export read as the user. |
| **The twelve KPI definitions** | `supabase/seed.sql` | Idempotent, and `lib/studio/kpi-seed.test.ts` fails if it drifts from the TypeScript. |
| **A storage adapter chosen at runtime** | `lib/leads/scan-store.ts` | Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, a git-ignored JSON file otherwise. |
| **An n8n notifier** | `lib/leads/scan-store.ts` → `notifyN8n` | Posts when `N8N_WEBHOOK_URL` is set. Nothing sets it, and **nothing will this phase** — D78 defers n8n and the adapter stays exactly as it is, inactive. |
| **The engine seam** | `lib/engine/{jobs,runner,types}.ts`, `/api/engine/*` | Jobs are directories under `.data/engine-jobs`; `services/pipeline` does the work through `adapters/`. |

So, as of 19 November: **the tables exist and are properly fenced, the adapter
has its credentials, and the studio has started coming off sample data — Goals
and the Results goals-tab read the real workspace (B2.1, in flight on
`backend/b2-studio`). Every other studio screen still reads `packages/mock`.**

Two things CLAUDE.md's repo layout promises that do **not** exist:
`automation/n8n/` (no docker-compose, no exported workflow) and any Stripe code
at all — `STRIPE_TEST_SECRET_KEY` appears in exactly one test, as a string.
**The first stays missing**: D78 defers n8n out of this phase. The second is
B3.

And three things the **site** promised that the app did not have. Two are now
built: **account deletion** (owner-only, typed confirmation, refuses while
other members remain) and the **rows export**, both shipped in B1. The third —
a **cancel control**, promised on `/legal/cancellation-refunds` and five other
places — is still missing, and is B3 (§3).

**One more promise this revision adds to the list**, because nothing in the
first draft covered it: production now exists and tracks `main` (D85), but
**migrations are applied by hand**. A merge deploys the app and *not* the
schema it needs, which is a production outage waiting for the first migration
that matters. That is §1.5's first item.

---

## 1. B1 — Real auth, workspaces and RLS — **DONE (PR #2, `cbdda37`)**

**The piece everything else waited on.** Kept as a record of what shipped, not
as a plan. Everything in this section is built and in `main`; where the plan and
the result differ, the difference is noted inline.

Two things worth carrying forward:

- **The RLS tests run against a real instance** (`pnpm test:rls-db`, 49 tests).
  The draft insisted on this and it was right: a mocked RLS test proves nothing.
- **The onboarding submit was broken for two days inside this phase** and the
  cause was not in B1's auth, its RLS or its RPC — it was a client-side
  navigation stranding a server action (D91). It is listed here because the
  temptation was to look at the new, server-side, security-shaped code, and the
  bug was in the wizard's URL mirroring.

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

## 1.5 B1.5 — Foundations, before any more features

**New in this revision.** None of this is a feature and all of it is now owed,
because B1 shipping changed the facts: there is a production, it tracks `main`,
and it has users-of-one. Six items, roughly in order of what breaks first.

### 1.5a Migrations reach production, through a gate (highest priority)

**Today a merge to `main` deploys the app and not the schema.** Production has
its own Supabase project and its own variables (D85); migrations are applied by
hand. The first migration that an app change depends on will therefore deploy
broken code against an old schema, in production, with no warning.

- **A GitHub Action on merge to `main`** runs `supabase db push` against
  production, with the project ref and database password in repository secrets.
- **Gated, not automatic.** A GitHub Environment with a required reviewer, so
  the job waits for Vlad. "Merging is the only thing that deploys" (D85) stays
  true of the app; the schema gets one deliberate extra click, because a bad
  migration is the one deploy you cannot roll back by reverting a commit.
- **Forward-only, and every migration additive.** No destructive statement in a
  migration that ships with app code that still reads the old shape: add a
  column, deploy, backfill, then drop in a later migration. The three-step is
  tedious and it is the only version that survives a rollback.
- **The same Action runs against the preview project on every PR**, so a
  migration is proved before it is near production.
- **Done when:** a PR adding a trivial migration shows it applied to preview
  automatically and to production only after an approval, and
  `supabase migration list` agrees across both.

### 1.5b Error tracking

**Right now a production error is invisible.** D91 took two days partly because
nothing recorded that a server action was never reaching the server; the only
signal was a human noticing a hung button.

- **Sentry** (or equivalent) on both the Next runtime and the browser, with
  source maps uploaded at build and releases tagged by commit.
- **Scrub before send.** No `email`, no `outcome_text`, no niche free-text, no
  tokens. The scrubber is a test, not a config comment — the whole point of
  this product is not leaking what clients tell us.
- **An alert that would have caught D91**: a client-side route that reports a
  pending transition over N seconds, and an unhandled-rejection rate. A hang
  reports nothing by default, which is exactly why it went unnoticed.
- **Done when:** a deliberately thrown error in a preview appears with a
  readable stack and the release tag, and a seeded PII field is absent.

### 1.5c A scheduler

B6 (metrics) and the weekly ledger both need something to run on a clock, and
there is nothing today.

- **Vercel Cron** for anything that is an HTTP call we already have a route
  for; **`pg_cron`** for anything that is pure SQL and should not depend on the
  app being up.
- **Recommendation: Vercel Cron**, because the metrics pulls are HTTP calls to
  third-party APIs with token refresh, which belongs in app code next to the
  adapters rather than in a database extension. `pg_cron` stays the right answer
  for ledger rollups, which are SQL over rows we already hold.
- **Every scheduled route is idempotent and authenticated** — a `CRON_SECRET`
  header, because a public URL that triggers an ingest is an invitation.
- **Done when:** a scheduled job runs on time in preview, a second
  simultaneous invocation changes nothing, and an unauthenticated call is
  refused.

### 1.5d Turnstile on sign-up

`/sign-up` posts to a rate-limited sender on a real project. Nothing stops a
script making accounts, and the first time somebody does, the auth sender is
spent for everyone (D79's limit is already a live constraint).

- **Cloudflare Turnstile**, verified server-side in the sign-up action before
  the Supabase call. Free, and no visible challenge for a normal person.
- **Also on the Niche Scan form** (`/api/leads`), which is the other
  unauthenticated write.
- **The e2e suite needs a bypass**, through a test-mode site key that always
  passes, not an environment flag that disables the check — a flag that turns
  off a protection is one deploy away from being set in production.
- **Done when:** sign-up with no token is refused server-side, and
  `sign-up-ui.spec.ts` still passes.

### 1.5e e2e sharding

The suite is **~13 minutes** for 406 tests, run serially per project. Twice
through, which is the standing requirement before a merge, is half an hour.

- **Shard across runners** (`--shard=i/n`), with the `setup` project's session
  established per shard — it signs in through the real form, so each shard
  needs its own account rather than a shared storage state.
- **The teardown sweep already supports this**: accounts are namespaced per run
  and swept by age, so parallel shards cannot delete each other's fixtures.
  That design decision was made for concurrent branches and pays for itself
  here.
- **Keep `fullyParallel` off within a shard** until the shared-session specs are
  audited — several assume they are the only writer on the shared account.
- **Done when:** four shards finish in under five minutes with the same pass
  count as a single run, twice in a row.

### 1.5f An axe pass at 390px, and a skip reason that tells the truth

The previous handoff's audit found this and it is still open. **Axe never runs
at 390px.** All four axe-using specs (`a11y`, `copilot-site`,
`copilot-studio`, `home-sections`) are chromium-only, and
`responsive.spec.ts` — which `a11y.spec.ts`'s skip reason cites as owning
390px — asserts horizontal scroll and the sidebar/drawer swap and **never calls
axe**.

- **Run axe at 390px** across the public pages and the studio shell. Touch
  targets, focus order through the mobile drawer, and aria on the hamburger are
  all unverified today.
- **Fix `a11y.spec.ts`'s skip reason.** It currently overstates what covers it,
  which is worse than no comment: it tells the next person the gap is closed.
- **Expect findings.** Two are already known from the goals work: the outcome
  bar's aria-label reads *"The target is 120 , this quarter"* with a stray space
  before the comma, and `getByLabel('Target')` matching both that bar and the
  input is a sign the bar's label is doing too much.
- **Done when:** axe runs at both viewports on both surfaces with the D75
  `moderate` threshold, and the skip reasons name what actually covers what.

## 2. B2 — The studio off sample data

In dependency order, because each is a different shape of write:

1. **Goals and KPIs** (`goals`, `objectives`, `key_results`, `kpi_definitions`,
   `metric_snapshots`) — **B2.1, built, on `backend/b2-studio`.** Mostly reads;
   the one write is a **target** on a key result, which is what "targets
   persisting" means. 15 §7 is the schema and it was already in the migration.

   Three things it settled that the rest of B2 inherits:

   - **`KeyResult.current` is `number | null`, not `number`.**
     `metric_snapshots` stays empty until B6, so no real workspace has a current
     value. A `0` would claim we measured and found nothing; the baseline would
     claim nothing changed. Screens read "Not measured yet" and `keyResultPace`
     has an `unmeasured` state. **Every screen B2 converts has the same
     question to answer**, and the answer is a null, not a zero.
   - **No studio screen falls back to sample data.** `GoalsBoard` defaulted to
     the demo cascade when handed none — right for the marketing site, wrong in
     the studio, where a client would have seen somebody else's goal with
     nothing saying so. That is exactly what non-negotiable 7's label exists to
     prevent, and the fix was to render an empty state instead.
   - **Authorisation is one RLS check, not a re-derivation.** The target write
     runs as the user with `key_results_update_members` as the only gate, and
     `.select()` on the update so a row RLS filtered out reports not-found
     rather than a silent success.
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

## 2.5 V1–V7 — The value sprint, which comes before the plumbing

**Vlad's re-sequencing, 22 November 2026 (D113).** A one-week sprint to a
**hand-run Pilot on day 7**. B3, B6 and B7 keep their section numbers and their
content; they move *after* this. Nothing below is deleted — it is deferred.

### Why the order changed

The plan as written reached a paying customer through checkout (B3), then
metrics (B6), then posting (B7) — three pieces of plumbing before the client
saw a single thing the product had made. **The AI that creates is the product.**
A Pilot we run by hand needs no checkout (we invoice), no metrics ingestion (we
read the platform dashboards), and no posting API (we hand the client the files
and they post). What it does need is a niche report, scripts the client
recognises as their own voice, cuts from their own footage, and a gate that
proves none of it is anybody else's work.

So the sprint builds the seven things a Pilot actually consumes, and the
plumbing waits for the second client — when doing it by hand stops scaling,
which is the honest trigger for automating it.

**This does not loosen any non-negotiable.** It removes a *payment* step from
the critical path, not a *compliance* one. V3 is in the sprint precisely
because the Originality Gate (non-negotiable 6) cannot be the thing that waits.

### The contract every V item obeys

Lifted from `18 §4` and `18 §6`, because the co-pilot already solved this and a
second pattern would be a second thing to audit:

- **Server-side only.** The Anthropic SDK is imported in one module per agent,
  under `app/api/*` or a worker. **No key ever reaches a browser bundle**, and
  a unit test asserts no `'use client'` module imports an adapter.
- **Metered per workspace, with a hard monthly cap.** `countTokens` before the
  call; if the projected spend crosses the cap the call is **not made** and the
  surface says so. Real usage read off the response after
  (`input_tokens`, `output_tokens`, `cache_read_input_tokens`,
  `cache_creation_input_tokens`) and added to the workspace's month. The cap is
  a stop, not a warning — non-negotiable 11 means the ceiling has to hold.
- **Logged.** Every call written to the agent log with time, input, output,
  cost and reason (`04 §Shared rules`).
- **Works with no key.** Canned mode is a supported path, labelled in the UI,
  exactly as the co-pilot does it. Every V item must be previewable and
  testable before a key exists.

### V1 — Niche Scan agent

The onboarding form triggers a research run that produces a **structured niche
report**: top formats, hooks, topics, lengths, posting patterns. Viewable in
the studio, downloadable as PDF, and usable by us for prospects.

**Sources, and a conflict that needs your eye.** `04` and `12 §1` give the scan
a *closed* allow-list — TikTok Creative Center, Meta Ad Library, YouTube Data
API, the client's own insights, and manual review of up to 30 public examples —
phrased "Allowed, and nothing else". The instruction for V1 is "Anthropic API
with web search", which is **not on that list**. I have built to the
instruction and recorded the widening as **D113**, with the constraints that
actually carry the legal weight kept intact:

- **Links and descriptions only, never media.** No video, no audio, no image is
  downloaded or stored. This is non-negotiable 1 and it does not move.
- **`source_note` per row**, as `12 §1` requires, so an audit of our sources is
  answerable from the data rather than from memory.
- No scraping of private data, no logging into other accounts, no bulk
  collection. `tt_collect.py` and `ig_account_dump.py` stay banned.

If you would rather the scan stay inside the closed list, say so and V1 narrows
to the four APIs plus manual review — it is a source swap behind one adapter,
not a rebuild.

**Ranking is views-per-follower over 30 days**, never follower count (`12 §1`).
Ranking by raw views recommends the coasting two-million-follower account.

**Done when**: a scan for a niche with no seed row in `12 §2` still returns
ranked recipes; every stored row carries a `source_note` and a URL; and a test
asserts the scan wrote **no media object** to Storage.

### V2 — Script & hook agent (Format Remix)

From the niche report plus the client's own material, produce **original**
scripts, hooks and captions in the client's voice.

Recreates **patterns, never expression** — the B8 principle (D112), and
`12 §3`'s sequence: take the recipe's beats (hook → setup → payoff → CTA),
never its footage or audio; write from the client's Voice and Facts profile
with at least one real business fact per script.

**Done when**: a script generated from a recipe shares the recipe's beat
structure and **no sentence** with the source example, and a script with no
business fact is rejected rather than shipped.

### V3 — Originality Gate

An automated check on **every** output: no copied text or captions, no reused
footage, not a shot-for-shot remake. Verdict plus reasons stored; **blocks
approval when it fails**.

`04 §Originality Gate` governs it and nothing here softens it: compared against
the source format *and* the client's own last 90 posts; over the limit the
draft goes back to V2 with the offending lines named; **no warn-and-continue
and no override, from anywhere**; two failures block and tell the Concierge.
The verdict is shown to the client with the number, the limit and what the gate
did — a gate whose failures are invisible is the predecessor project's gate.

**Done when**: a deliberately-copied draft is blocked and the block is visible
in the studio; the approve action is refused server-side, not merely hidden;
and "blocked twice" reaches a terminal state rather than looping.

### V4 — "Generate with AI" inline assists

User-initiated, never automatic, in four places: onboarding (goal and outcome
wording), hooks and captions, brand-kit voice, KPI target suggestions.

Every suggestion is **labelled "AI-suggested"** and **the user edits before
saving** — the same shape as `18 §2.3`'s propose-don't-dispose, and it is
deliberate that an assist is trusted no further than the co-pilot.

**Done when**: no assist writes to the database without an explicit save; the
label is present on every suggested value; and with no key the buttons still
work in canned mode.

### V5 — Video agent

Client uploads raw video **direct to Supabase Storage** — resumable, and
**never through Vercel** (a function body limit is not an upload strategy).
`services/pipeline` is wired behind the existing adapter as a worker job:
transcribe → moments → 9:16 cuts with captions. **AI-generated scenes are
labelled** (D99, non-negotiable 4).

**The generator choice is yours and is not made here.** Build the adapter so a
vetted generator plugs in; do not pick one. This is one of the four things the
sprint stops for.

**Done when**: a 2GB upload survives an interrupted and resumed connection; no
request body crosses the function limit; a second workspace can neither read
the object nor see the row; and a cut carrying an AI scene is labelled in the
UI *and* in its stored metadata.

### V6 — Ops console (internal)

Lists a client's niche report, scripts and cuts. Approve or reject with notes.
**Approved items appear in the client's studio for download.**

This is the hand-run half of the Pilot made visible: on day 7 the thing a
client receives was approved by a person, through this screen, and the approval
is a row rather than an email.

**Done when**: a rejected item never appears in the client's studio; an
approval is attributable to a named operator; and an item that failed V3 cannot
be approved at all.

### V7 — Co-pilot triggers

The studio co-pilot ("Milo", `18 §2`) can trigger V1, V2 and V4 on request.

It **proposes and does not execute** — `18 §2.3` is unchanged, so a triggered
run renders as a card with Approve and Dismiss, and the run starts on Approve.
Proposals come back as **structured output**, never parsed out of prose.

**Done when**: asking the co-pilot to run a scan produces a proposal, not a
scan; and the run is absent from the agent log until Approve is pressed.

### What the sprint deliberately does not build

B3 checkout, B6 metrics ingestion and B7 posting. The Pilot is invoiced by
hand, read from platform dashboards by hand, and posted by the client. When
the second Pilot makes that stop scaling, the sections below are waiting,
unchanged.

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

### Entitlements — what the money actually buys

**New in this revision.** The draft had a `subscriptions` table with a status
and stopped there, which is enough to say "they paid" and not enough to answer
"so what are they allowed to do". Every screen that has to make that decision
will otherwise invent its own answer.

**One module, `lib/billing/entitlements.ts`, pure and tested**, that turns a
subscription row into a capability set. Screens ask the capability, never the
plan name — `canSchedule(entitlements)`, not `plan === 'creator'`. A plan name
scattered through components is how a price change becomes a bug hunt.

#### What each plan unlocks

Derived from `pricing-tiers.ts` and 09 §Services, which stay the only place
prices and posts-per-week live. The entitlement module reads them; it does not
restate them.

| | Pilot ($750, one-off) | Creator ($499/mo) | Growth / Scale / Studio |
|---|---|---|---|
| Posts per week | per 09 §Services | per 09 §Services | sales-led |
| Connected accounts | 1 | per 09 | per 09 |
| Workspaces | 1 | 1 | many — **not this phase** (§9) |
| Niche Scan | yes | yes | yes |
| Studio screens | all | all | all |
| Export (rows) | **always**, see below | always | always |
| Scheduling / publishing | **blocked until B7** for everyone | — | — |

**The row export is never gated.** `/legal/cancellation-refunds` says it "keeps
working after you cancel", so it is gated on having an account and nothing
else. The entitlement module must not be able to express "export denied", so
there is no capability for it — the absence is the enforcement, and §8 proves
it.

#### Pilot expiry

**Pilot is two weeks of work, not a subscription**, and a one-off payment has
no `current_period_end` for a webhook to move. So its end has to be written
down rather than inferred:

- `checkout.session.completed` for the Pilot price writes
  `subscriptions.pilot_expires_at = now() + interval '14 days'` alongside the
  plan. **One timestamp, set once, from the server's clock** — never from the
  client, and never recomputed on read, or a redeploy silently extends
  everybody's trial.
- **Expiry degrades, it does not lock out.** After it passes: the studio stays
  readable, the export keeps working, and anything that would schedule or
  consume engine time is refused with a sentence naming what ended and what to
  do. Deleting access to data somebody paid for is not a billing state, it is a
  data-loss bug.
- **A real end date on screen, from the first day.** `plan-card.tsx` shows
  "Your Pilot runs until 3 December" rather than a countdown that appears at
  the end. 15 §1's honesty rule applies to our own commitments too.
- **Expiry is not a webhook.** Stripe sends nothing when a date passes, so the
  state is computed from the timestamp on read, and any scheduled work checks
  it at run time. The scheduler in §1.5c is what notices.

#### Add-on gating

09 lists add-ons on top of a plan. They are the same shape of question and get
the same treatment:

- **Each add-on is its own Stripe price and its own row**, not a boolean on the
  subscription — a workspace can hold several, and they start and stop
  independently of the plan.
- **The capability set is the union of plan and active add-ons**, computed in
  the one module. A screen never asks "do they have the extra-accounts add-on";
  it asks how many accounts they may connect.
- **Removing an add-on is `cancel_at_period_end`, like the plan**, so nothing a
  client paid for stops mid-month.
- **An add-on cannot grant what the phase has not built.** Buying extra posts
  per week before B7 must not imply publishing. The capability set is
  intersected with a build-time "what exists" set, so an entitlement can never
  outrun the product — the honest failure is "not available yet", not a
  schedule that silently never sends.

**A test that would fail without this**: a Pilot whose `pilot_expires_at` is in
the past still exports its rows and still reads every screen, and is refused
exactly one thing — the scheduling call — with the sentence that names the
expiry.

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

**Split into three in this revision**, because the draft's single bullet list
hid that these are different risks on different timelines: B5a is a storage and
upload problem, B5b is a hosting and money problem, and B5c is the thing that
makes a hand-delivered Pilot possible. **B5a and B5c are worth doing before
B5b is decided** — a job can be uploaded and reviewed while rendering is still
run by hand.

### B5a — Uploads go straight to Storage, and a jobs table

**Nothing may pass through a Vercel function body.** Serverless request bodies
are capped in the single-digit megabytes, and the input here is a podcast
recording. An upload route is therefore not an option at any size, not merely
inadvisable for large ones.

- **Resumable, direct-to-Storage uploads.** Supabase Storage's resumable
  endpoint (TUS), with the browser talking to Storage and the app issuing only
  a short-lived signed upload target. **Resumable rather than a single PUT**
  because the realistic client is uploading a 2GB file over domestic Wi-Fi,
  and a failure at 90% that restarts from zero is the end of their patience.
- **The app never proxies bytes.** It mints the target, records the row, and
  watches. No Vercel function ever holds the file.
- **Buckets**: `uploads` (client source video), `renders` (finished cuts),
  `posters` (stills) — all private, reached by short-lived signed URLs. Nothing
  public, ever, including posters.
- **A `jobs` table replaces the directories.** `lib/engine/jobs.ts` is the
  whole surface — `readJob`, `writeJob`, `listJobIds`, and the paths — so a
  table plus Storage behind those same functions leaves `/api/engine/*`
  unchanged. The seam was built for this.
- **Ownership is the workspace, enforced by RLS**, with the Storage path
  prefixed by workspace id and a policy that matches it. A signed URL is a
  bearer token; the path must not be guessable across tenants.
- **Done when:** a 2GB file uploads from a browser with the connection
  interrupted once and resumed, no request body exceeds the function limit, and
  a second workspace can neither read the object nor see the row.

### B5b — Where the work actually runs, and what it costs

**The open question, and the one with money attached.** Rendering takes minutes
and a Vercel function cannot hold it. Options, with the trade named rather than
hidden — this is the decision list at the end of this document, item 2.

| Option | Cost shape | Turnaround | The catch |
|---|---|---|---|
| **Fly.io machines** | per-second, scale to zero | fast start | ffmpeg on shared CPU is slow; needs a performance tier |
| **Railway / Render worker** | always-on monthly | fast | paying for idle between clients |
| **Modal / Replicate** | per-second GPU/CPU | fast, no ops | per-job cost highest; vendor-shaped code |
| **A single rented box** | flat monthly, cheapest per minute | fast | ours to patch, back up and monitor |

Whatever wins, the same things are required of it:

- **A queue, not a poll.** Jobs claimed atomically — `select … for update skip
  locked` over the `jobs` table is enough and needs no broker. Two workers must
  never claim one job.
- **Retries with a bound and a dead state.** Attempt count, last error, and a
  terminal `failed` the UI can explain. An infinite retry on a video that will
  never render is a bill that grows while nothing improves.
- **Per-workspace cost metering, recorded as it is spent.** Every LLM call and
  every compute minute writes a row against the workspace: tokens, model,
  seconds, and the job. **Not estimated at the end of the month** — metered at
  the time, because the cap in non-negotiable 11 is only enforceable against a
  running total. The agents screen already shows "spend this month $43 of $180
  in caps" from sample data; this is what makes that real.
- **A hard cap that refuses rather than degrades.** At the cap, new jobs are
  refused with a sentence. Quietly producing worse output to stay under budget
  is the kind of thing this product exists not to do.
- **Done when:** two workers race for one job and exactly one renders it; a
  deliberately broken input reaches `failed` with a readable reason after a
  bounded number of attempts; and a workspace's metered spend matches the
  provider's own figure for the same window to within rounding.

### B5c — The compliance verdict, and an ops console

**This is what makes a hand-delivered Pilot possible**, which is the first
thing that earns money. A Pilot is two weeks of work for one client; it does
not need self-serve publishing, it needs us to be able to see the queue, review
cuts and approve them.

- **The compliance gate becomes a column with a verdict and its reasons**,
  written by the Compliance agent before anything is schedulable.
  Non-negotiable 6 turns into a database constraint rather than a convention: a
  cut with no passing verdict cannot be referenced by a scheduled post. **A
  foreign key with a check, not application logic** — the convention is the
  thing that gets forgotten under deadline.
- **An internal ops console**, `/ops/*`, behind a role rather than a URL
  nobody has shared. A `profiles.is_staff` flag, an RLS policy that lets staff
  read across workspaces, and **an audit row for every staff read of a client's
  workspace**. Cross-tenant access with no log is the thing that turns one
  mistake into an unanswerable question later.
- **What the console does**: list jobs across workspaces with their state, see
  a cut with its compliance reasons, approve or reject with a note, and retry a
  failed job. Read-mostly, four actions.
- **It never edits client content.** Staff approve or reject; they do not
  rewrite a script or swap a clip. The line matters because the product's claim
  is that the agents made the video.
- **Done when:** a staff user reviews and approves a cut for a workspace they
  are not a member of, the approval is attributed to them, the audit row
  exists, and a non-staff user gets a 404 — not a 403, which confirms the route
  exists.

## 5.5 B6 — Metrics ingestion, read-only

**New in this revision**, and it is the phase that makes the Results Ledger
mean anything. `metric_snapshots` and `ledger_weekly` have been in the schema
since 13 November and have never held a row; every KPI on screen is either
sample data or "Not measured yet" (B2.1's null, §2).

**Read-only, and deliberately before posting.** Pulling insights needs none of
the publishing permissions, none of the App Review that §6 is blocked on for
TikTok and Meta, and it is useful on day one: a client who connects an account
we did not post to still gets their own numbers, which is the honest version of
"we report outcomes" while the pipeline is hand-run.

- **A scheduled pull per connected account**, on the §1.5c scheduler, writing
  `metric_snapshots` rows — one per account, per metric, per day. **Append-only
  and idempotent on `(account, metric, date)`**, so a re-run repairs rather
  than duplicates. Backfill is the same code with a date range.
- **`ledger_weekly` is a rollup, not an ingest.** Computed from snapshots in
  SQL, which is the one job `pg_cron` is better at than the app (§1.5c).
- **A gap is a gap.** If a pull fails or an account is disconnected, the day
  has **no row** — never a zero. 15 §5's honesty rule and B2.1's
  `number | null` are the same decision, and the Accounts tab already renders
  "We have no measurements for LinkedIn" rather than a row of zeroes.
- **Token refresh is the real work.** Every platform's access token expires on
  its own schedule; the refresh lives with the adapter and failures surface as
  "needs reconnecting" on the account, which Home's alerts already render.
- **Rate limits are per-app, not per-client**, so the scheduler staggers pulls
  and records the limit headers. One noisy workspace must not spend the app's
  budget for everybody.

### The exact read-only scopes, per platform

**Request nothing beyond these.** Every extra scope is a question in App Review
and a line in a privacy notice. **Confirm each against the current platform
docs at implementation time** — these names have all changed at least once, and
the list below is the intent rather than a guarantee of spelling.

| Platform | Scopes | What it buys |
|---|---|---|
| **Instagram** (Instagram API with Instagram Login) | `instagram_business_basic`, `instagram_business_manage_insights` | Account and media list; impressions, reach, saves, shares, profile visits. |
| **Instagram** (via Facebook Login for Business, if the account is Page-linked) | `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` | Same, through the linked Page. **Only if** the client's setup requires it. |
| **TikTok** (Display API) | `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list` | Follower count, profile fields, per-video views, likes, comments, shares. |
| **YouTube** (Data + Analytics) | `youtube.readonly`, `yt-analytics.readonly` | Channel and video list; views, watch time, subscribers gained, traffic sources. |

**Explicitly not requested:** `instagram_content_publish`,
`video.publish`/`video.upload`, `youtube.upload`, and
`yt-analytics-monetary.readonly`. The first three are B7's and are not asked
for a moment before they are used; the fourth is revenue data we have no reason
to see.

- **One `social_accounts` row per connection**, holding the platform, the
  external id, the granted scopes and the token state — **but no token until
  B7** (§6 and the draft's §2 item 3 both already said this, and B6 does not
  change it: a read-only token is still a token, so it is stored the same
  encrypted way B7 describes, or not at all).
- **Done when:** a connected account's yesterday appears in
  `metric_snapshots`, re-running the pull adds no second row, a disconnected
  account produces no row rather than a zero, and the Accounts tab shows the
  gap in the wording it already ships.

## 6. B7 — Posting, and this is still the gate

**No posting to Instagram, TikTok or YouTube is built until this phase**, and
the product already says so on `/pricing` and `/trust`. Renumbered as B7 in
this revision; the gate itself is unchanged, because none of it is ours to
accelerate.

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

### What B7 builds, once the approvals land

- **Postiz, as a separate unmodified service** (non-negotiables 3 and 10). It
  is AGPL, so it runs as its own deployment with its own credentials and we
  never patch it or link against it. The app talks to it over its API.
- **Encrypted token storage, and the key is not in the database.** Tokens go in
  `social_accounts` encrypted at rest with a key held in the environment —
  Postgres `pgcrypto` with the key passed per statement, or encryption in the
  app before the write. **Either way the database alone is not enough to
  decrypt**, because a database backup is the thing most likely to be copied.
  The service-role key already never reaches the browser (§1); this is the same
  argument one layer down.
- **Nothing decrypts outside a server action or a worker.** No token is ever
  returned by an API route, logged, or put in an error. The §1.5b scrubber lists
  these fields explicitly.
- **Refresh is a write, and a failure is visible.** An expired refresh token
  marks the account as needing reconnection and raises the alert Home already
  renders — the one case where the client has to act, so it must not be silent.
- **Revocation on disconnect, not just deletion.** Disconnecting an account
  calls the platform's revoke endpoint before dropping the row. A token we
  stopped storing but never revoked is still live.
- **Publishing is still gated per cut on the compliance verdict** (B5c), and
  the constraint is in the database rather than in the scheduler.
- **Done when:** a scheduled post reaches a real test account through Postiz;
  a cut without a passing verdict cannot be scheduled, proved by the
  constraint rather than by a UI check; a token is unreadable from a database
  dump without the environment key; and disconnecting revokes before deleting.

---

## 6.5 B8 — The content engine, which is not a content farm

**Vlad's scope, and the distinction in the title is the whole specification.**
The failed project this one replaces scaled by reposting other people's videos
across accounts nobody owned. B8 scales too, and must be structurally unable to
become that — so the boundary is written here, before any of it exists, rather
than discovered later by somebody optimising throughput.

### What it is

More output per client, from **their** material and from what is working in
their niche: many cuts from one upload, hook variants, per-platform formats,
A/B tests — posted **only to that client's own connected accounts**.

### The line, stated as a sentence we could show a platform

**We recreate what is working, not what someone made.**

- The **Niche Scan** identifies a viral *pattern*: hook, format, structure,
  pacing, topic, trend. A pattern is a shape, and a shape is not a work.
- **Format Remix** then produces an **original script and an original video in
  the client's voice** against that shape.

Non-negotiable 2 already says "remakes copy the format only: new script, new
footage, new voice". B8 is where that stops being a rule about one video and
becomes a rule about a factory.

### Never — and these become non-negotiables, not guidelines

- **Never reuse another creator's footage, audio, script or captions.**
- **Never a shot-for-shot remake.** Matching a pattern is allowed; matching a
  work frame by frame is the thing we were told not to do, wearing a new name.
- **Never reproduce a real person's face or voice.** Non-negotiable 5 already
  bars face-swaps and requires a stored consent record; volume does not soften
  it.

### Out of scope, logged as non-negotiable so it cannot be "optimised" in later

- **Multiple accounts per client.** One client, their own accounts.
- **Faceless mass channels.**
- **Detection evasion**, in any form.
- **Account rotation.**

Every one of those is a growth tactic that works, which is exactly why it is
named here. "We did not think of it" must not be available as an explanation.

### AI scene sources

Grok, Veo, Kling and Runway plug in **behind the pipeline adapter** as
swappable, labelled scene sources (D99) — labelled in the UI and on the
platform, because non-negotiable 4 has no volume exemption.

**Verify each one's commercial-use terms before adding it**, the way D11 and
D41 treat a licence. A generator whose terms forbid commercial output, or claim
rights in what it makes, is not admissible however good it looks. That check is
part of adding the adapter, not something to do afterwards.

### The gate

**Every output passes the Originality Gate** (spec 12) — no exception, and no
volume-based fast path. A gate that is skipped when the queue is long is not a
gate.

### Sequence

**After B5 and the first paid Pilots.** B5 is the pipeline this runs on, and
the Pilots are what tell us which formats are worth multiplying. Building the
factory before either exists would be scaling a guess.

- **Done when:** one upload produces many cuts with hook variants and
  per-platform formats, every one carrying an Originality Gate verdict; an A/B
  test runs inside a single client's own accounts; a cut whose scene source has
  no verified commercial-use record **cannot be produced**, proved by the
  adapter refusing rather than by a reviewer noticing; and an attempt to post a
  client's cut to an account their workspace does not own is refused **by the
  database**, not by the scheduler.

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

### B1.5 — the foundations, and the first one is a GitHub secret not an env var

**New in this revision.** These are the only new credentials B1.5 needs, and
the first two live in **GitHub repository secrets** rather than in Vercel,
because the migration job runs in Actions and not in the app.

| Key | Where | Note |
|---|---|---|
| `SUPABASE_PRODUCTION_PROJECT_REF` | GitHub secret | For `supabase db push` against production. Not a secret in truth, but it belongs beside the password. |
| `SUPABASE_PRODUCTION_DB_PASSWORD` | GitHub secret | The one that applies migrations to production. **Nothing else in the repo should ever hold it.** |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | Vercel (both envs) + GitHub secret | DSN is public by design; the auth token uploads source maps at build and is not. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Vercel (both envs) | Site key is public. Use Cloudflare's **always-passes test keys** for the e2e suite, not a flag that disables the check. |
| `CRON_SECRET` | Vercel (both envs) | Header checked by every scheduled route, so the URL alone cannot trigger an ingest. |

**A GitHub Environment with you as a required reviewer** is the gate in §1.5a.
That is a repository setting rather than a key, and it is the part that keeps
"merging is the only thing that deploys" (D85) true of the app while giving the
schema one deliberate extra click.

### B6 and B7 — the platform credentials, and one key that matters more than the rest

| Key | Phase | Note |
|---|---|---|
| Meta app id + secret | B6 read-only, B7 publish | Same app, different scopes; the read-only scopes in §5.5 need no App Review for publishing. |
| TikTok client key + secret | B6 read-only, B7 publish | Display API scopes for B6; the Content Posting API and its audit are B7's. |
| Google OAuth client id + secret | B6 read-only, B7 publish | `youtube.readonly` + `yt-analytics.readonly` for B6. |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | B7 | **The key that must not live in the database.** Tokens are encrypted with it before the write, so a database dump alone decrypts nothing. Rotating it means re-encrypting every row, so it is generated once and backed up somewhere that is not this repo and not Supabase. |
| Postiz credentials | B7 | Its own deployment, its own secrets. We never modify it (non-negotiables 3 and 10). |

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

**Every row names a check that fails without the work.** That is D91's first
lesson made structural: a test that passes before the fix guards nothing, and
"it looks right on screen" is how a silently-never-called server action
survived two days.

| Step | Done when |
|---|---|
| ~~B1 auth + RLS~~ | **Done.** A second workspace cannot read the first, proved against a real instance (49 RLS tests). Anonymous reads nothing. |
| ~~B1 deletion~~ | **Done.** After a workspace is deleted, a **service-role** read returns zero rows for it across every table; an owner cannot delete it out from under other members; the last owner can no longer sign in. |
| **B1.5a migrations** | A PR with a trivial migration shows it applied to preview automatically and to production **only after your approval**, and `supabase migration list` agrees across both. |
| **B1.5b errors** | A deliberate error in preview arrives with a readable stack and a release tag, and a seeded PII field is **absent** from the payload. |
| **B1.5c scheduler** | A job runs on time; a second simultaneous invocation changes nothing; an unauthenticated call is refused. |
| **B1.5d Turnstile** | Sign-up with no token is refused **server-side**, and `sign-up-ui.spec.ts` still passes using a test site key rather than a disabled check. |
| **B1.5e sharding** | Four shards finish under five minutes with the same pass count as a single run, twice in a row. |
| **B1.5f axe at 390px** | Axe runs at both viewports on the public pages and the studio shell at the D75 `moderate` threshold, and each skip reason names what actually covers what. |
| B2 studio | Goals, targets and calendar moves survive a reload and a different browser. **An unmeasured value reads "Not measured yet", never `0`.** Sample data still only on marketing. |
| B2 export | "Export my data" returns this workspace's rows and **none of a second workspace's**, run as the user rather than the service role. |
| **V — every item** | No `'use client'` module imports an agent adapter; a workspace at its monthly cap gets **no call made**, not a refund after; every run is in the agent log with its cost; and with no key every surface answers in labelled canned mode. |
| **V1 Niche Scan** | A niche with no seed row in `12 §2` still returns ranked recipes; every stored row carries a `source_note` and a URL; and **no media object is written to Storage** by a scan. Ranking is views-per-follower, so a small high-ratio account outranks a coasting large one. |
| **V2 script + hook** | A generated script shares the recipe's beat structure and **no sentence** with the source example; a script with no real business fact is rejected rather than shipped. |
| **V3 Originality Gate** | A deliberately-copied draft is **blocked**, the block is visible in the studio with its number and limit, the approve action is refused **server-side**, and a second failure is terminal rather than a loop. There is no override path. |
| **V4 inline assists** | No assist writes to the database without an explicit save; every suggested value carries the "AI-suggested" label; the buttons still work with no key. |
| **V5 video** | A 2GB upload survives an interrupted and resumed connection; **no request body crosses the function limit**; a second workspace can neither read the object nor see the row; a cut with an AI scene is labelled in the UI **and** in stored metadata. |
| **V6 ops console** | A rejected item never reaches the client's studio; an approval names the operator who made it; an item that failed V3 **cannot be approved at all**. |
| **V7 co-pilot triggers** | Asking the co-pilot to run a scan produces a **proposal, not a scan**, and nothing reaches the agent log until Approve is pressed. |
| B3 Stripe *(deferred — after V)* | A test card buys a Pilot and a Creator; a replayed webhook changes nothing; a live key is refused at startup. |
| **B3 entitlements** | A Pilot past `pilot_expires_at` still reads every screen and still exports, and is refused **exactly one** thing — scheduling — with a sentence naming the expiry. An add-on cannot grant a capability the build does not have. |
| B3 cancellation | Cancel from Settings sets `cancel_at_period_end`, the webhook writes it to our table, "Keep my plan" reverses it, and **the export still works after the period ends**. |
| B4 scan | A scan request lands in `leads` and emails the notification; **with no mail key the lead is still written** and the notification is logged. |
| **B5a uploads** | A 2GB file uploads from a browser with the connection interrupted and resumed; no request body exceeds the function limit; a second workspace can neither read the object nor see the row. |
| **B5b workers** | Two workers race for one job and exactly one renders it; a broken input reaches `failed` with a readable reason after a bounded number of attempts; metered spend matches the provider's figure to within rounding. |
| **B5c compliance + ops** | A staff user approves a cut in a workspace they are not a member of, it is attributed, the audit row exists, and a non-staff user gets a **404**. A cut with no passing verdict cannot be scheduled — **proved by the constraint, not the UI**. |
| **B6 metrics** | A connected account's yesterday appears in `metric_snapshots`; a re-run adds no second row; a disconnected account produces **no row rather than a zero**. |
| **B7 posting** | A scheduled post reaches a real test account through Postiz; a token is unreadable from a database dump without the environment key; disconnecting **revokes before deleting**. |
| **B8 content engine** | One upload yields many cuts, hook variants and per-platform formats, each with an Originality Gate verdict; a scene source with no verified commercial-use record **cannot produce a cut**, proved by the adapter refusing; and a cut aimed at an account the workspace does not own is refused **by the database**. |

Every step keeps the existing gates: `pnpm lint && pnpm typecheck && pnpm test
&& pnpm build && pnpm licence-check`, the e2e suite, and the axe gate — which
now fails on `moderate` too (D75). Lighthouse mobile ≥ 90 stays a gate on the
public pages; the studio is not held to it.

## 9. What this phase deliberately does not do

- **No deploying or promoting, and no real money.** Non-negotiable 11, and
  **stricter than the first draft**: production now exists and tracks `main`
  (D85), so a merge is a deploy. Merging is Vlad's, and nothing in this plan
  deploys or promotes. Stripe stays test mode throughout.
- **No posting until B7.** §6, unchanged — it is blocked on platform reviews,
  none of which are code.
- **No multi-workspace accounts**, even though entitlements now has a row for
  it. One workspace per account stays the rule until agencies are a phase.
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

---

## 10. Open decisions — yours, with a recommendation on each

Eight. Each has the options, what it costs to be wrong, and what I would do.
**Nothing below is being done until you answer**; where a recommendation is
safe to start with and cheap to reverse, I say so.

### D-a. Does the production migration job need your approval every time?

- **A. Gated on a GitHub Environment reviewer** — the job waits for you.
- **B. Automatic on merge** — schema and app always in step, no click.
- **C. Manual `workflow_dispatch`** — you run it when you choose.

**Cost of being wrong:** B applies a bad migration to production with no pause,
and a migration is the one deploy a revert does not undo. C means a merge can
deploy app code against an old schema, which is the bug we have today.

> **Recommend A.** It keeps D85's "merging is the only thing that deploys" true
> of the app while giving the schema one deliberate click. Once a few
> migrations have gone through cleanly, moving to B is a one-line change — but
> start with the pause, because the first migration that matters is the one most
> likely to be wrong.

### D-b. Where does the renderer run? (B5b)

- **A. Fly.io machines**, per-second, scale to zero.
- **B. An always-on worker** on Railway or Render.
- **C. Modal or Replicate**, per-second managed.
- **D. One rented box.**

**Cost of being wrong:** C is the most expensive per job and shapes the code
around a vendor; D is the cheapest per minute and the most operational work
(patching, backups, monitoring — all ours); B pays for idle, which at one
client is most of the month.

> **Recommend A for the Pilot, revisit at ~10 clients.** Scale-to-zero matches
> a business with one client and bursty work, and Fly's machines are plain
> containers, so moving to D later is a deployment change rather than a rewrite.
> **Do not pick C**: per-job cost is worst exactly when volume arrives, and it
> is the hardest to leave.

### D-c. Vercel Cron or `pg_cron`? (B1.5c)

- **A. Vercel Cron** for everything.
- **B. `pg_cron`** for everything.
- **C. Both** — Vercel for HTTP, `pg_cron` for SQL.

> **Recommend C, and it is already written that way in §1.5c.** The metrics
> pulls are HTTP calls with token refresh and belong next to the adapters;
> the ledger rollup is SQL over rows we already hold and should not need the
> app to be up. Splitting on that line is not indecision — it is two different
> jobs.

### D-d. Is there an ops console before the first Pilot, or do we run it by hand? (B5c)

- **A. Build `/ops/*` first** — four actions, a staff role, an audit row.
- **B. Run the first Pilot through SQL and the Supabase dashboard.**

**Cost of being wrong:** B is faster to the first paying client and leaves no
audit trail of staff reading client data, which is the thing that becomes an
unanswerable question later. A is maybe a week before any money arrives.

> **Recommend B for exactly one Pilot, then A.** With one client, a console is
> ceremony — but **the audit requirement does not wait**: even dashboard access
> should be from a named staff account rather than the project owner's key, so
> there is a record. Build A before the second client, not the tenth.

### D-e. Which Instagram path — Instagram Login or Facebook Login for Business? (B6)

- **A. Instagram API with Instagram Login** — `instagram_business_*` scopes, no
  Page required.
- **B. Facebook Login for Business** — via a linked Page.
- **C. Support both.**

**Cost of being wrong:** A fails for clients whose account is Page-linked in a
way that needs the Page path; B asks every client for a Facebook Page they may
not have, which is friction at the worst moment.

> **Recommend A, with B as a documented fallback** — build A, and when a client
> cannot connect, we have the scopes for B written down (§5.5) rather than
> discovered during a sales call. Not C up front: two OAuth paths is twice the
> review surface for a case we have not met yet.

### D-f. How much history does B6 backfill on first connect?

- **A. 14 days** — matches the "14-day baseline" the targets already cite.
- **B. 90 days.**
- **C. Everything the API allows.**

**Cost of being wrong:** C burns rate limit on first connect and can look like
we were measuring before they hired us; A means a baseline that is thin if
somebody connects mid-period.

> **Recommend A, 14 days.** It is the number already on screen — "Target 10 ·
> 14-day baseline" — and a plan whose code and copy disagree about the window
> is a bug in the honesty rules. Widen later if the Analyst needs more.

### D-g. Does the Pilot's expiry need a payment method on file?

- **A. No** — one-off payment, nothing to renew.
- **B. Yes**, so it can convert to Creator in one click.

**Cost of being wrong:** B is a card on file for a product the client has not
agreed to continue, which is the kind of thing `/legal` exists to avoid. A
means conversion is a second checkout.

> **Recommend A.** A second checkout is a sales conversation we want to have
> anyway, and "we kept your card" is a trust cost out of all proportion to the
> clicks it saves.

### D-h. Does `/ops/*` live in this app or its own?

- **A. Same app**, behind `profiles.is_staff` and an RLS policy.
- **B. A separate deployment** with the service role.

**Cost of being wrong:** B holds the service-role key in a second place and
duplicates auth; A puts cross-tenant read capability inside the app clients use,
so a policy mistake is a client-facing breach rather than an internal one.

> **Recommend A, with the staff policy as its own migration and its own RLS
> test** — the risk is real but it is a testable risk, and `rls.db.test.ts`
> already proves cross-workspace isolation against a live instance, so the same
> suite can prove that staff read is the *only* exception. B's second copy of
> the service-role key is a worse trade.

---

**One thing I did not add, and why.** The draft's §9 says "no analytics
vendor", and B1.5b adds error tracking, which is adjacent. They are not the
same: error tracking records our faults with PII scrubbed, and an analytics
vendor records visitors' behaviour and needs a consent flow. The cookie banner
currently tells the truth and this revision keeps it true.

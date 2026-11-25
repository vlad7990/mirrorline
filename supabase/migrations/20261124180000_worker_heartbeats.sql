-- The worker says it is alive, so that silence means something (D128).
--
-- ============================================================================
-- Why a table, when the queue is right next door
-- ============================================================================
--
-- D125 wrote the problem down and left it as debt: "a worker that crash-loops
-- looks exactly like a quiet afternoon with no scans queued. This is the first
-- thing I would want an alert on, and there is no alert."
--
-- The `jobs` table cannot close that, and it is worth being precise about why.
-- An empty queue is the healthy state most of the day. A job sitting in
-- `queued` does prove nothing is claiming — but it only appears when a client
-- presses the button, so the queue reports a dead worker **at the moment it
-- costs a client their scan**, which is the latest possible notice. Since D114
-- a merge of mine replaces the process that drains that queue; the window
-- between a bad merge and the next button press is exactly the window nothing
-- was watching.
--
-- So the worker writes a row. `last_seen_at` moving is the only fact that
-- separates "nothing to do" from "nobody home".
--
-- ============================================================================
-- Railway's healthcheck is not this, and does not replace it
-- ============================================================================
--
-- `services/worker/src/health-server.ts` serves the same verdict over HTTP, and
-- Railway's healthcheck is the natural consumer. But Railway runs that check
-- **only during deployment** — its documentation is explicit: "Railway does not
-- monitor the healthcheck endpoint after the deployment has gone live." That
-- makes it a deploy gate, which is genuinely the biggest hole (a worker that
-- cannot boot or cannot reach Supabase never replaces the working one), and it
-- is not a monitor. The table is the half that keeps answering afterwards.
--
-- ============================================================================
-- One row per worker, overwritten, rather than an append-only log
-- ============================================================================
--
-- The question is "is it alive now", and a log answers that by growing forever
-- and being read backwards. `id` is the worker's name — the Railway service
-- name by default — so a redeploy overwrites the row rather than adding one,
-- and `booted_at` moving is how a restart shows up. Nothing accumulates and
-- nothing needs pruning.
--
-- Two workers on one service would fight over a single row and hide each other.
-- That is a real limit and it is the right trade today: `services/worker/src/
-- index.ts` takes one job at a time on purpose, and the second worker is a
-- decision with a bill attached that has not been made. When it is, each
-- process sets `WORKER_ID` and this table holds a row each with no change here.
--
-- ============================================================================
-- What it deliberately does not hold
-- ============================================================================
--
-- No job id, no workspace id, no error text. `/api/health/worker` serves these
-- columns, and `apps/web/app/api/health/supabase/route.ts` set the rule for a
-- health surface: it carries "variable names, status codes and row counts".
-- A Supabase error message in a column a health endpoint prints is a leak with
-- a long half-life, and D127 applied the same rule to rejection logging —
-- counts and our own names, never content. `claim_failures` is a count for
-- exactly that reason: it is the useful half of an error we must not store.

create table if not exists public.worker_heartbeats (
  -- Not a uuid. This is a name a human types into an environment variable and
  -- then reads on a status page, and a generated key would make the row
  -- unfindable without a join to nothing.
  id text primary key,
  -- The kinds this process claims. A worker running with an empty list, or
  -- without the kind a queued job needs, is a queue that never drains for a
  -- reason no other column would show.
  kinds text[] not null default '{}',
  booted_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- The job in hand, or null when idle. Checked against the same set as
  -- `jobs.kind`, so a typo here cannot invent a kind the queue does not have.
  job_kind text check (job_kind in ('niche-scan', 'render-cuts')),
  job_started_at timestamptz,
  -- Since boot, counting refusals and failures: this is "did it do anything",
  -- not "did it succeed". `agent_runs` is where the money went.
  jobs_finished integer not null default 0,
  -- Consecutive failures of `claim_job`, reset by any success. The case a
  -- heartbeat alone misses: the process is up, the beat is fresh, and the claim
  -- is being refused because a grant or a name changed under it.
  claim_failures integer not null default 0,
  -- The commit this process is running, when the platform tells us. Not
  -- decoration: the P0 handoff had to record that a redeploy was "due, not
  -- that it happened", because nothing in this system could be asked.
  revision text
);

-- ============================================================================
-- Row-level security: nobody reads this from a browser
-- ============================================================================
--
-- Not the shape `jobs` has, and the difference is the point. A job belongs to a
-- workspace, so `is_member_of` can scope it and a member is owed the read —
-- "Scanning…" is their own row's status. A heartbeat belongs to **our
-- infrastructure**: it has no workspace_id, so there is nothing to scope it by,
-- and a client has no use for our deploy's commit sha.
--
-- So RLS is on with **no policy at all**, which denies everything, and the
-- grants are revoked as well rather than merely left ungranted. The service
-- role bypasses both, which is how the worker writes and how
-- `/api/health/worker` reads — and that route is server-side and 404s in
-- production for the same reason `health/supabase` does.
alter table public.worker_heartbeats enable row level security;

revoke all on public.worker_heartbeats from anon, authenticated;

comment on table public.worker_heartbeats is
  'One row per job worker, overwritten on a timer. The only fact that '
  'separates "no scans queued" from "nothing is draining the queue" (D125, '
  'D128). Infrastructure, not workspace data: RLS has no policy, so only the '
  'service role sees it.';

comment on column public.worker_heartbeats.last_seen_at is
  'Written by a timer rather than by the claim loop, so it keeps moving '
  'through the six minutes a scan takes. A beat older than 90s means the '
  'process is gone, wedged, or cannot reach this database.';

comment on column public.worker_heartbeats.claim_failures is
  'Consecutive claim_job failures. A count rather than the error text, because '
  'a health endpoint prints this column.';

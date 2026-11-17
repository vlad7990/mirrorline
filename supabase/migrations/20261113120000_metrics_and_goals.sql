-- 15 §7 "Data model additions", plus the two tables the app already writes to.
--
-- Nothing in this file runs automatically. `supabase/README.md` says how to
-- apply it, and CLAUDE.md is explicit that Supabase is wired only when keys
-- exist in .env.local — a preview deployment has no database and must not
-- depend on one.
--
-- ============================================================================
-- Two rules this schema enforces rather than documents
-- ============================================================================
--
-- 1. **A missing measurement is a missing row, never a zero.** 15 §8 forbids
--    showing a zero for something nobody measured. `metric_snapshots.value`
--    is therefore NOT NULL: there is no "we have a row but no number" state
--    to be misread as a reading of zero. The UI's `not-connected` branch is
--    the absence of rows, and an absence is unambiguous.
--
-- 2. **A target records where it came from.** `key_results.basis` is NOT NULL.
--    15 §1 calls targets proposals rather than promises, and a number with no
--    stated origin reads as a commitment whatever the label above it says.
--
-- Row-level security is on for every table, with no policy attached. That is
-- deliberate and it is the safe default: with RLS enabled and no policy, the
-- anon and authenticated roles can read nothing. The service-role key used by
-- the server bypasses RLS. Policies land with authentication, and until then
-- the tables cannot leak to a browser by being forgotten.

-- ============================================================================
-- Workspaces and connected accounts
-- ============================================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Free text, asked once in onboarding so Trend Scout knows what to research
  -- (16 §1). Deliberately not an enum and deliberately not a foreign key to a
  -- list of industries: there is no such list and there will not be one.
  niche text,
  plan_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'linkedin')),
  handle text,
  status text not null
    check (status in ('connected', 'reconnect-needed', 'not-connected'))
    default 'not-connected',
  -- The honest platform limit, e.g. TikTok posts staying private until our
  -- app is audited. Shown on the account card, not hidden in a help article.
  note text,
  connected_on date,
  created_at timestamptz not null default now(),
  unique (workspace_id, platform, handle)
);

-- ============================================================================
-- The goal cascade (15 §1, §7)
-- ============================================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- The seven of 15 §2. The goal decides the KPI set; the industry never does.
  goal_type text not null check (
    goal_type in ('leads', 'bookings', 'sales', 'audience', 'awareness', 'community', 'launch')
  ),
  is_primary boolean not null default true,
  -- The outcome in the user's own words, from onboarding.
  outcome_text text not null,
  period text not null default 'quarter',
  created_at timestamptz not null default now()
);

-- One primary goal per workspace. 15 §2 allows a second goal, not a second
-- headline: two primaries would mean two headline KPIs and no answer to
-- "how are we doing".
create unique index if not exists goals_one_primary_per_workspace
  on public.goals (workspace_id)
  where is_primary;

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  text text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives (id) on delete cascade,
  kpi_key text not null,
  baseline numeric not null,
  target numeric not null,
  -- See rule 2 at the top of this file.
  basis text not null,
  due date,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- KPI definitions (15 §3, §7)
-- ============================================================================

create table if not exists public.kpi_definitions (
  key text primary key,
  name text not null,
  unit text not null check (unit in ('count', 'percent', 'currency', 'ratio', 'days', 'seconds')),
  -- Plain words, not algebra. It appears in a tooltip a user reads.
  formula text not null,
  source text not null,
  tier text not null check (
    tier in ('production', 'content-health', 'growth', 'outcome', 'return', 'quality', 'agent-ops')
  ),
  is_custom boolean not null default false,
  -- Null for the shared definitions, set for a workspace's own (15 §4).
  workspace_id uuid references public.workspaces (id) on delete cascade,
  -- How a custom KPI's figures arrive. Null for the ones we measure, because
  -- "manual" would be a claim about who took the reading.
  entry text check (entry in ('manual', 'csv')),
  created_at timestamptz not null default now(),
  -- A shared definition cannot be custom, and a custom one must belong to a
  -- workspace. Without this, a stray row becomes a KPI every account sees.
  constraint kpi_definitions_custom_has_workspace check (
    (is_custom and workspace_id is not null) or (not is_custom and workspace_id is null)
  )
);

-- ============================================================================
-- Measurements (15 §4, §7)
-- ============================================================================

create table if not exists public.metric_snapshots (
  id bigint generated always as identity primary key,
  social_account_id uuid not null references public.social_accounts (id) on delete cascade,
  -- Null when the measurement is the account's rather than one post's.
  post_id uuid,
  kpi_key text not null references public.kpi_definitions (key) on delete restrict,
  -- See rule 1 at the top of this file.
  value numeric not null,
  captured_at timestamptz not null,
  unique (social_account_id, post_id, kpi_key, captured_at)
);

create index if not exists metric_snapshots_lookup
  on public.metric_snapshots (social_account_id, kpi_key, captured_at desc);

create table if not exists public.ledger_weekly (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- The Monday the week starts on.
  week date not null,
  posts integer not null default 0,
  views integer not null default 0,
  sends integer not null default 0,
  saves integer not null default 0,
  follows integer not null default 0,
  leads integer not null default 0,
  bookings integer not null default 0,
  -- Nullable, unlike the counts above: an account that sells nothing through
  -- a tracked link has no revenue figure, and a zero would be a measurement.
  -- The ledger names the column it cannot fill rather than filling it.
  sales_usd numeric,
  unique (workspace_id, week)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kpi_key text not null references public.kpi_definitions (key) on delete cascade,
  status text not null check (status in ('open', 'acknowledged', 'resolved')) default 'open',
  message text not null,
  -- Two kinds, with opposite timing rules. See the module comment in
  -- apps/web/lib/studio/insights.ts; the short version is that a KPI behind
  -- its target waits two periods because one bad week is weather, and a
  -- stopped connection waits for nothing because posting has already stopped.
  kind text not null check (kind in ('trend', 'connection')),
  -- Null for a connection alert: no number of weeks is involved, and a zero
  -- or a one sitting here is something to gate on by mistake.
  weeks_off_track smallint,
  -- The day the connection broke. Null for a trend alert.
  broken_since date,
  created_at timestamptz not null default now(),
  -- 15 §5 raises a *trend* alert after two periods off track, not one. Held
  -- here as well as in the app, so a metrics job writing straight to the table
  -- cannot raise one on a single bad week — and cannot make a disconnection
  -- wait two weeks, which is the bug this constraint replaced.
  constraint alerts_timing_matches_kind check (
    (kind = 'trend' and weeks_off_track >= 2 and broken_since is null)
    or (kind = 'connection' and weeks_off_track is null and broken_since is not null)
  )
);

-- ============================================================================
-- Leads (14 §3) — already written by apps/web/lib/leads/scan-store.ts
-- ============================================================================

create table if not exists public.leads (
  -- A readable, sortable id made by the app, not a bare UUID: it gets quoted
  -- in an email to a client.
  id text primary key,
  email text not null,
  -- Free text, for the same reason as workspaces.niche.
  niche text not null,
  audience text not null check (audience in ('business', 'individual')),
  stage text not null check (stage in ('new', 'existing')),
  goal text not null check (
    goal in ('leads', 'bookings', 'sales', 'audience', 'awareness', 'community', 'launch')
  ),
  handles text[] not null default '{}',
  received_at timestamptz not null
);

-- ============================================================================
-- Niche Scan results (12 §Niche Scan, 15 §6)
-- ============================================================================

create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  format text not null,
  from_niche text not null,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'linkedin')),
  growth_percent numeric,
  fit smallint check (fit between 0 and 100),
  -- The benchmark that makes formats comparable across accounts of different
  -- sizes. A format averaging 50,000 views on a 500,000-follower account is
  -- not working, and a raw view count cannot say so.
  views_per_follower numeric,
  -- The anonymised beat list. A recipe, never a copy: non-negotiables 1 and 2
  -- mean we hold the shape of a format and never its footage, audio or URL.
  beats jsonb not null default '[]'::jsonb,
  why_it_works text,
  -- Where the Scan looked. 12 §sources lists what is allowed; recording it
  -- per row is what makes a later audit possible rather than a memory test.
  source_note text,
  scanned_at timestamptz not null default now()
);

create index if not exists trends_workspace_scan on public.trends (workspace_id, scanned_at desc);

-- ============================================================================
-- Row-level security: on everywhere, policies with authentication
-- ============================================================================

alter table public.workspaces enable row level security;
alter table public.social_accounts enable row level security;
alter table public.goals enable row level security;
alter table public.objectives enable row level security;
alter table public.key_results enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.metric_snapshots enable row level security;
alter table public.ledger_weekly enable row level security;
alter table public.alerts enable row level security;
alter table public.leads enable row level security;
alter table public.trends enable row level security;

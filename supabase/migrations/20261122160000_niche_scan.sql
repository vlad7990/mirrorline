-- V1 — the Niche Scan agent's data (BACKEND_PHASE.md §2.5, D113).
--
-- Three things: the fields `12 §1` asks a scan to record and `trends` does not
-- have, a report to hang them off, and a log that doubles as the spend ledger.
--
-- ============================================================================
-- The url, and why the old comment was wrong (D115)
-- ============================================================================
--
-- `20261113120000_metrics_and_goals.sql` created `trends` with no url, and said
-- why: *"A recipe, never a copy: non-negotiables 1 and 2 mean we hold the shape
-- of a format and never its footage, audio or URL."*
--
-- **That over-reads the non-negotiable.** Non-negotiable 1 forbids downloading,
-- storing or reusing other creators' *videos or audio*. A URL is neither.
-- `12 §1` is explicit the other way — what a scan records is *"stored in
-- `trends`, links only, no media"* — and it lists `url` first. `04` agrees.
--
-- The distinction is the whole legal position of this project: **we keep the
-- pointer and the description, never the work.** Dropping the url did not make
-- us safer, it made us unauditable — `source_note` names a source nobody can
-- check, which is the shape of a compliance record that cannot be verified.
-- Vlad confirmed keeping the url on 22 November 2026.
--
-- So the comment is corrected below rather than left to mislead the next
-- reader, and the column arrives.
--
-- ============================================================================
-- Nothing here can hold media, and that is structural
-- ============================================================================
--
-- There is no column for a file, a blob, a storage path or a thumbnail on any
-- of these three tables, on purpose. A scan that wanted to keep a video would
-- have nowhere to put it without a migration and the decision that migration
-- would need. `niche-scan.db.test.ts` asserts no column of these tables is
-- named for media, which is the test that fails the day somebody adds one.

-- ============================================================================
-- niche_reports — one row per scan
-- ============================================================================
--
-- The report is the thing a client reads and downloads; the `trends` rows are
-- its evidence. Separate tables because a scan can find thirty examples and
-- still be one report, and because a failed scan must leave a row saying so —
-- a research run that vanishes on failure is one nobody can debug.
create table if not exists public.niche_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- What was scanned. Free text because the product is industry-agnostic:
  -- CLAUDE.md is explicit that we do not build industry pages, and a niche
  -- enum would be the same mistake in the database.
  niche text not null,
  -- `running` is a real state, not a transient one: a scan takes minutes, and
  -- the studio shows it in progress rather than an empty screen.
  status text not null default 'running' check (status in ('running', 'complete', 'failed')),
  -- The five findings the report is for (§2.5): top formats, hooks, topics,
  -- lengths, posting patterns. jsonb rather than five tables because none of
  -- them is queried across workspaces — they are read as a document.
  top_formats jsonb not null default '[]'::jsonb,
  top_hooks jsonb not null default '[]'::jsonb,
  topics jsonb not null default '[]'::jsonb,
  lengths jsonb not null default '[]'::jsonb,
  posting_patterns jsonb not null default '[]'::jsonb,
  -- Which sources this run actually used, for the audit `12 §1` requires at
  -- the row level and this records at the run level.
  sources_used jsonb not null default '[]'::jsonb,
  model text,
  -- Why a failed scan failed, in words. Never a stack trace and never a prompt.
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists niche_reports_workspace_created
  on public.niche_reports (workspace_id, created_at desc);

-- ============================================================================
-- agent_runs — the log, and the ledger that was a Map
-- ============================================================================
--
-- `04 §Shared rules` requires every agent action to be logged with time,
-- input, output, cost and reason. `18 §6` requires a cap per workspace,
-- enforced before the call and recorded after it.
--
-- **`lib/copilot/spend.ts` already does the arithmetic and says where it
-- falls down**, in its own words: the ledger lives "in this process, in a
-- `Map`", which "is not a cap across instances — on Vercel each function
-- instance would keep its own ledger, so N instances could each spend up to
-- the cap". It called the real fix "a row in Supabase". This is that row.
--
-- One table for both jobs rather than two, because the month's spend *is* the
-- sum of the log. A separate totals row would be a number that can disagree
-- with its own evidence.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Which of the seven (04) did this, or the co-pilot. Text rather than an enum
  -- so adding the eighth line does not need a migration.
  agent text not null,
  model text not null,
  -- `refused` is the state that matters most here: a call the cap stopped
  -- before it was made. It costs nothing and must still be visible, or a cap
  -- that is working looks identical to a feature nobody used.
  status text not null check (status in ('ok', 'failed', 'refused')),
  -- The four numbers 18 §6 names. The first two are the bill; the other two
  -- are the diagnosis — cache reads at zero across repeated calls means the
  -- cached prefix is being rebuilt and the bill is several times what it
  -- should be, a failure with no error attached to it.
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  cache_creation_tokens bigint not null default 0,
  -- Billed separately from tokens by the API, so it cannot be folded into
  -- them. A scan is the one agent that runs searches, and the count is how
  -- the projection stays honest.
  web_searches integer not null default 0,
  usd numeric(10, 6) not null default 0,
  -- Why, in words, for a person reading the log. **Never the prompt and never
  -- the question** — 18 §3.3 is that questions are not logged with
  -- identifiers, and spend.ts stores "a workspace id and four integers" for
  -- the same reason. "cap reached" belongs here; the client's text does not.
  reason text,
  created_at timestamptz not null default now()
);

-- The index the cap reads: this workspace, this month, newest first.
create index if not exists agent_runs_workspace_created
  on public.agent_runs (workspace_id, created_at desc);

-- ============================================================================
-- trends gains what 12 §1 asks for
-- ============================================================================
--
-- `if not exists` on each, so this is safe to re-run and reads as a list of
-- what was missing rather than one statement nobody can diff.
alter table public.trends add column if not exists url text;
alter table public.trends add column if not exists posted_at date;
alter table public.trends add column if not exists views bigint;
alter table public.trends add column if not exists hook_type text;
alter table public.trends add column if not exists length_seconds integer;
alter table public.trends add column if not exists cta_type text;
alter table public.trends add column if not exists growth_velocity numeric;
alter table public.trends add column if not exists report_id uuid
  references public.niche_reports (id) on delete cascade;

-- Account size as a bucket, never an exact follower count. `12 §1` asks for a
-- bucket, and the reason is in the ranking rule: "best" is views per follower,
-- so the exact count is a number we would store and never use — and storing
-- precise figures about other people's accounts is a habit worth not having.
alter table public.trends add column if not exists account_size_bucket text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trends_account_size_bucket_check'
  ) then
    alter table public.trends
      add constraint trends_account_size_bucket_check
      check (account_size_bucket is null or account_size_bucket in
        ('under_1k', '1k_10k', '10k_100k', '100k_1m', 'over_1m'));
  end if;
end $$;

-- A link, or nothing. Not a validator for the whole web — it is the cheap
-- structural check that stops a filename or a storage path being stored in the
-- column that is supposed to hold a pointer to somebody else's public post.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trends_url_is_a_link_check'
  ) then
    alter table public.trends
      add constraint trends_url_is_a_link_check
      check (url is null or url ~ '^https?://');
  end if;
end $$;

comment on column public.trends.url is
  'The public post this recipe was read from. A pointer, never the work: D115 '
  'corrected the original claim that non-negotiable 1 forbade this. 12 §1 is '
  '"links only, no media", and without the link source_note is unverifiable.';

comment on column public.trends.beats is
  'The anonymised beat list. A recipe, never a copy: non-negotiables 1 and 2 '
  'mean we hold the shape of a format and never its footage or audio. The url '
  'column holds the pointer (D115).';

-- ============================================================================
-- Row-level security: read your own workspace, write nothing from a browser
-- ============================================================================
--
-- The same shape `trends` already has, and for the same reason: these rows are
-- written by a job holding the service-role key. A client-side insert into
-- `agent_runs` would be a cost a user typed, and one into `niche_reports`
-- would be research nobody did. D96 revoked writes on every pipeline-written
-- table; these two join that list on the day they are created rather than in a
-- later migration that fixes them.
alter table public.niche_reports enable row level security;
alter table public.agent_runs enable row level security;

drop policy if exists niche_reports_select_members on public.niche_reports;

create policy niche_reports_select_members
on public.niche_reports
for select
to authenticated
using (public.is_member_of(workspace_id));

-- Members read their own spend because 18 §6 puts it on the Agents screen
-- beside the seven agents — "spend this month $43 of $180 in caps". A cap the
-- person paying cannot see is a cap they have to trust.
drop policy if exists agent_runs_select_members on public.agent_runs;

create policy agent_runs_select_members
on public.agent_runs
for select
to authenticated
using (public.is_member_of(workspace_id));

grant select on public.niche_reports to authenticated;
grant select on public.agent_runs to authenticated;

revoke insert, update, delete on public.niche_reports from authenticated, anon;
revoke insert, update, delete on public.agent_runs from authenticated, anon;

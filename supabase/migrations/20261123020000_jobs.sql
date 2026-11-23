-- The job queue, so a scan can be a button rather than a six-minute wait.
--
-- ============================================================================
-- Why this exists at all: the scan does not fit in a request
-- ============================================================================
--
-- The first live Niche Scan took six minutes, and a second took four (D118).
-- A Vercel function's default ceiling is 300 seconds, so the scan as built
-- works on a laptop and **cannot work in preview or production**: driven
-- through the real UI it ended in a client-side exception after 237 seconds of
-- waiting. Turning the research down until it fit would have bought the number
-- by researching less, which is a worse product wearing a smaller figure.
--
-- So the work moves off the request. The action writes a row here and returns;
-- a worker claims it and does the minutes.
--
-- ============================================================================
-- One table for both jobs, because the second one is the harder constraint
-- ============================================================================
--
-- `kind` covers the scan now and the B5 render next. That is deliberate rather
-- than speculative: B5 is Python and ffmpeg, which **cannot** run as a
-- function at all — a Vercel function is capped at 250 MB uncompressed and the
-- transcoding stack is larger than that before any model weights. Whatever
-- runs the scan has to be a process we own, and a process we own may as well
-- be given both jobs. A scan-shaped queue would need replacing the week B5
-- lands.
--
-- `render-cuts` is listed in the check constraint and has **no handler yet**.
-- Naming it costs one word and means B5 arrives without a migration; leaving
-- it out would have meant editing this file again for a value we already know.
-- Nothing enqueues it, and the worker refuses an unknown kind loudly.
--
-- ============================================================================
-- Nothing here holds media either
-- ============================================================================
--
-- `payload` and `result` are jsonb for arguments and findings. There is no
-- column for a file, a blob, a storage path or a thumbnail, exactly as
-- `20261122160000_niche_scan.sql` has none — so a renderer that wanted to keep
-- somebody else's footage has nowhere to put it without a migration and the
-- decision that migration would need (non-negotiable 1). When B5 needs to hold
-- *our own* rendered output, that is a storage bucket and its own review, not
-- a column quietly added here.

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Text with a check rather than an enum: adding the eighth agent's job
  -- should not need a type alteration, which is the call `agent_runs.agent`
  -- made next door.
  kind text not null check (kind in ('niche-scan', 'render-cuts')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  -- What the job produced, for a reader of the log. The *report* lives in
  -- `niche_reports`; this is the receipt, so a job row is debuggable without
  -- joining to whatever table its kind happens to write.
  result jsonb,
  -- Why it failed, in words. Never a stack trace and never a prompt — the same
  -- rule `niche_reports.error` and `agent_runs.reason` carry.
  error text,
  attempts integer not null default 0,
  -- ==========================================================================
  -- `max_attempts` bounds crash recovery. It is **not** a retry policy.
  -- ==========================================================================
  --
  -- A failed scan is marked `failed` and stops there. Deciding what is worth
  -- retrying — a dropped connection, yes; a rate limit hammered immediately,
  -- no; a spend refusal whose answer will not change, never — is a decision
  -- with a bill attached, and it has not been made. The client presses the
  -- button again, which is a retry chosen by somebody who can see the error.
  --
  -- What *is* automatic is reclaiming a job whose worker died (see
  -- `lease_until`). This is the bound on that loop: without it, a job that
  -- reliably kills whatever claims it would be reclaimed forever.
  max_attempts integer not null default 3,
  -- ==========================================================================
  -- The lease, which is what makes a crash recoverable
  -- ==========================================================================
  --
  -- A claimed job is `running` with a lease in the future. If the worker dies
  -- mid-scan — deploy, OOM, machine replaced — nothing sets it back, and
  -- without a lease the row would sit in `running` forever while the studio
  -- showed "Scanning…" until somebody looked in the database. The expiry is
  -- what lets the next claim pick it up, so a lost worker costs one lease
  -- rather than one stuck job.
  --
  -- The default is fifteen minutes: comfortably longer than the slowest run
  -- observed (six), so a slow scan is never mistaken for a dead worker — which
  -- would run it twice and bill twice.
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- The index the claim reads: the oldest claimable job, whatever its kind.
-- Partial, because `complete` and `failed` rows accumulate forever and the
-- claim never looks at them.
create index if not exists jobs_claimable
  on public.jobs (created_at)
  where status in ('queued', 'running');

-- The index the studio reads: this workspace's jobs, newest first.
create index if not exists jobs_workspace_created
  on public.jobs (workspace_id, created_at desc);

-- ============================================================================
-- claim_job — one worker, one job, no double billing
-- ============================================================================
--
-- `for update skip locked` is the whole reason this is a function rather than
-- two REST calls. A select-then-update from the worker has a window between
-- the two in which a second worker reads the same row, and for this queue that
-- window costs money: two workers running one scan means two Sonnet calls with
-- 28 web searches each, billed twice, writing two reports for one button
-- press. `skip locked` closes it in the database, where it cannot be raced.
--
-- It also reclaims expired leases in the same statement and by the same rule,
-- so recovery needs no sweeper process to be running and correct.
--
-- **Not `security definer`.** The only caller holds the service role and
-- already has full rights on the table, so a definer function would add a
-- privilege-escalation surface and buy nothing. That is the same test
-- `20261119070000_definer_functions_are_authenticated_only.sql` applies from
-- the other direction: a definer function is for a user doing something their
-- own grants forbid, and no user may call this at all.
create or replace function public.claim_job(
  job_kinds text[],
  lease_seconds integer default 900
)
returns public.jobs
language sql
volatile
as $$
  update public.jobs
  set
    status = 'running',
    attempts = attempts + 1,
    started_at = coalesce(started_at, now()),
    lease_until = now() + make_interval(secs => lease_seconds)
  where id = (
    select id
    from public.jobs
    where kind = any (job_kinds)
      and (
        status = 'queued'
        -- A lease that ran out: the worker holding it is gone.
        or (status = 'running' and lease_until < now())
      )
      and attempts < max_attempts
    order by created_at
    for update skip locked
    limit 1
  )
  returning *;
$$;

-- ============================================================================
-- Row-level security: read your own, write nothing from a browser
-- ============================================================================
--
-- The same shape `niche_reports` and `agent_runs` have, for a sharper reason.
-- A job is a unit of **spend**: an insert a client could make is a bill a
-- client could type, and `max_attempts` is a multiplier on it. So the browser
-- reads and the service role writes.
--
-- Members do need the read. "Scanning… usually ~5 min" is this row's `status`,
-- and a progress state the client cannot see is a button with no feedback —
-- which is the bug this whole migration exists to fix.
alter table public.jobs enable row level security;

drop policy if exists jobs_select_members on public.jobs;

create policy jobs_select_members
on public.jobs
for select
to authenticated
using (public.is_member_of(workspace_id));

grant select on public.jobs to authenticated;
revoke insert, update, delete on public.jobs from authenticated, anon;

-- The claim is the worker's alone. `authenticated` and `public` are named in
-- the revoke rather than merely left ungranted, because `public` is the default
-- grantee for a new function — an ungranted function is in practice a granted
-- one.
revoke all on function public.claim_job(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_job(text[], integer) to service_role;

comment on table public.jobs is
  'Work that does not fit in a request. The Niche Scan takes four to six '
  'minutes against a 300s function ceiling (D118), and the B5 render cannot be '
  'a function at any duration. Written by the service role, read by members.';

comment on column public.jobs.lease_until is
  'When this claim expires. A worker that dies mid-job leaves the row running; '
  'the expiry is what lets the next claim reclaim it, so no sweeper has to be '
  'running and correct for the queue to recover.';

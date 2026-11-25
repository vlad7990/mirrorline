-- The video pipeline's schema: footage in, shorts out (V5, slice 1).
--
-- ============================================================================
-- Three tables and two buckets, because a render has three different lifetimes
-- ============================================================================
--
-- The client's **footage** outlives every cut made from it: a re-cut must not
-- need a second upload, and the file is theirs rather than ours. A
-- **transcript** outlives the cuts too, and for a sharper reason —
-- transcribing an hour of audio is the most expensive minute in the job, so a
-- second cut of the same source must never pay for it twice. A **render** is
-- the shortest-lived of the three and the only one we made.
--
-- One table for all of it would make "delete this cut" and "delete this
-- upload" the same statement, which they are not.
--
-- ============================================================================
-- Designed for an hour of source, not for the first demo
-- ============================================================================
--
-- Slice 1 produces one short. The shape is for what was asked for: a 60-minute
-- podcast yielding several. So **`renders` is a child of the asset, not a
-- column on it**, `cut_index` orders the shorts within one job, and
-- `renders_job_cut` makes "the four shorts from Tuesday's upload" a query
-- rather than a guess. Nothing has to change when the second short arrives.
--
-- `transcripts.asset_id` is **unique**: one transcript per upload, upserted, so
-- the expensive leg is idempotent across re-cuts and across a job whose lease
-- was reclaimed.
--
-- ============================================================================
-- Nothing in here is written by a browser
-- ============================================================================
--
-- `jobs` revoked insert from `authenticated` because a job is a unit of spend
-- (D119). A render is the same thing with a bigger multiplier — CPU minutes,
-- egress and storage — so all three tables read the same way: members
-- `select`, the service role writes, and there is **no insert, update or
-- delete policy at all**. An absent policy denies, and that is deliberate.
--
-- One decision changed while building it. The plan had members inserting their
-- own `video_assets` row, since they are the uploader. They do not: the server
-- action creates the row *and* mints the signed upload token in one place,
-- which means the buckets need no member policy either — a browser holds a
-- token for one object path and nothing else. Fewer grants, one gate, and
-- `rights_holder` cannot arrive null because no path exists that skips it
-- (non-negotiable 1).
--
-- ============================================================================
-- Both buckets are private, and the reason is non-negotiable 1
-- ============================================================================
--
-- `client-footage` holds somebody's unedited podcast. `renders` holds work that
-- has not passed the Compliance gate yet. A public bucket is a URL that leaks
-- both, forever, with no way to withdraw it. Reads are signed URLs minted
-- server-side, which is why neither bucket has a `storage.objects` policy: the
-- service role bypasses row-level security and no other role may reach the
-- object at all.

-- ============================================================================
-- The buckets
-- ============================================================================
--
-- 5 GiB on `client-footage`: an hour of 1080p from a phone or an OBS recording
-- lands between 1 and 4 GB, and the limit has to clear the real thing rather
-- than the demo. **It is capped by the project's global file-size limit, which
-- is a dashboard setting and not SQL** — the default ceiling is 50 MB, which
-- would refuse every real upload. See docs/PROGRESS.md "Needs Vlad".
--
-- 512 MiB on `renders`: a 45-second 1080x1920 H.264 short is 10-20 MB, so this
-- is three orders of magnitude of headroom and still a bound.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'client-footage',
    'client-footage',
    false,
    5368709120,
    array['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/mpeg']
  ),
  (
    'renders',
    'renders',
    false,
    536870912,
    array['video/mp4', 'image/jpeg', 'text/plain']
  )
on conflict (id) do nothing;

-- ============================================================================
-- video_assets — one client upload
-- ============================================================================

create table if not exists public.video_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  -- `<workspace_id>/<asset_id>/source.<ext>` in `client-footage`. Unique
  -- because the path is derived from this row's own id: two rows claiming one
  -- object would mean one of them describes a file that was overwritten.
  storage_path text not null unique,
  original_name text not null,
  bytes bigint check (bytes is null or bytes > 0),
  mime text not null,
  -- ==========================================================================
  -- Null until ffprobe answers, which is the worker's first act
  -- ==========================================================================
  --
  -- Not defaulted to zero. A duration of 0 is a real answer about a broken
  -- file; null is "nobody has looked yet", and a caption written against a
  -- guessed duration lands in the wrong place for the whole video.
  duration_s numeric check (duration_s is null or duration_s > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  has_audio boolean,
  -- ==========================================================================
  -- The rights record, and it is `not null` on purpose
  -- ==========================================================================
  --
  -- Non-negotiable 1: only client-owned material. `/api/engine/jobs` already
  -- refuses a run without a named holder and an explicit confirmation; this is
  -- the same rule one layer down, where a second caller cannot skip it. The
  -- engine's compliance gate blocks every cut made with no rights record, so an
  -- asset without one could only ever produce blocked shorts — better to refuse
  -- the upload than to bill for the render.
  rights_holder text not null check (btrim(rights_holder) <> ''),
  rights_confirmed_at timestamptz not null default now(),
  -- `uploading` until the client's resumable upload finishes and the action
  -- says so. A row that stays `uploading` is an abandoned upload, which is a
  -- thing to sweep rather than a thing to render.
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'rejected')),
  -- Why it was rejected, in words. Never a stack trace — the rule
  -- `niche_reports.error`, `jobs.error` and `agent_runs.reason` all carry.
  error text,
  created_at timestamptz not null default now()
);

create index if not exists video_assets_workspace_created
  on public.video_assets (workspace_id, created_at desc);

-- ============================================================================
-- transcripts — the words, kept so a re-cut is free
-- ============================================================================

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  -- One per asset. The upsert target, which is what makes the expensive leg
  -- idempotent when a lease expires mid-job and the work is claimed again.
  asset_id uuid not null unique references public.video_assets (id) on delete cascade,
  -- Denormalised from the asset so the read policy is a column check rather
  -- than a join — the same call `drafts.workspace_id` made next door.
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Which adapter answered: `faster-whisper`, `whisperx`, `script-sidecar`.
  -- `summary.json` already carries this rule and the reason is unchanged — a
  -- run backed by a sidecar must never read like a run backed by a model.
  engine text not null,
  model text,
  language text,
  -- `[{ "text": "so", "start": 0.42, "end": 0.55 }, ...]`, seconds from the
  -- start of the source. An hour of speech is roughly 9,000 words and under a
  -- megabyte of jsonb, which is why this is a column and not a storage object.
  words jsonb not null default '[]'::jsonb,
  -- Stored rather than computed, so "did this transcribe to anything" is a
  -- cheap question and not a jsonb length on every read.
  word_count integer not null default 0 check (word_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists transcripts_workspace
  on public.transcripts (workspace_id, created_at desc);

-- ============================================================================
-- renders — one finished 9:16 short
-- ============================================================================

create table if not exists public.renders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- The job that made it, so a batch of shorts from one upload is a query.
  -- `on delete set null`: a short outlives the receipt for the work that made
  -- it.
  job_id uuid references public.jobs (id) on delete set null,
  asset_id uuid not null references public.video_assets (id) on delete cascade,
  -- The approved script this cut follows, when there is one. Nullable because
  -- a later slice cuts by the heuristic moment-finder with no script at all,
  -- and that render is not a lesser row.
  draft_id uuid references public.drafts (id) on delete set null,
  -- Which short this is within its job. A 60-minute source yields several.
  cut_index integer not null default 0 check (cut_index >= 0),
  title text not null,
  status text not null default 'queued'
    check (status in ('queued', 'rendering', 'ready', 'failed')),
  -- `<workspace_id>/<render_id>/short.mp4` and `poster.jpg` in `renders`.
  storage_path text,
  poster_path text,
  duration_s numeric check (duration_s is null or duration_s > 0),
  bytes bigint check (bytes is null or bytes > 0),
  -- ==========================================================================
  -- The cut list, and the seam the other session builds against
  -- ==========================================================================
  --
  -- A `Segment[]` — see `apps/web/lib/video/segment.ts`, which is the one
  -- module both sessions import. Each segment is either a window of the
  -- client's own footage or a generated clip. Stored rather than recomputed,
  -- because it is the answer to "why does this short contain this shot", and
  -- re-running the aligner next month is a different answer.
  segments jsonb not null default '[]'::jsonb,
  -- Every generated scene in this render, with its provider and prompt
  -- reference. Empty for anything cut from footage alone.
  ai_scenes jsonb not null default '[]'::jsonb,
  -- The words shown on the video and in the studio when a scene was generated.
  ai_label text,
  -- The Compliance agent's verdict and findings, as `summary.json` carries it.
  compliance jsonb,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  -- ==========================================================================
  -- Non-negotiable 4, as a constraint rather than a component
  -- ==========================================================================
  --
  -- "AI scenes are always labelled, in the UI and on the platform." A label
  -- that lives in a component is a label one new caller forgets; this makes an
  -- unlabelled generated scene **a failed insert**, for every role including
  -- the service role the worker holds. It is also why the generated-clip slot
  -- is safe to ship before the generator exists: the first row that tries to
  -- skip the label cannot be written.
  constraint renders_ai_scene_is_labelled check (
    ai_scenes = '[]'::jsonb or (ai_label is not null and btrim(ai_label) <> '')
  ),
  -- ==========================================================================
  -- Non-negotiable 6, the same way `drafts_approved_passed` does it
  -- ==========================================================================
  --
  -- "Every video passes the Compliance agent before it can be scheduled." An
  -- approved render therefore cannot exist without a verdict that says
  -- `passed`. A check constraint binds a member, the action, the worker and
  -- anybody at a psql prompt, which is what `04` means by "no override, from
  -- anywhere".
  constraint renders_approved_passed check (
    approved_at is null
    or (compliance is not null and compliance ->> 'verdict' = 'passed')
  ),
  -- A `ready` render with no file is a card the client can press and nothing
  -- plays. Cheaper to refuse the write than to debug the player.
  constraint renders_ready_has_file check (status <> 'ready' or storage_path is not null)
);

-- The studio's read: this workspace's shorts, newest first.
create index if not exists renders_workspace_created
  on public.renders (workspace_id, created_at desc);

-- The batch read: every short from one upload, in cut order.
create index if not exists renders_asset_cut
  on public.renders (asset_id, cut_index);

-- One row per cut per job. A worker re-running a batch after a reclaimed lease
-- must overwrite its own rows rather than add a second set of four.
--
-- **Not a partial index**, though `job_id` is nullable and the obvious spelling
-- adds `where job_id is not null`. Two reasons, and the second is the real one:
-- a unique index already ignores null pairs, so the partial clause buys
-- nothing; and `on conflict (job_id, cut_index)` cannot infer a *partial*
-- index unless the statement repeats its predicate, which PostgREST has no way
-- to express. The worker's upsert is the whole point of this index, so the
-- index is written in the form the upsert can actually use.
create unique index if not exists renders_job_cut
  on public.renders (job_id, cut_index);

-- ============================================================================
-- approve_render — the member's decision, and the only way it reaches a row
-- ============================================================================
--
-- Mirrors `approve_draft` deliberately, including the parts that look like
-- duplication:
--
-- * `security definer`, because `authenticated` holds **no update grant** on
--   `renders`. There is no PostgREST patch that sets a status, so this function
--   is the only path and its checks are unavoidable rather than conventional.
-- * One sentence for "no such render" and for "not yours", so a stranger with a
--   guessed id learns nothing about whether it was real.
-- * A refusal returns `ok: false` with a reason rather than raising. The gate
--   refusing is the gate working (`18 §6`), and an exception would reach the
--   client as a 400 quoting the statement it refused.
--
-- The `ai_label` check is here as well as in the constraint on purpose: the
-- constraint stops the row existing, and this gives the reader the sentence.
create or replace function public.approve_render(render_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.renders;
begin
  select * into target from public.renders where id = render_id;

  if not found or not public.is_member_of(target.workspace_id) then
    return jsonb_build_object(
      'ok', false,
      'status', null,
      'reason', 'That video could not be found.'
    );
  end if;

  -- Idempotent. A second press is not an error, and telling the client it is
  -- would leave them wondering which press counted.
  if target.approved_at is not null then
    return jsonb_build_object('ok', true, 'status', target.status, 'reason', null);
  end if;

  if target.status <> 'ready' then
    return jsonb_build_object(
      'ok', false,
      'status', target.status,
      'reason', 'This video is not finished yet.'
    );
  end if;

  if target.compliance is null or target.compliance ->> 'verdict' <> 'passed' then
    return jsonb_build_object(
      'ok', false,
      'status', target.status,
      'reason', 'The Compliance agent has not passed this video, so it cannot be approved.'
    );
  end if;

  if target.ai_scenes <> '[]'::jsonb and coalesce(btrim(target.ai_label), '') = '' then
    return jsonb_build_object(
      'ok', false,
      'status', target.status,
      'reason', 'This video has a generated scene and no AI label, so it cannot be approved.'
    );
  end if;

  update public.renders
  set approved_by = auth.uid(),
      approved_at = now()
  where id = render_id
  returning * into target;

  return jsonb_build_object('ok', true, 'status', target.status, 'reason', null);
end;
$$;

-- ============================================================================
-- Row-level security: read your own, write nothing from a browser
-- ============================================================================

alter table public.video_assets enable row level security;
alter table public.transcripts enable row level security;
alter table public.renders enable row level security;

drop policy if exists video_assets_select_members on public.video_assets;
drop policy if exists transcripts_select_members on public.transcripts;
drop policy if exists renders_select_members on public.renders;

create policy video_assets_select_members
on public.video_assets
for select
to authenticated
using (public.is_member_of(workspace_id));

-- Members read the transcript because the studio says which adapter produced
-- the words, and `summary.json`'s rule is that a sidecar run must never read
-- like a model run. The words themselves are the client's own speech.
create policy transcripts_select_members
on public.transcripts
for select
to authenticated
using (public.is_member_of(workspace_id));

create policy renders_select_members
on public.renders
for select
to authenticated
using (public.is_member_of(workspace_id));

grant select on public.video_assets to authenticated;
grant select on public.transcripts to authenticated;
grant select on public.renders to authenticated;

revoke insert, update, delete on public.video_assets from authenticated, anon;
revoke insert, update, delete on public.transcripts from authenticated, anon;
revoke insert, update, delete on public.renders from authenticated, anon;

-- `public` is named as well as the roles, because `public` is the default
-- grantee for a new function: an ungranted function is in practice a granted
-- one.
revoke all on function public.approve_render(uuid) from public, anon;
grant execute on function public.approve_render(uuid) to authenticated;

comment on table public.video_assets is
  'One client upload, in the private client-footage bucket. rights_holder is '
  'not null because non-negotiable 1 allows only client-owned material and the '
  'compliance gate blocks every cut made with no rights record — refusing the '
  'upload is cheaper than billing for a render that can never ship.';

comment on table public.transcripts is
  'The words, one row per asset, so a second cut of the same source never pays '
  'to transcribe it twice. engine names the adapter that answered.';

comment on table public.renders is
  'One finished 9:16 short. A child of the asset rather than a column on it, '
  'because a 60-minute source yields several and cut_index orders them. The '
  'two check constraints carry non-negotiables 4 and 6 — an unlabelled '
  'generated scene, and an approval with no passing compliance verdict, are '
  'both unwritable by every role including the service role.';

comment on column public.renders.segments is
  'The cut list: a Segment[] as defined in apps/web/lib/video/segment.ts, '
  'which is the single module the video and generation sessions share. Each '
  'segment is a window of the client''s own footage or a generated clip.';

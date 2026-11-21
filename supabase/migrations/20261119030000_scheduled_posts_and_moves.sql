-- B2.2 — the calendar off sample data: a post you can move, and a record of
-- every move. `docs/plan/BACKEND_PHASE.md` §2 item 2, D95.
--
-- ============================================================================
-- A move is an edit to a row, not a new row
-- ============================================================================
--
-- The plan says both "it needs a `post_moves` write" and "a move is an edit to
-- a row, not a new row", which reads as a contradiction and is not. Both are
-- true, of different tables:
--
--   * `scheduled_posts.scheduled_date` / `.scheduled_time24` are **mutated**,
--     so the calendar shows one post, moved — not two posts, one of them stale.
--   * `post_moves` is an **append-only** record of who moved what, from where,
--     and when.
--
-- ============================================================================
-- Local date and time, not an instant — and nothing derivable
-- ============================================================================
--
-- `scheduled_at timestamptz` would be the right column for a publisher, and it
-- cannot be filled honestly yet: converting "Tuesday 2:15 pm" into an instant
-- needs a workspace time zone, and there is no such column because nobody has
-- been asked for one. Defaulting to UTC would silently reschedule every post
-- for every user outside it. So this stores what the user actually chose — a
-- local date and a local 24-hour time — and the conversion becomes a real
-- decision when posting is switched on (§6 keeps it off) and there is a time
-- zone to make it with.
--
-- `ScheduledPost` in `@mirrorline/mock` also carries `platformLabel`,
-- `statusLabel` and `timeLabel`. None of the three is a column: each is a pure
-- function of `platform`, `status` and `scheduled_time24`. Two fields that can
-- disagree is a bug with a schema for a home.

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Null for a remake, which has no source cut. Mirrors `ScheduledPost.cutId`.
  cut_id uuid,
  -- `Platform` in packages/mock/src/types.ts. Checked here as well as in
  -- TypeScript, because the type is gone by the time a row is written.
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'linkedin')),
  title text not null,
  -- `PostStatus`, same list and same reason.
  status text not null default 'scheduled' check (
    status in ('published', 'published-private', 'scheduled', 'needs-review', 'approved')
  ),
  scheduled_date date not null,
  -- "14:15". The regex is the whole validation: a time that is not a time would
  -- sort wrongly in the grid rather than fail loudly.
  scheduled_time24 text not null check (scheduled_time24 ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at timestamptz not null default now()
);

-- The calendar reads one workspace's week at a time, in date order.
create index if not exists scheduled_posts_workspace_date_idx
on public.scheduled_posts (workspace_id, scheduled_date);

-- ============================================================================
-- The audit, written by a trigger rather than by the application
-- ============================================================================
--
-- The move and its record are one statement, so no code path can move a post
-- and forget to say so. An audit the application has to remember to write is
-- an audit that stays complete until the day somebody adds a second way to
-- move a post.
--
-- `moved_by` is **nullable on purpose**: null means "not a signed-in user" —
-- the service role, a migration, a fixture. Making it not-null would render the
-- honest answer unrepresentable and invite a sentinel user id.

create table if not exists public.post_moves (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references public.scheduled_posts (id) on delete cascade,
  moved_by uuid references public.profiles (id) on delete set null,
  from_date date not null,
  from_time24 text not null,
  to_date date not null,
  to_time24 text not null,
  moved_at timestamptz not null default now()
);

create index if not exists post_moves_post_idx
on public.post_moves (scheduled_post_id, moved_at desc);

create or replace function public.record_post_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only a reschedule is a move. A title edit or a status change is not, and
  -- recording one would make the audit useless by filling it with noise.
  if new.scheduled_date = old.scheduled_date
     and new.scheduled_time24 = old.scheduled_time24 then
    return new;
  end if;

  insert into public.post_moves (
    scheduled_post_id, moved_by, from_date, from_time24, to_date, to_time24
  )
  values (
    old.id, auth.uid(), old.scheduled_date, old.scheduled_time24,
    new.scheduled_date, new.scheduled_time24
  );

  return new;
end;
$$;

drop trigger if exists scheduled_posts_record_move on public.scheduled_posts;

create trigger scheduled_posts_record_move
after update on public.scheduled_posts
for each row
execute function public.record_post_move();

-- ============================================================================
-- Row-level security
-- ============================================================================

alter table public.scheduled_posts enable row level security;
alter table public.post_moves enable row level security;

drop policy if exists scheduled_posts_select_members on public.scheduled_posts;
drop policy if exists scheduled_posts_update_members on public.scheduled_posts;
drop policy if exists post_moves_select_members on public.post_moves;

create policy scheduled_posts_select_members
on public.scheduled_posts
for select
to authenticated
using (public.is_member_of(workspace_id));

-- Update only, and no insert or delete policy at all. **Nobody authors a
-- scheduled post in this phase** — the pipeline will, through the service role
-- — so a member may move one and may not create or destroy one. An absent
-- policy denies; this is not an oversight.
--
-- `with check` repeats the `using` expression so a member cannot move a post
-- *into* another workspace by patching `workspace_id`: `using` decides which
-- rows may be touched, `with check` decides what they may become, and omitting
-- the second is the classic hole in an update policy.
create policy scheduled_posts_update_members
on public.scheduled_posts
for update
to authenticated
using (public.is_member_of(workspace_id))
with check (public.is_member_of(workspace_id));

-- ============================================================================
-- Which columns a move may touch, enforced by grant rather than by policy
-- ============================================================================
--
-- RLS decides *rows*; it has nothing to say about columns. Without this, the
-- update policy above would also let a member retitle a post or change its
-- platform — and `schedule-moves.ts` is explicit that moving across a platform
-- row "would mean 'post this to TikTok instead', which is a different decision
-- under different rules". That sentence deserves to be true in the database and
-- not only in a comment.
--
-- Supabase grants table-wide update to `authenticated` by default, so the
-- table-level grant is withdrawn and exactly two columns are handed back.

revoke update on public.scheduled_posts from authenticated;
grant update (scheduled_date, scheduled_time24) on public.scheduled_posts to authenticated;

-- A member reads the history of a post they can already read. There is no
-- insert, update or delete policy: the trigger writes these rows as
-- `security definer`, which is what makes the table append-only **in fact**
-- rather than by convention. A member cannot rewrite their own history, and
-- neither can we without a migration.
create policy post_moves_select_members
on public.post_moves
for select
to authenticated
using (
  exists (
    select 1
    from public.scheduled_posts post
    where post.id = post_moves.scheduled_post_id
      and public.is_member_of(post.workspace_id)
  )
);

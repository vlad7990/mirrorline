-- V3's second and third done-whens: an approval the database can refuse, and a
-- block that is terminal because the schema says so (D129).
--
-- ============================================================================
-- What was missing
-- ============================================================================
--
-- `BACKEND_PHASE §V3`: "the approve action is refused **server-side**, not
-- merely hidden; and 'blocked twice' reaches a terminal state rather than
-- looping."
--
-- D126 built the gate and showed its verdict in the studio, and left both of
-- those unmet for one reason: **there was nothing to approve.** A judged draft
-- lived in `niche_reports.first_videos`, a jsonb blob with no identity and no
-- status, and the only drafts stored there were the ones that passed —
-- `screenIdeas` dropped the rest, so a block was visible as a count in a log
-- line. `scheduled_posts` lists `'approved'` in its status check and grants
-- `authenticated` update on two date columns, so nothing could set it.
--
-- So: a row per judged draft, kept **and** refused, with the verdict beside it.
--
-- ============================================================================
-- The refusal is a check constraint, not a policy and not application code
-- ============================================================================
--
-- This is the decision worth reading twice. `drafts_approved_passed` says an
-- approved draft must carry a `passed` verdict, and **a check constraint
-- applies to every role** — a member, a definer function, the service role, or
-- somebody at a psql prompt. `04 §Originality Gate` says "no warn-and-continue
-- and no override, from anywhere", and *anywhere* includes us.
--
-- A policy could not do this: RLS scopes rows by who is asking, and this rule
-- does not depend on who is asking. Application code could not do it either,
-- not durably — it holds until somebody adds a second way to approve, which is
-- precisely how the predecessor project's gate came to be optional.
--
-- `approve_draft` below is the ergonomic path and the honest message. The
-- constraint is what makes the refusal true.
--
-- ============================================================================
-- Terminality, also as a constraint
-- ============================================================================
--
-- Two of them, and together they are "blocked twice is terminal":
--
--   * `attempts` may only be 1 or 2. `04 §3` — "a draft that fails twice is
--     blocked ... two failures mean the recipe is too close to its source to
--     remake". A third attempt is **unrepresentable**, so the rewrite loop
--     cannot be re-entered by a caller that forgot to count. The number is
--     `MAX_ATTEMPTS` in `apps/web/lib/originality/gate.ts`, and
--     `drafts.test.ts` reads this file to assert the two still agree.
--   * A `blocked` verdict can only sit on a `blocked` draft. Nothing can file a
--     blocked draft back into `needs-review` to wait for a kinder reviewer.
--
-- ============================================================================
-- Who may write: nobody with a browser
-- ============================================================================
--
-- Members read. Every write is the service role (the scan writes the rows) or
-- `approve_draft` (a member's decision, through a definer function that checks
-- the verdict first). The table-level grants Supabase hands `authenticated` are
-- withdrawn, so there is no PostgREST patch that sets `status` directly — the
-- same shape `scheduled_posts` uses, for a sharper reason: an approval is a
-- compliance decision, not a preference.

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Which scan produced it. Nullable because a remake script will not have one
  -- (`kind` already names that future), and `on delete cascade` because a
  -- draft without its research is an orphan nobody can judge.
  report_id uuid references public.niche_reports (id) on delete cascade,
  kind text not null default 'video-idea' check (kind in ('video-idea', 'remake-script')),
  title text not null,
  -- The exact text the gate judged, so the verdict can be re-derived rather
  -- than taken on trust. `ideaDraft()` builds it; it is hook, lines and
  -- captions — expression, never beat labels (D126).
  body text not null,
  -- The whole verdict, for the studio to show the gate's own arithmetic: the
  -- number, the limit, the reasons, and what it could not compare against.
  originality jsonb,
  -- The one field the rules are written against. **Nullable on purpose**: null
  -- is "not checked", and every rule below treats it as a refusal, because an
  -- absent verdict must never read as a clean one.
  originality_outcome text check (originality_outcome in ('passed', 'rewritten', 'blocked')),
  attempts integer not null default 1 check (attempts between 1 and 2),
  status text not null default 'needs-review'
    check (status in ('needs-review', 'approved', 'rejected', 'blocked')),
  -- Nullable, and null does not mean "approved by nobody" — an approved row
  -- always has `approved_at`. It means the account that approved it has since
  -- been deleted, which `post_moves.moved_by` already handles the same way:
  -- making it not-null would render the honest answer unrepresentable.
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  -- The gate, in the schema. Every role, no exceptions, no override.
  constraint drafts_approved_passed check (
    status <> 'approved' or (originality_outcome = 'passed' and approved_at is not null)
  ),
  -- Blocked twice is terminal: a blocked verdict cannot sit on a draft that is
  -- still waiting for a decision.
  constraint drafts_blocked_is_terminal check (
    originality_outcome is distinct from 'blocked' or status = 'blocked'
  )
);

-- The studio reads one report's drafts, oldest first, so the order matches the
-- order the ideas are rendered in.
create index if not exists drafts_report_created_idx
  on public.drafts (report_id, created_at);

-- And one workspace's queue of undecided drafts, which is what a "needs you"
-- count is. Partial: decided rows accumulate forever and this question never
-- looks at them.
create index if not exists drafts_workspace_pending_idx
  on public.drafts (workspace_id, created_at)
  where status = 'needs-review';

-- ============================================================================
-- approve_draft — the refusal, with a sentence attached
-- ============================================================================
--
-- **It returns a refusal rather than raising one.** That is the call
-- `jobs.result` made for the spend cap, for the same reason: a refusal here is
-- a *working control*, not a fault. `18 §6` — "a scan the cap refused is not an
-- error, and rendering it as one would teach the reader to distrust a control
-- that is working exactly as asked". An exception would reach the client as a
-- 400 carrying a PostgREST error body, which is both uglier and more likely to
-- quote the statement it refused.
--
-- `security definer` because the caller has **no update grant at all** on this
-- table — this function is the only way a member's decision reaches a row,
-- which is what makes the verdict check unavoidable rather than conventional.
-- `20261119070000_definer_functions_are_authenticated_only.sql` applies the
-- matching rule from the other side: a definer function is for a user doing
-- something their own grants forbid, and the membership check below is what
-- stops it doing so for somebody else's workspace.
create or replace function public.approve_draft(draft_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  draft public.drafts;
begin
  select * into draft from public.drafts where id = draft_id;

  -- One sentence for "no such draft" and for "not yours". A different message
  -- for the second would confirm to a stranger that the id is real.
  if not found or not public.is_member_of(draft.workspace_id) then
    return jsonb_build_object(
      'ok', false,
      'status', null,
      'reason', 'That draft could not be found.'
    );
  end if;

  -- Idempotent. A double-click, or a retry after a dropped response, is not an
  -- error and must not read as one.
  if draft.status = 'approved' then
    return jsonb_build_object('ok', true, 'status', draft.status, 'reason', null);
  end if;

  if draft.originality_outcome is distinct from 'passed' then
    return jsonb_build_object(
      'ok', false,
      'status', draft.status,
      -- Names the gate, because the client is owed the reason and the gate's
      -- own numbers are already on the screen beside this button.
      'reason', 'The Originality Gate has not passed this draft, so it cannot be approved.'
    );
  end if;

  if draft.status <> 'needs-review' then
    return jsonb_build_object(
      'ok', false,
      'status', draft.status,
      'reason', 'This draft is no longer waiting for a decision.'
    );
  end if;

  update public.drafts
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = draft_id
  returning * into draft;

  return jsonb_build_object('ok', true, 'status', draft.status, 'reason', null);
end;
$$;

-- ============================================================================
-- Row-level security
-- ============================================================================
--
-- Members read their workspace's drafts — V3 is explicit that the verdict is
-- shown to the client, and "a gate whose failures are invisible is the
-- predecessor project's gate". There is **no insert, update or delete policy**:
-- an absent policy denies, and that is deliberate rather than unfinished.
alter table public.drafts enable row level security;

drop policy if exists drafts_select_members on public.drafts;

create policy drafts_select_members
on public.drafts
for select
to authenticated
using (public.is_member_of(workspace_id));

grant select on public.drafts to authenticated;
revoke insert, update, delete on public.drafts from authenticated, anon;

-- `public` is named as well as the roles, because `public` is the default
-- grantee for a new function: an ungranted function is in practice a granted
-- one.
revoke all on function public.approve_draft(uuid) from public, anon;
grant execute on function public.approve_draft(uuid) to authenticated;

comment on table public.drafts is
  'One row per judged draft, kept and refused alike (V3, D126, D129). The '
  'approval rule is the check constraint drafts_approved_passed, not a policy '
  'and not application code: 04 forbids an override "from anywhere", and a '
  'check constraint is the only thing that binds the service role too.';

comment on column public.drafts.attempts is
  'Which attempt produced this verdict, 1 or 2. A third is unrepresentable, '
  'which is how "blocked twice is terminal" survives a caller that forgot to '
  'count. Mirrors MAX_ATTEMPTS in apps/web/lib/originality/gate.ts.';

comment on column public.drafts.originality_outcome is
  'passed, rewritten or blocked — or null for "not checked", which every rule '
  'here treats as a refusal. An absent verdict must never read as a clean one.';

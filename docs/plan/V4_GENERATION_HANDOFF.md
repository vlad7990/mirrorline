# V4 "Generate with AI" — handoff

**Written 25 November 2026, at the end of slice 1.** For whoever picks this up
next, including a future me after a `/clear`.

Worktree: `/Users/vladb/Developer/mirrorline/mirrorline-gen`, branch
`feat/ai-generation-v4`, **PR #43**. Dev server on **port 3002, never 3000**.

---

## Where this stands in one paragraph

The plan is `docs/plan/AI_GENERATION_V4.md`, approved; the decisions are **D137**
in `docs/DECISIONS.md`. §4.2 steps 1–3 and 5 are built, committed and pushed:
the adapter interface, the safety gate, the media cap and ledger, the registry,
the keyless sample provider, and the import-graph sweep that keeps the key in
one file. 104 tests in the layer; `lint`, `typecheck`, 1385 tests and `build`
all green at commit `62e3871`. **No migration was needed and none was written.**

Steps 4 and 6 — the real xAI provider and the dev screen — are blocked on
exactly one thing: an `XAI_API_KEY` in `apps/web/.env.local`. Nothing else about
them is unknown.

---

## Read these first, in this order

1. `docs/DECISIONS.md` → **D137**. Vlad's five decisions and the five the
   implementation forced. If you read one thing, read this.
2. `apps/web/lib/generation/types.ts`. The header explains why this is *not* a
   `Segment` and carries the mapping onto the VIDEO session's union.
3. `docs/plan/AI_GENERATION_V4.md` §2 for the provider research with the exact
   rates and terms, §4.1 for the cost table.

---

## What to do next, when the key arrives

**Step 4 — `apps/web/lib/generation/providers/xai.ts`.** The one reader of
`env.XAI_API_KEY`. Everything it needs is already decided:

- `grok-imagine-video-1.5-lite` for clips, `grok-imagine-image-2.0` for images.
  Rates are already in `spend.ts`.
- Async: `POST https://api.x.ai/v1/videos/generations` returns `{ request_id }`;
  poll `GET /v1/videos/{request_id}` until `status` is `done` or `failed`.
  Images are synchronous.
- `aspect_ratio: '9:16'`, `resolution`, `duration` from the request. **Never**
  send a reference image, a voice reference or a start frame — the request type
  has no field for one and that is deliberate (D137, non-negotiable 5).
- Send `scenePrompt(request)` from `safety.ts`, not `request.prompt`. It appends
  the allow-list framing.
- Map refusals, do not throw them: images expose `respect_moderation` on the
  response; clips fail with `error.code: 'invalid_argument'`, whose documented
  causes include content blocked by moderation. Both become
  `{ status: 'refused' }`. Only a network or 5xx failure is `'failed'`.
- `providerWatermark: null` for media. xAI's watermarking docs cover text and
  audio only. Do not write `false` and do not write `true`.
- Cost on the finished asset comes from `billedGenerationUsd` using the seconds
  the provider actually returned, not the seconds requested.
- `server-only.test.ts` will flip automatically: its expectation is derived from
  whether `providers/xai.ts` exists on disk, so the moment you create it the
  test demands that it is the *only* reader of the key. You should not need to
  edit that test at all. If you find yourself editing it, stop and read why.

Then add it to `ADAPTERS` in `registry.ts`, **above** `cannedAdapter`.

**Step 6 — the dev screen.** `/app/dev/generate`, behind a `GENERATION_ENABLED`
flag, Node runtime. Show the asset, the **AI-generated** badge, the provenance
line (adapter, model, cost, "watermark: not stated"), and — the part worth
demoing — a prompt naming a celebrity, refused by our own filter before any
money moved, with a `refused` row in `agent_runs` at $0.00.

Call order, and it is not negotiable: `screenPrompt` → `checkGenerationSpend` →
`adapter.generate` → `recordGenerationOutcome`. The cap reads the month and
refuses *before* the call.

---

## Four traps I hit, so you do not

1. **The repo-wide claim sweep scans test fixtures.**
   `lib/copy/banned-phrases.test.ts` walks the source tree, and my
   `safety.test.ts` fixture containing the viral claim failed it. The house
   answer is **not** to build the phrase from fragments —
   `copilot/canned.test.ts`'s own exemption says that would be "testing the
   detector with the detector". Add an `ALLOWED` entry with a reason. There is a
   third test that fails if the exemption turns out to be unnecessary.
2. **`import 'server-only'` has no `from` clause.** It is invisible to a regex
   looking for `from '...'`. This was a real latent bug in the extracted walker
   and is fixed in `lib/testing/import-graph.ts`; the comment there explains it.
   If you write a new sweep, do not re-derive this.
3. **Case-insensitive flags destroy capital-letter signals.** A pattern like
   `/president\s+[A-Z][a-z]+/i` matches lowercase after the `i` flag, so the
   capital on the *name* — the only thing separating "President Vance" from
   "president of the club" — stops mattering. The titles in `safety.ts` are
   written `[Pp]resident` by hand for that reason.
4. **The Fact-Forcing Gate blocks the first `Bash` call and every
   `Write`/`Edit` until you state four facts in a message containing no tool
   call.** The facts and the tool call must be in *separate* messages. Budget a
   turn per file, or run the session with `ECC_GATEGUARD=off`.

---

## What is still open, and whose it is

**Vlad's** (all six are in `docs/PROGRESS.md` under "Needs Vlad" too):

1. `XAI_API_KEY` in `apps/web/.env.local`. Preview only.
2. Buy zero data retention on the xAI account — approved in principle, but it is
   an Order Form line item, not a flag. Until it is bought, xAI holds inputs and
   outputs for 30 days.
3. The AUP question for the lawyer list (D137 §5). Blocks billing a client for
   generated output; blocks nothing before that.
4. **$0.50 per request makes 1080p a short-clip-only option** — it crosses the
   ceiling at about 3.5 seconds. Raise the ceiling, drop 1080p from the UI, or
   leave it documented. Do not silently raise it; he approved the number.
5. `agent_runs.agent` is written as `media_generator`. Rename freely — one
   string, no migration.
6. The `Segment` type. See below.

**The VIDEO session's.** Their plan (`docs/plan/V5_VIDEO_PIPELINE_PLAN.md` §1.6,
untracked on `feat/video-v5`) defines the cut-list union and says in terms that
"the AI-GENERATION session produces `generated` segments":

```ts
type Segment =
  | { kind: 'source';    assetId: string; startS: number; endS: number; beat: BeatLabel }
  | { kind: 'generated'; clipId: string;  provider: string; storagePath: string;
      promptRef: string; beat: BeatLabel }
```

**Nothing in this session declares a parallel union, and nothing should.**
`types.ts` carries the field-by-field mapping and the conversion function is
deliberately unwritten, because writing it would mean declaring their type to
write it against. When their union lands in code, the conversion is a rename in
one small function. `storagePath` is the field to watch:
`GeneratedAsset.location` is a local path (and a `sample://` URI from the canned
adapter) until their bucket and its RLS review exist.

**Mine, when unblocked.** Steps 4 and 6 above. Then slice 2: the
`'generate-assets'` job kind and the bucket — both migrations, both waiting on
the VIDEO session's bucket landing first, per Vlad's coordination rule. When
that happens, `budget.test.ts` needs a wall-clock ceiling for the poll loop
added to its sum: `JOB_LEASE_SECONDS` is 1200 and D136 is the scar tissue from
getting that inequality wrong once already.

---

## The shape of the thing, for orientation

```
apps/web/lib/generation/
  types.ts              shapes + dimensionsFor. Client-importable. No server-only.
  prompt-ref.ts         FNV-1a handle for a prompt. Never the prompt itself.
  safety.ts             screenPrompt (the gate) + scenePrompt (the framing)
  spend.ts              rates, projectGenerationUsd, decideGenerationSpend. Pure.
  ledger.ts             server-only. The one Supabase read and write.
  registry.ts           chooseAdapter. The one place a provider is chosen.
  providers/canned.ts   server-only. sample:// URIs. Needs no key.
  *.test.ts             94 tests
  server-only.test.ts   the boundary sweep, both directions
apps/web/lib/testing/
  import-graph.ts       the shared walker (also used by copilot/server-only.test.ts)
```

The two directions the sweep checks are worth knowing: **outward**, no
`'use client'` module may reach a provider or the ledger; **inward**, `types.ts`,
`prompt-ref.ts`, `safety.ts` and `spend.ts` must *not* become server-only,
because a panel renders the label and the provenance line from those shapes. The
inward one is the direction that would otherwise have no test, because nothing
about it looks dangerous while you are doing it.

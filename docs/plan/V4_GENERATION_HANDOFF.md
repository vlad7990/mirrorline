# V4 "Generate with AI" — handoff

**Written 25 November 2026, rewritten after step 4.** For whoever picks this up
next, including a future me after a `/clear`.

Worktree: `/Users/vladb/Developer/mirrorline/mirrorline-gen`. Dev server on
**port 3002, never 3000**. Run gates through `pnpm`, not `npx`, and chain them
with `&&` so a red check stops the commit.

| | |
| --- | --- |
| Plan | `docs/plan/AI_GENERATION_V4.md` (approved) |
| Decisions | **D140** in `docs/DECISIONS.md` |
| Slice 1 (steps 1–3, 5) | **merged** — PR #43, on `main` |
| Step 4, the xAI provider | **open PR #45**, branch `feat/ai-generation-v4-provider` |
| Step 6, the dev screen | **not started** |

---

## Where this stands

The adapter layer is on `main`: the interface, the safety gate, the media cap
and ledger, the registry, the keyless sample provider, and the import-graph
sweep that keeps each key in one named file. The xAI provider is written and
tested on PR #45 and prefers itself over the sample whenever a key is present.

`lint`, `typecheck`, **1414 tests** and `build` are green at `91e57e8`. **No
migration has been written and none is needed yet.**

**The one thing no test can cover is a real call.** There is still no
`XAI_API_KEY` in `apps/web/.env.local`, so the adapter has never spoken to xAI.
Everything around that call — request bodies, polling, the refusal mapping, the
billing arithmetic, the key never reaching a log — is covered by 29 tests with
`fetch`, the filesystem, the clock and the environment all injected.

---

## Read these first, in this order

1. `docs/DECISIONS.md` → **D140**. Vlad's decisions and the ones the
   implementation forced. If you read one thing, read this.
2. `apps/web/lib/generation/types.ts`. Its header explains why this is *not* a
   `Segment`, carries the mapping onto the VIDEO session's union, and explains
   why `Resolution` has only two values.
3. `apps/web/lib/generation/providers/xai.ts`. The seams, and why.

---

## What to do next

**Step 6 — the dev screen.** The only piece left, and it is demoable without a
key because the refusal path is the half worth showing.

- Route: `/app/dev/generate`, behind a `GENERATION_ENABLED` flag, with
  `export const runtime = 'nodejs'` — the provider uses `node:fs`, and an edge
  runtime fails at request time rather than at build time.
- Show: the asset, the **AI-generated** badge, and the provenance line —
  adapter, model, cost, and "watermark: not stated" for a `null`
  `providerWatermark`. When `chooseAdapter` returns `isSample: true`, the page
  says **"Sample data"** (non-negotiable 7).
- Demo the refusal: a prompt naming a celebrity, turned down by our own filter
  before any money moved, with the rule named on screen and a `refused` row in
  `agent_runs` at $0.00.
- **Call order, not negotiable:** `screenPrompt` → `checkGenerationSpend` →
  `adapter.generate` → `recordGenerationOutcome`. The cap reads the month and
  refuses *before* the call.
- `GeneratedAsset.location` is a local path. Serving it needs a small route that
  reads the file; do not hand the path to the browser as a URL.

**Then, when the key lands:** one live clip and one live image, and check three
things against reality — that `request_id` comes back where the docs say, that a
finished poll carries `video.duration`, and that the billed cost matches what
the console reports. If any differ, the fix is in `parseClipPoll` or
`billedGenerationUsd`, and the tests will tell you which.

**Then slice 2**, which is migrations and therefore waits: the
`'generate-assets'` job kind and a storage bucket, both blocked on the VIDEO
session's bucket landing first (Vlad's coordination rule). When that happens,
`budget.test.ts` needs the poll-loop ceiling added to its sum —
`JOB_LEASE_SECONDS` is 1200, `CLIP_POLL_TIMEOUT_MS` is 90, and D136 is the scar
tissue from getting that inequality wrong once.

---

## Five traps I hit, so you do not

1. **Decision numbers are assigned by range now.** SCAN D132–D139,
   **AI-GENERATION D140–D149**, VIDEO D150–D159 — recorded in `CLAUDE.md`. Do
   not take "the next number in `docs/DECISIONS.md`": three sessions on three
   worktrees cannot see each other's branches, and this entry was written as
   D137 while SCAN's PR #42 already had it.
2. **The repo-wide claim sweep scans test fixtures.**
   `lib/copy/banned-phrases.test.ts` walks the source tree, and `safety.test.ts`
   failed it for carrying the viral claim as an input. The house answer is
   **not** to build the phrase from fragments — `copilot/canned.test.ts`'s own
   exemption says that would be "testing the detector with the detector". Add an
   `ALLOWED` entry with a reason; a third test fails if the exemption turns out
   to be unnecessary.
3. **Never read `process.env` inside something a test must drive.**
   `server-only.test.ts` asserts the readers of each key are *exactly one named
   file*, so a test setting `process.env.XAI_API_KEY` broke it. The fix was an
   injectable `env` seam, not an exemption — and it also stops env mutation
   leaking across files in a Vitest worker.
4. **`import 'server-only'` has no `from` clause,** so it is invisible to a
   regex looking for `from '...'`. That was a real latent bug in the extracted
   walker; it is fixed in `lib/testing/import-graph.ts` with a comment. Do not
   re-derive it in a new sweep.
5. **Case-insensitive flags destroy capital-letter signals.**
   `/president\s+[A-Z][a-z]+/i` matches lowercase once the `i` flag applies, so
   the capital on the *name* — the only thing separating "President Vance" from
   "president of the club" — stops mattering. The titles in `safety.ts` are
   written `[Pp]resident` by hand for that reason.

Also: the **Fact-Forcing Gate** blocks the first `Bash` call and every
`Write`/`Edit` until four facts appear in a message containing **no tool call**.
Facts and the call must be separate messages. Budget a turn per file, or run
with `ECC_GATEGUARD=off`.

---

## What is open, and whose it is

**Vlad's:**

1. **`XAI_API_KEY`** in `apps/web/.env.local`. Preview only. The live call is
   the only thing no test covers.
2. **Buy zero data retention on the xAI account.** Approved in principle, but it
   is an Order Form line item rather than a flag. Until it is bought, xAI
   retains inputs *and* outputs for 30 days.
3. **The AUP question for the lawyer list** (D140 §5): ToS §1.1 permits a
   Bundled Service, the AUP forbids reselling Output. Blocks billing a client
   for generated output; blocks nothing earlier.
4. **Review PR #45.**

**Settled, so do not reopen:**

- 720p only; 1080p is removed from `Resolution`, and the $0.50 ceiling stays
  (D140). The ceiling is now a *backstop* against malformed requests rather
  than a constraint on real ones.
- `agent_runs.agent = 'media_generator'` — the Remake Producer's spend under its
  own name so the media cap sums separately.
- Google is the later second adapter, **paid tier only** — on its free tier,
  Google's own terms let human reviewers read API inputs and outputs. The
  adapter must refuse to run without billing rather than degrade silently.
- **Runway is not built.** Its terms permit training on inputs and outputs.
  `registry.test.ts` asserts its absence.

**The VIDEO session's.** Their plan (`docs/plan/V5_VIDEO_PIPELINE_PLAN.md` §1.6,
on `feat/video-v5`) defines the cut-list union and says in terms that "the
AI-GENERATION session produces `generated` segments":

```ts
type Segment =
  | { kind: 'source';    assetId: string; startS: number; endS: number; beat: BeatLabel }
  | { kind: 'generated'; clipId: string;  provider: string; storagePath: string;
      promptRef: string; beat: BeatLabel }
```

**Nothing here declares a parallel union, and nothing should.** `types.ts`
carries the field-by-field mapping; the conversion function is deliberately
unwritten, because writing it would mean declaring their type to write it
against. When their union lands in code it is a rename in one small function.
`storagePath` is the field to watch — `GeneratedAsset.location` is a local path
(and a `sample://` URI from the canned adapter) until their bucket and its RLS
review exist, and `XaiAdapterOptions.saveBytes` is the single function that
changes when they do.

---

## The shape of it

```
apps/web/lib/generation/
  types.ts              shapes + dimensionsFor. Client-importable. No server-only.
  prompt-ref.ts         FNV-1a handle for a prompt. Never the prompt itself.
  safety.ts             screenPrompt (the gate) + scenePrompt (the framing)
  spend.ts              rates, projectGenerationUsd, decideGenerationSpend. Pure.
  ledger.ts             server-only. The one Supabase read and write.
  registry.ts           chooseAdapter. xai, then canned.
  providers/xai.ts      server-only. The only reader of XAI_API_KEY. All seams.
  providers/canned.ts   server-only. sample:// URIs. Needs no key.
  server-only.test.ts   the boundary sweep, both directions
apps/web/lib/testing/
  import-graph.ts       the shared walker (also used by copilot/server-only.test.ts)
```

The sweep checks both directions, and the second is the one that would otherwise
have no test: **outward**, no `'use client'` module may reach a provider or the
ledger; **inward**, `types.ts`, `prompt-ref.ts`, `safety.ts` and `spend.ts` must
*not* become server-only, because a panel renders the label and the provenance
line from those shapes. Nothing about adding `import 'server-only'` to a types
file looks dangerous while you are doing it.

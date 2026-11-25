# V5 — the video pipeline, planned (25 November 2026)

Phase 1 only: this file is a plan and nothing in it has been built. It answers
the four questions Vlad asked, in his order, and stops where the first slice
would begin.

**Scope.** An approved "first video" script plus the client's own uploaded
footage becomes a finished 9:16 short, as a worker job: upload → transcribe →
cut to the script's four beats → burned-in captions and text overlays from the
brand kit → 9:16 export → stored privately → shown in the studio for approval.
A clean, typed slot is left where an AI-generated clip can be inserted.

**Boundaries this session respects.**

| Not mine | Who | What I do instead |
|---|---|---|
| `apps/web/lib/niche-scan/*` and the script agent (`lib/scripts/*`) | SCAN session | Read only. I consume `niche_reports.first_videos` and `drafts`; I change neither. |
| Generator adapters (anything that makes footage) | AI-GENERATION session | Build the **slot**, the label and the refusal. Never call a generator, never pick one. |
| Production | Vlad | Preview only. Migrations reach production only by the `migrate-production` label, which I never add. Nothing touching `services/worker` is auto-merged. |

Serves `BACKEND_PHASE §V5`, P1 (the done-for-you promise), the "upload →
transcribe → clip → captioned 9:16 render" line of `docs/plan/30_DAY_PLAN.md`
week 1, and non-negotiables 1, 2, 4, 6 and 10.

---

## 0. Approved 25 November 2026 — the decisions, and what they changed

Vlad approved this plan with five decisions. Three of them changed what is
written below, so they are here rather than only in `docs/DECISIONS.md` D150.

| Decision | Effect on this plan |
|---|---|
| **ffmpeg: the pinned BtbN `linux64-lgpl` build** | §2.3 as written, now pinned by **digest** to an immutable `autobuild` tag and enforced by a gate in `pnpm licence-check`. |
| **Transcription: faster-whisper, whisper.cpp as the fallback** | §2.1 as written. |
| **Remotion: not in slice 1; slice 2 with the Company Licence** | §2.2's recommendation stands for slice 1. **Slice 2 is animated brand templates** — the `introTemplate`/`outroTemplate` the brand kit already holds — and Vlad buys the licence then. Its agent skills arrive with it and not before, because a skill that installs Remotion buys it by accident. `CLAUDE.md`'s stack line now says so. |
| **Separate Railway service: yes — and Railway bills *usage*, not reserved size** | **§3.4's headline number was wrong.** Corrected below. The 2 vCPU / 4 GB figure is now a **replica limit**, not a monthly bill. |
| **Long inputs: up to ~60 minutes, several shorts per upload** | §1.3's data model is built for it now: `renders` is a child of the asset, `cut_index` orders the cuts, and `transcripts.asset_id` is unique so a second cut never re-transcribes. Slice 1 still produces one short. |

**The corrected cost.** Railway charges for measured memory and CPU, so an idle
worker is not a 4 GB bill. Between claims this process holds roughly 150 MB and
almost no CPU — `WORKER_IDLE_POLL_MS` between queries and nothing else — which
is **$1–2 a month**, not $80. The per-video marginal cost is unchanged at
**~$0.01–0.02**, and the replica ceiling (2 vCPU / 4 GB) is what a render may
*reach* during an encode. §3.4 is annotated accordingly.

**One design change made while building it.** The plan had members inserting
their own `video_assets` row, since they are the uploader. They do not: the
server action creates the row *and* mints the signed upload token in one place,
so the storage buckets need no member policy at all — a browser holds a token
for one object path and nothing else. Fewer grants, one gate, and
`rights_holder` cannot arrive null because no path exists that skips it.

It also finishes what `docs/plan/ENGINE_WIRING.md` deferred: that file wires the
engine to a **local** `pnpm dev` and says plainly that "connecting the two
properly needs a job queue and object storage, which the 30-day plan puts in
week 3". This is that connection. The local route stays as it is.

---

## 1. Pipeline design and data model

### 1.1 What already exists and is reused unchanged

Worth reading first, because it is larger than the part that is new.

| Already there | State | Consequence for V5 |
|---|---|---|
| `jobs` + `claim_job` (`20261123020000_jobs.sql`) | `kind` check **already allows `render-cuts`**; `for update skip locked`; lease reclaim | **No migration for the queue.** A render is an insert. |
| `JOB_LEASE_SECONDS = 900` + `budget.test.ts` | asserts the budgets inside one job sum to less than the lease, with margin | A render gets a wall-clock budget constant and joins that sum. |
| `worker_heartbeats` | `id text primary key` from `WORKER_ID ?? RAILWAY_SERVICE_NAME`; `job_kind` check already allows `render-cuts` | **A second worker service needs no migration** — it gets its own row by name. |
| `/healthz` + the Railway healthcheck | live and load-bearing since D128 | The video service copies the same boot gate. |
| `services/pipeline` (Python) | `ffmpeg.py` as the only shell-out, `reframe_filter()`, `cut_vertical()`, 1080×1920 constants, captions, the compliance gate's four rules, 108 tests on ffmpeg-generated footage | The render leg is a new entry point into this package, not a new package. |
| `niche_reports.first_videos` jsonb | holds the structured `VideoIdea[]` — hook, **four labelled beats**, footage list, fact | The beats are recoverable **without a migration** (see 1.4). |
| `drafts` + `approve_draft` | approval already refused server-side unless the Originality Gate passed | A render is only ever enqueued from an **approved** draft. |
| `/api/engine/*` + `lib/engine/runner.ts` | local-only, refuses without a named rights holder | The rights gate's shape and wording are lifted from here. Not extended. |

### 1.2 What is new: storage

No Supabase Storage bucket exists in this project today — `grep -rn "storage\."
supabase/migrations` returns nothing. V5 creates the first two, both **private**:

| Bucket | Path | Who writes | Who reads |
|---|---|---|---|
| `client-footage` | `<workspace_id>/<asset_id>/source.<ext>` | the client, by resumable upload with a signed token | service role; members via signed URL |
| `renders` | `<workspace_id>/<render_id>/short.mp4`, `poster.jpg`, `captions.ass` | service role only | members via signed URL |

Workspace-id-first paths, so an RLS policy is a prefix check — the same shape
fix 6 (the delivered-report PDF bucket) will want. **Coordination note:**
policies live on the shared `storage.objects` table, so if both sessions add
policies the same week, one of us rebases. Mine are named `client_footage_*`
and `renders_*`.

### 1.3 What is new: three tables (one migration, label-gated)

Additive only — new tables, no column changes, no function-signature changes —
so it passes the additive-only gate the label workflow runs.

```
video_assets                       -- one client upload
  id, workspace_id, uploaded_by
  storage_path, original_name, bytes, mime
  duration_s, width, height, has_audio          -- null until ffprobe answers
  rights_holder text not null                   -- non-negotiable 1
  rights_confirmed_at timestamptz not null
  status  ('uploading' | 'ready' | 'rejected')
  error text, created_at

transcripts                        -- so a re-cut costs no second transcription
  id, asset_id, engine, model, language
  words jsonb                                   -- [{text, start, end}]
  created_at

renders                            -- one finished 9:16 short
  id, workspace_id, job_id, draft_id, asset_id
  status ('queued' | 'rendering' | 'ready' | 'failed')
  storage_path, poster_path, duration_s, bytes
  segments jsonb                                -- the cut list, see 1.6
  ai_scenes jsonb not null default '[]'         -- non-negotiable 4
  ai_label text
  compliance jsonb                              -- the gate's verdict + findings
  approved_by, approved_at, created_at, error
```

All timestamps `timestamptz`, ISO-8601 UTC over REST, rendered in the
workspace's zone by the helpers D131 added.

Two constraints carry rules rather than validation, in the idiom
`drafts_approved_passed` established:

```
constraint renders_ai_scene_is_labelled check (
  ai_scenes = '[]'::jsonb or (ai_label is not null and ai_label <> '')
)
constraint renders_approved_passed check (
  approved_at is null or (compliance is not null and compliance->>'verdict' = 'passed')
)
```

The first is why the AI slot is safe to leave open before the other session
fills it: an AI scene reaching the database without a label is a **failed
insert**, not a missed UI label. The second means "approved" cannot exist
without a gate verdict, so non-negotiable 6 is enforced by the schema rather
than by a component.

RLS copies `jobs`: members `select`, service role writes, browsers `insert`
nothing — a render is a unit of compute spend, and an insert a client could
make is a bill a client could type. The one exception is
`video_assets.insert`, which members genuinely need (they are the uploader),
guarded by `is_member_of(workspace_id)` and by both rights columns being
`not null`.

### 1.4 How a job finds its beats

The structure lives in `niche_reports.first_videos`; the approval lives in
`drafts`. `drafts.body` is rendered prose, so the beats are not on the draft
row. The join is:

```
jobs.payload = { assetId, draftId }
  → drafts            (must be status = 'approved')
  → niche_reports     via drafts.report_id
  → first_videos      matched on exact title
```

**Refused if there is no title match** — never guessed, never "the first
element". If that proves fragile, the fix is a later migration putting the idea
jsonb on the draft row; it is not worth a migration today when a join and a
refusal answer it.

### 1.5 The stages, in order

Pure functions where possible; the worker is the only thing that does I/O —
the shape `scan.ts` already uses.

1. **Upload, direct to Storage.** `tus-js-client` against
   `https://<ref>.storage.supabase.co` with a signed upload token from
   `createSignedUploadUrl`, 6 MB chunks. **No bytes through Vercel** (§V5: "a
   function body limit is not an upload strategy"). The rights-holder
   confirmation is required *before* a token is issued, so an unconfirmed
   upload has nowhere to go. Resume is the TUS protocol's, not ours.
2. **Probe.** `ffprobe` → duration, dimensions, audio presence onto the asset
   row. A file with no audio track is refused here, in words, because every
   later stage assumes speech.
3. **Transcribe.** faster-whisper `small`, int8, CPU → `transcripts.words`.
   Skipped when the asset already has a transcript, which makes a re-cut free.
   Nothing invents words — the engine's existing rule.
4. **Beat alignment** (the genuinely new logic). For each of the four beats,
   score every sliding window of the transcript by token overlap with the
   beat's text and take the best window that ends near a sentence boundary.
   Output a `Segment[]`. **Refuses rather than approximates:** if a beat has no
   window above the floor, the job ends with "the Payoff beat is not in this
   footage" — a sentence the client can act on by re-filming, and the house
   style (a refusal is a completed job, not an error).
5. **Captions and overlays.** Write one `.ass` file from the brand kit —
   colours, caption style, the hook line and beat labels as styled events — and
   burn it with `-vf ass=`. This is possible now and was not before: the LGPL
   ffmpeg build carries **libass and freetype**, which the Homebrew build
   lacked (D16). The existing Pillow path is untouched and keeps serving
   `make-samples`.
6. **9:16 export.** `reframe_filter()` (existing centre crop/pad to
   1080×1920), H.264 via `libopenh264`, AAC, `+faststart`.
7. **Compliance.** The existing four rules, unchanged — including `ai-label`,
   which has been wired and waiting for exactly this moment.
8. **Store.** Render and poster to the `renders` bucket; row written; job
   complete. The source stays in `client-footage` — it is the client's, and a
   re-cut needs it.
9. **Studio.** Under the approved draft: poster, a `<video>` on a signed URL,
   the compliance verdict with its findings, the AI label when present, and
   Approve / Reject — with approval refused server-side by the constraint
   above.

### 1.6 The AI-clip slot

The cut list is a discriminated union, and that is the whole interface:

```ts
type Segment =
  | { kind: 'source';    assetId: string; startS: number; endS: number; beat: BeatLabel }
  | { kind: 'generated'; clipId: string;  provider: string; storagePath: string;
      promptRef: string; beat: BeatLabel }
```

The renderer concatenates segments and does not care which kind it got. A
`generated` segment makes `ai_scenes` non-empty, which the schema turns into a
required label, which the compliance gate then requires on screen **and** in
stored metadata — §V5's acceptance test, met by construction.

**I build the union, the renderer, the constraint, the label and the refusal.
The AI-GENERATION session produces `generated` segments.** Nothing here picks
or calls a generator; that is one of the four things the sprint stops for.

---

## 2. Tooling shortlist

Licences and health read from the repositories today (2026-11-25), not from
memory. ✅ = allowed by non-negotiable 10 (MIT / Apache-2.0 / BSD / ISC /
MPL-2.0). ❌ = flagged.

### 2.1 Transcription

| Candidate | Repo | Licence | Commercial use | Health (today) | In our container? |
|---|---|---|---|---|---|
| **faster-whisper** *(recommend)* | `SYSTRAN/faster-whisper` | **MIT** ✅ | unrestricted | v1.2.1, pushed 2026-11-23, 27.0k★, 24 open issues | **Yes.** CTranslate2 (MIT) — **no torch**. `small` int8 ≈ 250 MB. Already the `transcribe` extra in `pyproject.toml`. |
| whisper.cpp | `ggml-org/whisper.cpp` | **MIT** ✅ | unrestricted | v1.9.6 (2026-11-23), 55.5k★, very active | Yes, and the smallest footprint — a binary and a ggml file, no Python. The alternative if image size ever binds. |
| **WhisperX** | `m-bain/whisperX` | **BSD-2-Clause** ✅ | unrestricted | v3.8.6 (2026-05-25), pushed 2026-11-21, 25.7k★ | **Technically yes, practically no.** Requires `torch~=2.8`, `torchvision`, `transformers` and `pyannote-audio>=4` — multi-GB — and pyannote's models are gated on Hugging Face behind accepted conditions and a token. |
| openai/whisper | `openai/whisper` | MIT ✅ | unrestricted | v20250625, pushed 2026-08-31, 113.5k★ | Yes, but torch-heavy and slower than CTranslate2 for the same weights. |

**This resolves PROGRESS "Needs Vlad" note 2.** WhisperX's licence is not
unverified: it is **BSD-2-Clause**, which is on rule 10's list. The reason to
keep it out of the image is now weight and gated models, not licence.
Recommendation: record the licence, keep the opt-in extra, do **not** install it
in the worker image.

### 2.2 Editing / rendering libraries

| Candidate | Repo | Licence | Commercial use | Health | Verdict |
|---|---|---|---|---|---|
| **Remotion** | `remotion-dev/remotion` | **NOASSERTION** — custom source-available licence ❌ | **Company licence required** beyond individuals and very small companies; not OSI-permissive and **not on rule 10's list** | v4.0.547 (2026-11-24), 75.7k★ — very healthy | **Flag for Vlad.** CLAUDE.md names Remotion in the stack and the pipeline README defers "week 2's Remotion templates", so the decision is already owed. It also needs headless Chromium per render (+~400 MB image, much more RAM and CPU). **Recommendation: do not introduce it for V5** — `.ass` + ffmpeg does burned captions and text overlays without it. If intro/outro templates later need it, that is a purchase, not an install. |
| revideo | `redotvideo/revideo` | MIT ✅ | unrestricted | 4.2k★, last push 2026-07-15 — slowing | Same Chromium cost without the polish. Not now. |
| editly | `mifi/editly` | MIT ✅ | unrestricted | last push 2025-05-12 — stale | No. |
| fluent-ffmpeg | `fluent-ffmpeg/node-fluent-ffmpeg` | MIT ✅ | unrestricted | **archived**, 418 open issues | No. `ffmpeg.py` is already our one tested shell-out. |
| auto-editor | `WyattBlue/auto-editor` | **Unlicense** ✅ | public domain | 31.10.0 (2026-11-23), very active | Keep for silence-trimming later; not needed for beat cuts. |
| ClipsAI | `ClipsAI/clipsai` | MIT ✅ | unrestricted | **last push 2024-01-17 — dead** | Stays out, as the pipeline README already decided. |
| libass | `libass/libass` | **ISC** ✅ | unrestricted | 0.17.5, pushed 2026-11-21 | **Yes — inside the ffmpeg build.** This is what replaces the Pillow caption workaround on the new path. |
| Pillow | in use | MIT-CMU / HPND ✅-ish | unrestricted | stable | Already a dependency; PROGRESS note 2 asks Vlad to confirm HPND. With libass available this dependency becomes **removable later**, which is the cheapest way to close that question. |
| ffmpeg-python | `kkroening/ffmpeg-python` | Apache-2.0 ✅ | unrestricted | last push 2024-08-04 — stale | No. We build argument lists ourselves. |

Face-aware reframing, for when centre crop is not enough (a known limit in the
engine README): **MediaPipe** (`google-ai-edge/mediapipe`, Apache-2.0 ✅,
v1.2.3) or **OpenCV** (Apache-2.0 ✅, 5.1.0). **Ultralytics / YOLO is AGPL-3.0
❌ and banned by rule 10** — written down because it is the first result for
"video face tracking".

Upload client: **tus-js-client** (MIT ✅, v4.3.1, pushed 2026-11-23) or Uppy
(MIT ✅). Supabase Storage implements TUS, so this is the supported path rather
than a clever one.

### 2.3 The ffmpeg build — the Dockerfile's open note, resolved

`services/worker/Dockerfile` deliberately ships no ffmpeg and says why: this
machine's ffmpeg is a **GPL** build, fine to call as a separate binary on a
laptop, and "if the engine is ever shipped inside a container image with ffmpeg
in it, that needs a licence review first (LGPL build, or a decision)". That
moment is now.

| Option | What it is | Licence reality | Verdict |
|---|---|---|---|
| **BtbN `linux64-lgpl`** *(recommend)* | Prebuilt ffmpeg, pinned release | Build scripts MIT; the binary is an **LGPL-2.1+** composite over permissive deps only. Verified in the build scripts: `scripts.d/50-x264.sh` and `50-x265.sh` **return `-1` for `lgpl*` variants**, so no GPL component is compiled in, while `50-libass.sh` (ISC) and `50-openh264.sh` (Cisco, **BSD-2-Clause**) are in the LGPL set. Published assets today: `ffmpeg-n9.0-latest-linux64-lgpl.tar.xz` 137 MB static, `-lgpl-shared` 63 MB. | **Yes.** Pin the `n9.0` tag, never `latest`. Unmodified and invoked as a separate binary — never linked, never vendored — so the Postiz carve-out shape holds, and we additionally ship the LGPL text and a link to the published source. |
| Debian/Ubuntu `apt install ffmpeg` | Distro build | **GPL** (x264/x265 enabled) | Not without a decision. Our code is not a derivative work — we `exec`, we do not link — but the image would convey GPL software and owe a source offer. This is the "or a decision" branch. |
| `eugeneware/ffmpeg-static` (npm) | npm-installed binaries | **GPL-3.0** ❌ | No. Would also fail `pnpm licence-check`. |
| `jrottenberg/ffmpeg` images | Docker images | GPL variants by default | No. |

**The cost of LGPL, stated honestly:** no libx264. H.264 comes from
**libopenh264** (Cisco, BSD-2-Clause). Two consequences:

1. **Quality per bit is worse than x264.** For 20–45 second 1080×1920 shorts at
   8–10 Mbps that is not a visible difference, and every platform re-encodes on
   ingest anyway. If it ever does show, the honest fallback is the GPL build
   plus Vlad's decision — not a quality compromise buried in a filter graph.
2. **AVC patents are a different question from copyright licence.** Cisco's
   royalty coverage attaches to binaries Cisco itself distributes. Our volumes
   sit far below the thresholds where AVC pool licensing bites, and the output
   goes to platforms that are themselves licensed — but it is a patent fact
   rather than a licence fact and belongs in `docs/DECISIONS.md`, not in a
   footnote.

Worth knowing and **not** relying on: ffmpeg 8.0+ has a `whisper` audio filter
built on whisper.cpp, but BtbN's builds disable it (`50-whisper.sh`'s
`ffbuild_enabled` returns `-1`). Transcription stays its own step.

**Gate gap to close in the same pull request:** `scripts/licence-check.mjs`
reads npm dependencies only — no Python dependency and no vendored binary is
covered by any automated check, which PROGRESS note 2 calls "a gap, not a
pass". The pinned ffmpeg tarball and `uv.lock` should be registered with their
licences, or this plan's care evaporates the first time someone bumps a
version.

### 2.4 MCPs and Claude skills

Agent-side helpers only. They carry no licence exposure in the shipped
product — which is exactly why they must not smuggle a dependency in.

| Tool | Use | Note |
|---|---|---|
| `context7` MCP | Supabase Storage/TUS and ffmpeg filter syntax | Already how the Tailwind v4 decision was settled. |
| `browse` / Playwright | the 1440 px and 390 px screenshots CLAUDE.md requires | Existing practice. |
| `everything-claude-code:video-editing` | ffmpeg recipe reference | Read for ideas; `ffmpeg.py` stays the only shell-out. |
| `everything-claude-code:remotion-video-creation` | — | **Avoid.** Would pull Remotion in behind a skill (§2.2). |
| `everything-claude-code:videodb` | — | Third-party SaaS; sends client footage off-platform. No. |
| Higgsfield MCP / skills | generated footage | **AI-GENERATION session's lane.** Not mine. |
| Supabase MCP | preview schema checks, bucket inspection | Already used; production is read-only to me. |

---

## 3. Worker impact

### 3.1 Image size

| Layer | Size |
|---|---|
| `node:24-slim` + pnpm + worker deps (today) | ~250 MB |
| python3 + `uv` + `services/pipeline` (Pillow, numpy) | +150 MB |
| faster-whisper (CTranslate2, onnxruntime, tokenizers) | +350 MB |
| ffmpeg LGPL **shared** build, pinned | +~180 MB extracted |
| Whisper `small` int8 weights, **baked in** | +250 MB |
| **Total** | **≈ 1.2–1.6 GB** |

Railway's image ceiling is 100 GB on Hobby and unlimited on Pro, so size is not
the constraint — build time and cold start are. **Bake the weights** rather
than downloading on boot: a worker that fetches models at start-up fails its
healthcheck whenever Hugging Face is slow, and D128 made that healthcheck
load-bearing. Whisper weights are MIT.

### 3.2 RAM and CPU per minute of video

Estimates, flagged as estimates. The first thing the slice produces is a
measurement that replaces this table.

| Stage | Wall clock per minute of source | Peak RSS |
|---|---|---|
| Download from Storage | ~2 s per 100 MB | negligible |
| `ffprobe` | <1 s | <50 MB |
| Transcribe (`small`, int8, 2 vCPU) | **9–18 s** (0.15–0.3× realtime) | **~1 GB** |
| Beat alignment (pure CPU, in process) | <1 s | <50 MB |
| Caption burn + 9:16 encode | **10–25 s per finished 30–45 s short** | 300–500 MB |
| Upload render + poster | ~1 s | negligible |

A **10-minute source → one finished short ≈ 2–4 minutes wall clock, peak
~1.5 GB**. Recommended service shape: **2 vCPU / 4 GB**, with
`RENDER_TIME_BUDGET_MS` ≈ 8 minutes so transcribe + render + upload sit inside
the 900 s lease with the one-third margin `budget.test.ts` already demands —
and it joins that sum, because a second worker claiming the same render means
two encodes and two bills.

### 3.3 Does video need its own Railway service? Yes

| Reason | Detail |
|---|---|
| Footprint | The scan worker is I/O-bound and idles near 150 MB. Folding video in means paying a 4 GB footprint 24/7 for work that runs occasionally. |
| Blast radius | An OOM during an encode must not kill the process draining the scan queue. Today they would be one process. |
| It is nearly free to do | `claim_job(job_kinds, lease_seconds)` already takes the kinds; `skip locked` already makes two workers safe; `worker_heartbeats.id` already derives from `RAILWAY_SERVICE_NAME`, so a service named `video-worker` gets its own row; `jobs.kind` and `worker_heartbeats.job_kind` **already allow `render-cuts`**. **No migration.** |
| The only code it touches | `CLAIMED_KINDS` becomes per-service config — **one environment variable, and that is all.** This row used to add "and `/api/health/worker` reports *N* rows instead of one"; checked while building, that was already true: the endpoint selects every heartbeat row ordered by `last_seen_at`, and its `ok` is `workers.every(...)`, so a stale video worker beside a healthy scan worker reads as not-ok. D128 built it for this. |

### 3.4 Cost per finished video

Railway's published rates: RAM $0.000231/GB/min, CPU $0.000463/vCPU/min, egress
$0.05/GB, volumes $0.15/GB/month.

| Item | Cost |
|---|---|
| Compute: 4 GB + 2 vCPU for ~5 min | $0.0046 + $0.0046 = **$0.009** |
| Railway egress (render upload, ~15 MB) | $0.0008 |
| Supabase: a 500 MB source + 15 MB render held a month (Pro overage $0.021/GB) | ~$0.011 |
| Model calls | **$0** — the script was paid for by the scan; captions need no model |
| **Marginal cost per finished video** | **≈ $0.01–0.02** |

**~~The number that matters is not the marginal one.~~ Corrected 25 November
2026, and the correction is Vlad's.** This paragraph said a 4 GB / 2 vCPU
service costs $80 a month "whether it renders anything or not". That is wrong:
**Railway bills measured usage, not reserved size.** The rates above are per
GB-minute and per vCPU-minute of what is actually in use, so the sizes set on a
service are a **ceiling**, not a subscription.

What that makes the real figure: between claims this worker holds roughly
150 MB and almost no CPU — one Supabase query every `WORKER_IDLE_POLL_MS` — so
**idle is $1–2 a month**. A render spends the 4 GB and the two cores for the
two to four minutes it runs, which is the $0.01 already counted above. Hobby's
included $5 therefore covers a quiet month and a few hundred videos of a busy
one.

So the settings to put on the service are **replica limits** (2 vCPU, 4 GB) —
there to stop a runaway encode taking the machine, not to buy capacity. The
reason to keep video on its own service is unchanged and was never the money:
an OOM during an encode must not kill the process draining the scan queue.

---

## 4. The thin first slice — demoable in a day

**The demo sentence:** *one approved idea plus one uploaded file becomes one
watchable captioned 9:16 short, in the studio, with its compliance verdict.*

One source, one beat-aligned cut, one render. No batch, no AI scene, no
scheduling.

| # | Piece | Notes |
|---|---|---|
| 1 | Migration: `video_assets`, `transcripts`, `renders`, two private buckets and their policies | **Applied to preview by me.** Production waits for Vlad's label, and the demo does not. |
| 2 | Resumable upload from the studio, direct to Storage | `tus-js-client` + `createSignedUploadUrl`, 6 MB chunks, `*.storage.supabase.co` host. Rights-holder confirmation required before a token is issued. No bytes through Vercel. |
| 3 | `render-cuts` enqueue from an approved draft | `payload = { assetId, draftId }`; refuses when the draft is not `approved`. |
| 4 | The `video-worker` image: pinned LGPL ffmpeg + faster-whisper + the pipeline | Separate Railway service, `/healthz` copied, `CLAIMED_KINDS = ['render-cuts']`. |
| 5 | The handler: download → probe → transcribe → align → `.ass` → 1080×1920 → upload → row | The refusals are first-class: no audio, no beat match, no rights record. |
| 6 | Studio surface | Poster, signed-URL player, compliance verdict and findings, the empty AI-label slot, Approve / Reject with the server-side refusal. |
| 7 | Tests | Unit: beat alignment and the `.ass` writer, both pure. Pipeline: render a 20 s `testsrc2` clip — generated inside the test run, nothing downloaded — and assert 1080×1920, duration, audio present, captions burned. E2E: the studio shows a render and refuses approval without a passing verdict. |
| 8 | Evidence | Screenshots at 1440 px and 390 px, a measured timing table replacing §3.2's estimates, and the demo note in `docs/PROGRESS.md`. |

**Deliberately not in the slice:** AI-generated clips (other session),
face/speaker tracking (centre crop, and the README already says so), intro and
outro templates (Remotion unresolved — §2.2), multi-cut batches, the ops
console, scheduling and publishing.

### Sequencing, given the rules

1. Branch off `feat/video-v5`. The migration is **its own pull request** and is
   the one thing I stop for: it carries a migration *and* touches
   `services/worker`, so it is Vlad's label and Vlad's merge, twice over.
2. Everything else is ordinary work, under ~400 lines a PR, green on `verify`,
   `pipeline` and `e2e` — but **nothing touching `services/worker` is
   auto-merged** per this session's instruction, so those wait for Vlad too.
3. Schema first, then code (D104). The healthcheck will correctly refuse a
   container whose code needs a table production does not have.

---

## 5. What I need from Vlad

| # | Decision | Why it cannot be chosen from the specs |
|---|---|---|
| 1 | **The ffmpeg licence call** — the LGPL build (my recommendation, §2.3) or the GPL build with a recorded compliance position | The Dockerfile explicitly reserves this: "an LGPL build, or a decision". The recommendation is mine; the decision is not. |
| 2 | **Remotion** — buy a company licence, or leave it out | It is in CLAUDE.md's stack and **not** on rule 10's allow-list. §V5 needs no Remotion; intro/outro templates do. My recommendation: leave it out for now. |
| 3 | **Raise the Supabase global file-size limit** — the default is 50 MB; the org is on **Pro**, so up to 500 GB is available | A dashboard setting (Storage → Settings), not a migration. §V5's "a 2 GB upload survives an interrupted connection" is unreachable until it moves. Say the word and I will check whether the Management API can set it on preview. |
| 4 | **The `video-worker` Railway service** — and the ~$40–80/month it costs idle | Creating services and the bill are both yours. |
| 5 | **The `migrate-production` label** on the migration PR, once it exists | Non-negotiable 11. I never add it. |

Not on this list, deliberately: **the generator choice**. That is the
AI-GENERATION session's question, and this plan is built so the answer plugs in
without changing a renderer, a constraint or a screen.

# Wiring engine v0 to the upload screen

Status: **half built.** `apps/web/lib/engine/` exists and compiles; nothing
imports it yet. This file is the design, so the rest can be finished without
rediscovering it.

## The constraint that shapes everything

The engine is a Python CLI that shells out to ffmpeg and writes hundreds of
megabytes of video. A Vercel function has no Python, no ffmpeg, a read-only
file system and a time limit in seconds.

**So this only works against a local `pnpm dev`.** On the preview it must
degrade to the existing four demo states and say why. That is not a
shortcoming to hide; it is the reason `engineAvailability()` is checked on
every request rather than assumed once.

Connecting the two properly needs a job queue and object storage, which the
30-day plan puts in week 3. This is the honest interim.

## Built already

| File | What it does |
|---|---|
| `lib/engine/types.ts` | TypeScript mirror of `summary.json`, plus `parseSummary()` which validates defensively and throws rather than returning a partial summary |
| `lib/engine/jobs.ts` | On-disk job store under `.data/engine-jobs/<id>/`. Paths are rebuilt from a validated id, never joined from input |
| `lib/engine/runner.ts` | `engineAvailability()` probe (uv + ffmpeg + `services/pipeline` present), `writeBrandFile()`, and `runEngine()` which spawns `uv run --no-editable make-samples` with `shell: false` |

### Job directory shape

```
.data/engine-jobs/<id>/
  job.json      { id, state, sourceName, startedAt, finishedAt, error }
  source.mp4    what the browser uploaded
  brand.json    mock brand kit + the uploader's rights confirmation
  samples/      what the engine made, including summary.json
```

`.data/` is already git-ignored. `state` is `queued | running | done | failed`.
Dates are ISO-8601 UTC.

## Decisions already made, with the reasoning

- **Rights are not invented.** `writeBrandFile()` takes a holder and refuses to
  make one up. No rights record means the gate blocks every cut, which is the
  correct outcome under CLAUDE.md non-negotiable 1, and the POST route must
  require an explicit confirmation before it will start a run.
- **Cut files are served by index, never by the path in the summary.** The
  summary's `file` is an absolute path produced on this machine; serving it
  verbatim would let whatever wrote it choose any file on disk. `cutPath()`
  validates an integer and builds the path itself.
- **The brand kit is mock, the rights record is real.** Colours, fonts, caption
  style and word lists come from `@mirrorline/mock` because S9 will own them
  later. The UI must keep saying the brand kit is sample data.
- **`summary.json` names the adapter that answered**, and the UI must surface
  it. A run backed by a script sidecar must never read like a run backed by a
  model.

## What is left

1. **API routes** (`apps/web/app/api/engine/`), following the conventions in
   `app/api/leads/route.ts` (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`,
   explicit validation, never answer ok on a failed write):
   - `GET  /api/engine/status` - availability, so the client can choose live or demo
   - `POST /api/engine/jobs` - multipart video + rights confirmation, returns `{ jobId }`
     immediately and does not await the run
   - `GET  /api/engine/jobs/[jobId]` - state plus summary once it exists
   - `GET  /api/engine/jobs/[jobId]/cuts/[index]` - streams the mp4
2. **A `CutView` view model.** `CutGrid` currently takes the mock `Cut` type.
   The engine's formats ("Hook question", "List") do not fit the mock's
   `FormatTag` union and must not be force-mapped into it. Define `CutView` as
   a structural supertype of mock `Cut` (`format: string`, plus optional
   `videoUrl` and `reasons`), so mock cuts flow in unchanged and engine cuts
   map into it. Touches `upload-panels.tsx` prop types only.
3. **Live mode on S3.** Real upload through the dropzone, poll the job, render
   real cuts with real verdicts, play the real mp4 in the preview dialog. Keep
   the four demo states for when the engine is unavailable, and say which mode
   is showing.
4. **Tests and docs.** Unit tests for `parseSummary` and the cut mapping (pure
   functions, and the repo has no DOM test stack on purpose). An E2E assertion
   that the screen degrades to demo states when the engine is unavailable,
   which is what CI always sees. Then PROGRESS.md and a DECISIONS entry.

## Gates

`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm licence-check`,
plus `pnpm test:e2e`. `licence-check` is in CI but not in the CLAUDE.md
pre-commit list; run it anyway (see D18).

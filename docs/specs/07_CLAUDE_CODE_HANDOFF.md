# 07 · Claude Code handoff

Give Claude Code this whole folder plus the Claude Design or Stitch exports. Start in plan mode, review its plan, then let it build.

## Phase 0 (tomorrow): clickable prototype

A Next.js app with the screens from 03, using the exports for look and 08 for data (hard-coded JSON, no backend). Purpose: sales demos and a base for the real portal. Deployed to a Vercel preview.

## Phase 1 (week 1, alongside): the engine, no UI

A command line and worker that runs: upload → transcribe → find moments → cut → caption → compliance check → render 9:16 files. Purpose: real sample videos for the first prospects.

## Stack

| Part | Choice |
|---|---|
| Web app | Next.js (App Router), TypeScript, Tailwind, shadcn/ui |
| Auth, database, storage | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Billing | Stripe (Pilot one-off; Growth and Scale subscriptions) |
| Hosting | Vercel for the web app; a GPU host (rented) for media workers |
| Jobs | Python workers with a Redis queue (or Supabase queues) |
| Media | ffmpeg, WhisperX, ClipsAI, Remotion (templates and captions) |
| AI generation | Claude API; Wan 2.2 via ComfyUI or a paid video API; FLUX.1 schnell; Kokoro |
| Publishing | Postiz, self-hosted and unmodified, called through its API |
| CI | GitHub Actions: tests, lint, licence allow-list, Claude Code review |

## Reuse from the GenAIUniq drives (not from scratch)

We reuse working plumbing from the two drives, only after the company holds a written IP assignment or licence, and only from a separate copy (the drives stay sealed as evidence). Each reused file records its source path and SHA-256 in `docs/provenance.md`.

| Decision | What |
|---|---|
| Reuse | Rented-GPU job runner (Vast.ai), video-generation calls (Wan via ComfyUI, MiniMax, Kling via fal), cost tracking (expenses.py), dashboard charts for views and link stats, Telegram alerts, test setup |
| Reuse in reverse | check_uniq.py similarity checks (SSCD, pHash, Chromaprint) become the Compliance agent's "too close to source" and near-duplicate blockers |
| Rebuild cleanly | HikerAPI views reader (use official insights APIs), Keitaro click-log copier (use our own link tracking), Windows Task Scheduler jobs (use the queue) |
| Review first | subject_guard.py |
| Never reuse | uniquify.py, camera_mov.py, tt_collect.py, ig_account_dump.py, account registration and warming, iMouse farm control, Instagram app clones, email-alias and proxy tooling, persona face-swap and "Bypass AI Detection" workflows, any key or password file |

Remove every secret found in reused code; never commit one.

## Orchestration

- Video work (transcribe, cut, render, compliance, publish) runs in our own Python job queue, not in n8n or Zapier.
- n8n (self-hosted) handles back-office flows only: Stripe → workspace setup, onboarding emails, report delivery, alerts, CRM. It stays invisible to clients: they never build or configure workflows (licence condition).
- Zapier only for low-volume links in the first weeks.

## Repo layout

```
content-engine/
  CLAUDE.md
  apps/web/              Next.js portal (prototype first, then real)
  services/pipeline/     Python media workers, one folder per agent
  services/publisher/    Postiz client and posting scheduler
  templates/             Remotion brand templates
  prompts/               Prompts for each agent, versioned
  packages/shared/       Types shared by the web app and workers
  docs/specs/            This handoff pack
  .claude/skills/        new-template, new-integration, release
  .github/workflows/     ci.yml, claude.yml, licence-check.yml
```

## Data model (first version)

| Table | Key fields |
|---|---|
| workspaces | id, name, niche, adjacent_niches[], goal, plan, auto_approve |
| brand_kits | workspace_id, logo_url, colors, fonts, tone (3 sliders), words_use[], words_avoid[], caption_style |
| social_accounts | workspace_id, platform, external_id, status, token_ref |
| assets | workspace_id, type (long_video, image, product), url, duration, rights_confirmed_at |
| consents | workspace_id, person_name, kind (voice, likeness), signed_at, document_url |
| trends | niche, format_name, recipe (beats json), growth, fit_score, source_note |
| jobs | workspace_id, agent, input, status, cost_usd, started_at, finished_at, log |
| videos | workspace_id, source_asset_id or trend_id, hook, script, length_s, format_tag, render_url, ai_scenes bool, strength_score |
| compliance_checks | video_id, status (pass, review, blocked), checks json, similarity, reasons[] |
| posts | video_id, account_id, scheduled_at, status, platform_post_id, ai_label bool |
| metrics | post_id, captured_at, views, likes, saves, shares, profile_visits, link_clicks |
| conversions | workspace_id, post_id, kind (lead, call, sale), value_usd, at |
| agent_settings | workspace_id, agent, enabled, monthly_cap_usd, spent_usd |

## CLAUDE.md (put at the repo root)

```markdown
# Mirrorline content engine

## What this is
AI content studio: client's own videos and trending formats become original short videos, posted daily by seven agents to client-owned accounts. Specs in docs/specs/.

## Commands
- Web: `pnpm dev`, `pnpm test`, `pnpm lint` (in apps/web)
- Workers: `uv run pytest`, `uv run ruff check` (in services/pipeline)

## Non-negotiables (never break, never work around)
1. Only client-owned inputs, or footage we hold the rights to. Never download, store or reuse other creators' videos or audio.
2. Viral remakes copy the format only: new script, new footage, new voice.
3. Publish only through official APIs (via Postiz) to accounts the client connected. No device automation, app clones, proxies or fake accounts.
4. AI scenes are always labelled; set the platform AI flag where one exists.
5. No face-swaps. Voice or likeness only with a stored consent record.
6. Every video passes the Compliance agent before it can be scheduled.
7. No secrets in code; use environment variables and GitHub secrets.
8. Code reused from the GenAIUniq drives: only modules on the reuse list in docs/specs/07, with provenance recorded; never anything that evades detection, fakes metadata, collects other creators' videos or automates accounts.
9. New dependencies must pass the licence allow-list (MIT, Apache-2.0, BSD, ISC, MPL-2.0). AGPL tools run only as separate unmodified services. FLUX.1 dev is not allowed.

## Conventions
- Every model and platform behind an adapter in packages/shared or services/pipeline/adapters.
- Every job logs input, output, cost and reason; every agent respects its monthly cap.
- Pull requests under ~400 lines, with tests and a screenshot or demo clip.
```

## First issues (in order)

1. Scaffold the monorepo, CLAUDE.md, CI, licence check and @claude workflow.
2. Prototype: app shell, sidebar, design tokens from 02, light and dark modes.
3. Prototype: S2 Home and S3 Upload and multiply with mock data from 08.
4. Prototype: S4 Trend board and S5 Remake studio.
5. Prototype: S6 Calendar, S7 Results, S8 Agents, then M1 and M2.
6. Engine: upload and transcribe with WhisperX, saving word timestamps.
7. Engine: pick moments with ClipsAI plus Claude hook writing; output 12 candidate cuts.
8. Engine: 9:16 render with burned-in captions from a Remotion brand template.
9. Engine: Compliance v1 (rights flag, near-duplicate check, AI label flag, banned caption phrases).
10. Engine: a CLI command `make-samples <video> <brand.json>` that writes a folder of finished cuts for a sales sample.

## Definition of done (every issue)

Tests pass, lint is clean, licence check passes, preview deploy works, and a screenshot or clip is attached to the pull request.

# The job worker (D119).
#
# ==============================================================================
# Node only, and ffmpeg is deliberately not here yet
# ==============================================================================
#
# The obvious image for "a worker that will also run the B5 video pipeline" is
# Node plus Python plus ffmpeg. **ffmpeg is left out on purpose**, and the
# reason is on record rather than an oversight: `docs/PROGRESS.md` note 4 says
# this machine's ffmpeg is a **GPL build**, invoked as a separate binary, and
# that the arrangement "matches the Postiz carve-out in rule 10 — a service
# alongside us, never linked or vendored". It then names exactly this moment:
#
#   "If the engine is ever shipped inside a container image with ffmpeg in it,
#    that needs a licence review first (LGPL build, or a decision)."
#
# `render-cuts` has no handler, so nothing in this image needs ffmpeg today.
# Baking it in now would cross that line for a capability we are not yet using,
# and bury the decision in a Dockerfile nobody reads twice. It arrives with B5,
# behind the review — as an LGPL build, or as Vlad's decision.
#
# The same goes for Python and `uv`: they are three lines, and they wait for the
# handler that needs them, because an image is also a statement about what we
# ship.
#
# ------------------------------------------------------------------------------
# **Answered, 25 November 2026 — and in the file next door rather than in this
# one.** V5 built the `render-cuts` handler, the review happened, and the answer
# was the pinned **LGPL** build (D137). It lives in `Dockerfile.video`, with
# Python, `uv` and a Whisper model, and runs the same `src/index.ts` with
# `WORKER_KINDS=render-cuts`.
#
# **This image is unchanged, deliberately.** The scan worker stays Node-only at
# ~250 MB: it idles at about 150 MB and would otherwise carry 1.5 GB of
# transcoding stack it never executes, and an OOM during somebody's encode must
# not kill the process draining the scan queue. Two services, one source tree,
# one environment variable between them.
# ------------------------------------------------------------------------------
#
# ==============================================================================
# Why the whole repo is the build context
# ==============================================================================
#
# The worker imports `apps/web/lib/niche-scan/scan.ts` directly, so that a scan
# has exactly one implementation (see `src/index.ts`). That makes the build
# context the workspace rather than this directory — build it from the repo
# root with `-f services/worker/Dockerfile .` — and it is the honest cost of
# not having split the agents into their own package yet.

FROM node:24-slim

# pnpm, from the version the repo pins in `packageManager`, so the lockfile is
# honoured rather than reinterpreted by whatever pnpm the base image carries.
RUN corepack enable

WORKDIR /app

# The manifests first, so a dependency install is cached across source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/mock/package.json packages/mock/
COPY services/worker/package.json services/worker/

# `--frozen-lockfile`: a container that quietly resolved a different tree than
# CI tested is a difference nobody sees until it matters.
RUN pnpm install --frozen-lockfile --filter @mirrorline/worker...

COPY . .

# Not root. Nothing here needs it, and the running container holds the
# service-role key — the one credential in this system that ignores every
# row-level policy we wrote.
USER node

# ==============================================================================
# The health endpoint, and the one Railway setting that makes it matter
# ==============================================================================
#
# `src/health-server.ts` serves `GET /healthz` on `PORT` (8080 by default), and
# answers 200 only once the process has written a heartbeat row to Supabase.
# Set **Healthcheck Path = `/healthz`** on the Railway service; without that
# field this port is just a status page nobody reads.
#
# What it buys is a gate on the most dangerous moment here. There is no build
# step below — `tsx` runs the TypeScript directly — so a type error reaches the
# running container, and since D125 a merge to `main` replaces the process
# holding the production service-role key. With the healthcheck set, a container
# that cannot boot, cannot read its credentials or cannot reach Supabase is
# marked a failed deploy and **the working worker keeps draining the queue**.
#
# It is a deploy gate and not a monitor: Railway "does not monitor the
# healthcheck endpoint after the deployment has gone live". The monitor is
# `worker_heartbeats` and `/api/health/worker` (D128).
EXPOSE 8080

# No build step: `tsx` runs the TypeScript directly, which is also what makes
# the `server-only` alias in tsconfig.json work at runtime.
CMD ["pnpm", "--filter", "@mirrorline/worker", "start"]

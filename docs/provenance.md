# Provenance — what came from the GenAIUniq drives

**Nothing. The register below is empty, and that is the current, correct
state.**

CLAUDE.md non-negotiable 8: "code from the GenAIUniq drives is NOT in this repo
and must not be added until a written IP assignment exists. Then only modules
on the reuse list in `docs/specs/07_CLAUDE_CODE_HANDOFF.md`."

`07` §Reuse requires that "each reused file records its source path and SHA-256
in `docs/provenance.md`". This is that file. It exists before there is anything
to put in it on purpose: a register created at the moment of the first copy is
a register written from memory, and the first entry is the one most likely to
be wrong.

## The register

| Reused file (in this repo) | Source drive | Source path | SHA-256 of the source | Date copied | IP assignment |
|---|---|---|---|---|---|
| _(none)_ | | | | | |

**Count: 0.** Verified against the working tree on 13 November 2026 by
`SWEEP_REPORT.md`, which greps for the banned filenames and for the drive
paths. If this table is empty and the sweep is clean, no drive code is here.

## What stands in for the reused plumbing today

Everything on the reuse list sits behind an adapter with a local
implementation, so the shape of the eventual integration is fixed and the swap
is one file. None of these stubs is drive code, and none is a copy of one.

| Reuse-list item (07) | What is in the repo now | Where |
|---|---|---|
| Rented-GPU job runner (Vast.ai) | A local, in-process job runner with the same job/step/status shape. No GPU, no rented machine, no network call. | `apps/web/lib/engine/runner.ts`, `jobs.ts` |
| Video-generation calls (Wan via ComfyUI, MiniMax, Kling via fal) | Not called. The engine's render step is local. | `services/pipeline/` |
| Cost tracking (`expenses.py`) | Per-step cost on each agent-log line, in the fixtures, with the monthly cap shown on the Agents screen. | `packages/mock/src/data.ts`, `app/app/(studio)/agents` |
| Dashboard charts for views and link stats | Written new, against the 15 §3 KPI model. No chart code was reused. | `apps/web/components/kpi/`, `apps/web/components/studio/` |
| Telegram alerts | Not built. Alerts are on screen only; nothing is sent anywhere. | `apps/web/lib/studio/insights.ts` |
| Test setup | Vitest and Playwright, configured from scratch. | `vitest.config.ts`, `playwright.config.ts` |
| `check_uniq.py` similarity checks, **in reverse** | The Originality Gate's result shape and its blocks-and-rewrites behaviour are specified (04 §Originality Gate) and rendered; the detector behind it is not written. | `apps/web/components/remake/script-evidence.tsx` |

**"In reverse" is the only reuse that matters here, and it is a direction, not
a file.** `check_uniq.py` existed to measure how close a video was to its
source so the predecessor project could perturb it until it slipped under a
detection threshold. The same measurement, pointed the other way, is a gate
that blocks a draft for being too close. We will reimplement it rather than
port it: the thresholds, the logging and the failure behaviour all have to be
the opposite of the original's, and inheriting its code would mean inheriting
its defaults.

## What is never reused, whatever the IP position says

From `07` §Reuse and non-negotiable 8. An IP assignment would make these
legally available and they still do not come in:

`uniquify.py` · `camera_mov.py` · `tt_collect.py` · `ig_account_dump.py` ·
account registration and warming · iMouse farm control · Instagram app clones ·
email-alias and proxy tooling · persona face-swap and "Bypass AI Detection"
workflows · any key or password file.

These are not a licensing problem. They are the behaviour that ended the
previous project, and the point of this one is that we could show any part of
it to a platform, a lawyer or an investor.

## Needs Vlad

- **The written IP assignment or licence.** Until it exists this register stays
  empty and the adapters stay local. It is the single gate on the whole reuse
  list.
- **A sealed copy of the drives**, if reuse goes ahead. `07` §Reuse requires
  working from a separate copy, with the drives themselves kept as evidence.

## How to add an entry

1. Confirm the written assignment covers the file. Record its reference.
2. `shasum -a 256 <source path>` on the sealed copy. Record the digest **before**
   any edit — the digest is of what arrived, not of what it became.
3. Copy the file in, then make the changes it needs as a separate commit, so
   the diff between "what we were given" and "what we run" stays readable.
4. Add the row above. Remove every secret found in the file, and never commit
   one.

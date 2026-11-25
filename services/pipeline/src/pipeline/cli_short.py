"""`render-short` — the worker's entry point into the render leg.

Deliberately thin: argument parsing, three exit codes, and one decision worth
stating.

================================================================================
A refusal is written to `summary.json`, not only printed
================================================================================

`make-samples` prints its problems and the human reading the terminal is the
consumer. Here the consumer is a worker in a container, and the sentence has to
reach a client's screen — so a refusal writes the same `summary.json` a success
writes, with `ok: false` and a `reason`.

The alternative is parsing stderr, which means the worker's error handling
depends on this file's print statements, and a reworded message becomes a
client seeing "the render failed" instead of "the Payoff beat is not in this
footage".

Exit codes, matching `make-samples` so the two are not a pair of conventions:

* `0` — a short was written.
* `1` — nothing could be made, and `summary.json` says why in words.
* `2` — the plan was wrong, which is our bug rather than the client's footage.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .beats import BeatNotFound
from .brand import BrandError
from .ffmpeg import FfmpegError, FfmpegMissing
from .short import PlanError, ShortNotPossible, read_plan, render_short

__all__ = ["main"]


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="render-short",
        description="Cut an approved four-beat script out of one client video.",
    )
    parser.add_argument("plan", help="Path to the plan JSON (see pipeline.short.read_plan)")
    return parser


def _write_refusal(out_dir: Path, reason: str) -> None:
    """The same file a success writes, so the worker has one thing to read."""
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "summary.json").write_text(
            json.dumps({"ok": False, "reason": reason}, indent=2) + "\n", encoding="utf-8"
        )
    except OSError as error:
        # The refusal still travels by exit code and stderr. Worth a line
        # rather than a second exception on top of the first.
        print(f"render-short: could not write the refusal: {error}", file=sys.stderr)


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    plan_path = Path(arguments.plan)

    try:
        plan = read_plan(plan_path)
    except (PlanError, BrandError) as error:
        print(f"render-short: {error}", file=sys.stderr)
        return 2

    try:
        outcome = render_short(plan)
    except (BeatNotFound, ShortNotPossible) as refusal:
        # The client's footage and their script do not meet. Not an error on
        # our side, and the sentence is theirs to act on.
        _write_refusal(plan.out_dir, str(refusal))
        print(f"render-short: {refusal}", file=sys.stderr)
        return 1
    except FfmpegMissing as error:
        print(f"render-short: {error}", file=sys.stderr)
        return 1
    except (FfmpegError, OSError) as error:
        _write_refusal(plan.out_dir, "The video could not be put together.")
        print(f"render-short: {error}", file=sys.stderr)
        return 1

    print(str(outcome.summary_path))
    return 0


if __name__ == "__main__":  # pragma: no cover - module entry point
    raise SystemExit(main())

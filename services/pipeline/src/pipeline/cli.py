"""`make-samples` — one long video in, 8 to 12 captioned 9:16 cuts out.

    make-samples episode-47.mp4 brand.json --out samples/

The whole engine in one readable order: probe, transcribe, find moments,
render, gate, write the summary. Every stage names the adapter that served it,
and `summary.json` carries those names, so a reader can always tell a run
backed by a real model from a run backed by a script someone typed.

Exit codes: 0 when samples were written, 1 when nothing could be, 2 on bad
input. A batch where the gate blocked every cut still exits 0 and still writes
the summary — the engine worked, and the answer is in the file.
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .adapters.base import AdapterUnavailable, CaptionBurner, MomentFinder, Transcriber
from .adapters.transcribe import resolve_transcriber
from .brand import Brand, BrandError, load_brand
from .compliance.rules import check_cuts
from .ffmpeg import FfmpegError, FfmpegMissing, ffmpeg_available, probe
from .models import AdapterReport, ComplianceResult, Cut
from .multiplier.captions import PillowCaptionBurner
from .multiplier.moments import HeuristicMomentFinder
from .multiplier.render import render_cuts

__all__ = ["build_summary", "main"]

WANTED_CUTS = 12
"""Ask for twelve; the plan's promise is "8-12", and short sources give fewer."""

_EXIT_OK = 0
_EXIT_NOTHING_MADE = 1
_EXIT_BAD_INPUT = 2


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="make-samples",
        description="Turn one client video into 8-12 captioned 9:16 samples.",
    )
    parser.add_argument("video", type=Path, help="the client's own long video")
    parser.add_argument("brand", type=Path, help="brand.json for this client")
    parser.add_argument(
        "--out", type=Path, default=Path("samples"), help="where the cuts go (default: samples/)"
    )
    parser.add_argument(
        "--cuts",
        type=int,
        default=WANTED_CUTS,
        help=f"how many to aim for (default: {WANTED_CUTS})",
    )
    parser.add_argument(
        "--transcriber",
        default=None,
        help="pin one: whisperx, faster-whisper, script-sidecar (default: best available)",
    )
    parser.add_argument(
        "--use-claude",
        action="store_true",
        help="let Claude pick the moments. OFF by default: this spends money.",
    )
    parser.add_argument(
        "--max-spend-usd",
        type=float,
        default=0.0,
        help="hard cap for --use-claude. Zero means the Claude finder refuses to run.",
    )
    return parser


def _moment_finder(use_claude: bool, max_spend_usd: float) -> MomentFinder:
    """The heuristic finder unless Claude was asked for, by name, with a cap.

    The import sits inside the branch on purpose: with the flag off, the
    module that can spend money is never even loaded.
    """
    if not use_claude:
        return HeuristicMomentFinder()

    from .multiplier.claude_moments import ClaudeMomentFinder

    return ClaudeMomentFinder(max_spend_usd=max_spend_usd)


def build_summary(
    source: Path,
    brand: Brand,
    cuts: tuple[Cut, ...],
    verdicts: dict[int, ComplianceResult],
    adapters: AdapterReport,
    use_claude: bool,
    generated_at: datetime,
) -> dict:
    """The JSON a salesperson or a reviewer reads.

    Figures only. No adjectives, no "optimised", nothing the code cannot show.
    """
    holder = brand.rights.holder if brand.rights else None
    return {
        "generatedAt": generated_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": {"file": str(source), "rightsHolder": holder},
        "brand": {"logoLabel": brand.logo_label, "captionStyle": brand.caption_style},
        "adapters": {
            "transcriber": adapters.transcriber,
            "momentFinder": adapters.moment_finder,
            "captionBurner": adapters.caption_burner,
            "notes": list(adapters.notes),
        },
        "flags": {"useClaude": use_claude},
        "counts": {
            "cuts": len(cuts),
            "pass": sum(1 for v in verdicts.values() if v.status == "pass"),
            "needsReview": sum(1 for v in verdicts.values() if v.status == "needs-review"),
            "blocked": sum(1 for v in verdicts.values() if v.status == "blocked"),
        },
        "cuts": [
            {
                "index": cut.index,
                "hook": cut.moment.hook,
                "format": cut.moment.format,
                "lengthLabel": cut.length_label,
                "lengthSeconds": round(cut.moment.duration_s, 2),
                "score": cut.moment.score,
                "reasons": list(cut.moment.reasons),
                "sourceWindow": {
                    "startSeconds": round(cut.moment.start_s, 2),
                    "endSeconds": round(cut.moment.end_s, 2),
                },
                "hasAiScenes": cut.has_ai_scenes,
                "compliance": {
                    "status": verdicts[cut.index].status,
                    "findings": [
                        {"rule": f.rule, "status": f.status, "message": f.message}
                        for f in verdicts[cut.index].findings
                    ],
                },
                "file": cut.video_path,
            }
            for cut in cuts
        ],
    }


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)

    if not args.video.exists():
        print(f"make-samples: no video at {args.video}", file=sys.stderr)
        return _EXIT_BAD_INPUT
    if not ffmpeg_available():
        print("make-samples: ffmpeg and ffprobe must be on PATH", file=sys.stderr)
        return _EXIT_BAD_INPUT

    try:
        brand = load_brand(args.brand)
    except BrandError as error:
        print(f"make-samples: {error}", file=sys.stderr)
        return _EXIT_BAD_INPUT

    try:
        source_probe = probe(args.video)
    except (FfmpegError, FfmpegMissing) as error:
        print(f"make-samples: cannot read {args.video}: {error}", file=sys.stderr)
        return _EXIT_BAD_INPUT

    try:
        transcriber: Transcriber = resolve_transcriber(
            args.transcriber, duration_s=source_probe.duration_s
        )
        transcript = transcriber.transcribe(args.video)
    except (AdapterUnavailable, ValueError) as error:
        print(f"make-samples: {error}", file=sys.stderr)
        return _EXIT_BAD_INPUT

    if not transcript.words:
        print("make-samples: the transcript came back empty; nothing to cut", file=sys.stderr)
        return _EXIT_NOTHING_MADE

    try:
        finder = _moment_finder(args.use_claude, args.max_spend_usd)
        moments = finder.find(transcript, brand, args.cuts)
    except (AdapterUnavailable, ValueError) as error:
        print(f"make-samples: {error}", file=sys.stderr)
        return _EXIT_BAD_INPUT

    if not moments:
        print(
            "make-samples: found no window between 18 and 45 seconds that ends cleanly. "
            "A longer source, or one with clearer sentence breaks, gives more.",
            file=sys.stderr,
        )
        return _EXIT_NOTHING_MADE

    try:
        burner = PillowCaptionBurner(brand)
    except AdapterUnavailable as error:
        print(f"make-samples: captions cannot be drawn: {error}", file=sys.stderr)
        return _EXIT_BAD_INPUT
    notes = [f"captions drawn with {burner.font_path.name}"]

    with tempfile.TemporaryDirectory(prefix="mirrorline-captions-") as workspace:
        outcome = render_cuts(
            source=args.video,
            moments=moments,
            transcript=transcript,
            brand=brand,
            out_dir=args.out,
            burner=burner,
            workspace=Path(workspace),
        )

    for failure in outcome.failures:
        print(f"make-samples: {failure}", file=sys.stderr)

    if not outcome.cuts:
        print("make-samples: every cut failed to render; nothing written", file=sys.stderr)
        return _EXIT_NOTHING_MADE

    verdicts = check_cuts(outcome.cuts, brand)
    summary = build_summary(
        source=args.video,
        brand=brand,
        cuts=outcome.cuts,
        verdicts=verdicts,
        adapters=AdapterReport(
            transcriber=transcript.source,
            moment_finder=finder.name,
            caption_burner=burner.name,
            notes=tuple(notes),
        ),
        use_claude=args.use_claude,
        generated_at=datetime.now(timezone.utc),
    )

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    counts = summary["counts"]
    print(
        f"{counts['cuts']} cuts in {args.out}/ — "
        f"{counts['pass']} pass, {counts['needsReview']} need review, "
        f"{counts['blocked']} blocked"
    )
    return _EXIT_OK


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

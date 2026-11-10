"""Turning moments into files.

One step, kept out of the CLI so it can be tested without argument parsing:
for each moment, take the words inside it, group them into caption lines, draw
those lines, and hand the whole lot to ffmpeg as a single cut-reframe-composite
encode.

A cut that fails to render does not stop the batch. Eleven good samples plus a
named failure is a better morning than nothing at all, so the error is
collected and reported, and the cut is absent from `summary.json` rather than
present and broken.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..adapters.base import CaptionBurner
from ..brand import Brand
from ..ffmpeg import FfmpegError, cut_vertical
from ..models import Cut, Moment, Transcript
from .captions import caption_lines

__all__ = ["RenderOutcome", "render_cuts"]


@dataclass(frozen=True, slots=True)
class RenderOutcome:
    """What came out of a render pass: the cuts, and what went wrong."""

    cuts: tuple[Cut, ...]
    failures: tuple[str, ...]


def render_cuts(
    source: Path,
    moments: tuple[Moment, ...],
    transcript: Transcript,
    brand: Brand,
    out_dir: Path,
    burner: CaptionBurner,
    workspace: Path,
) -> RenderOutcome:
    """Render every moment to a captioned 9:16 MP4."""
    out_dir.mkdir(parents=True, exist_ok=True)
    workspace.mkdir(parents=True, exist_ok=True)

    cuts: list[Cut] = []
    failures: list[str] = []

    for position, moment in enumerate(moments, start=1):
        words = transcript.words_between(moment.start_s, moment.end_s)
        lines = caption_lines(words, offset_s=moment.start_s, highlight_words=brand.words_always)

        destination = out_dir / f"cut-{position:02d}.mp4"
        try:
            overlays = burner.draw(lines, brand, workspace / f"cut-{position:02d}")
            cut_vertical(
                source=source,
                destination=destination,
                start_s=moment.start_s,
                duration_s=moment.duration_s,
                overlays=overlays,
            )
        except (FfmpegError, OSError) as error:
            failures.append(f"cut {position} ({moment.hook[:40]}): {error}")
            continue

        cuts.append(
            Cut(
                index=position,
                moment=moment,
                caption_lines=lines,
                # v0 generates no footage, so no cut carries an AI scene yet.
                # The flag stays in the model and the gate stays wired, so the
                # day B-roll arrives the label is already required.
                has_ai_scenes=False,
                ai_label_applied=False,
                video_path=str(destination),
            )
        )

    return RenderOutcome(cuts=tuple(cuts), failures=tuple(failures))

"""The interfaces every swappable thing implements.

04_AGENTS_SPEC.md, shared rules: "Every model and platform sits behind an
adapter interface, so it can be swapped." These are those interfaces. They are
`Protocol`s rather than base classes so an implementation never has to import
the engine to satisfy one — a replacement can be written in isolation and
passed in.

An adapter that cannot run says so by raising `AdapterUnavailable` from its
constructor, not by returning something plausible. The caller then falls back
or stops, and either way the summary records which implementation answered.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable

from ..brand import Brand
from ..models import CaptionLine, Moment, Transcript

__all__ = [
    "AdapterUnavailable",
    "CaptionBurner",
    "MomentFinder",
    "Transcriber",
]


class AdapterUnavailable(RuntimeError):
    """This implementation cannot run here: no model, no key, no binary.

    Never raised to mean "the input was bad" — that is a ValueError. This one
    means the machine is missing something, which is a different decision for
    the caller.
    """


@runtime_checkable
class Transcriber(Protocol):
    """Audio in, words with timings out."""

    name: str

    def transcribe(self, video_path: Path) -> Transcript:
        """Words in order, with start and end seconds against the source."""
        ...


@runtime_checkable
class MomentFinder(Protocol):
    """A transcript in, the windows worth cutting out."""

    name: str

    def find(self, transcript: Transcript, brand: Brand, wanted: int) -> tuple[Moment, ...]:
        """Up to `wanted` moments, best first.

        Returning fewer than `wanted` is allowed and honest: a short source has
        fewer good moments in it, and padding the list with weak windows would
        make the count true and the samples worse.
        """
        ...


@runtime_checkable
class CaptionBurner(Protocol):
    """Caption lines into pictures the renderer can composite."""

    name: str

    def draw(
        self, lines: tuple[CaptionLine, ...], brand: Brand, into: Path
    ) -> tuple[tuple[Path, float, float], ...]:
        """One PNG per line, returned as (path, start, end) in cut-local time."""
        ...

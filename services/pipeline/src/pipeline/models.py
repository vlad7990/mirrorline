"""The shapes that move through the engine.

Every one of these is frozen. A cut is never edited in place: a stage takes a
cut and returns a new one, so a half-applied change cannot exist and the
summary can always be rebuilt from the same inputs.

The field names here are the ones that reach `summary.json`, which is the file
a salesperson or a reviewer actually reads, so they match the studio's
vocabulary: hook, format, length, score, compliance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

__all__ = [
    "AdapterReport",
    "CaptionLine",
    "ComplianceResult",
    "ComplianceStatus",
    "Cut",
    "Finding",
    "Moment",
    "Transcript",
    "Word",
    "length_label",
]

ComplianceStatus = Literal["pass", "needs-review", "blocked"]
"""The three the studio already shows on a StatusChip. No fourth state."""


def length_label(seconds: float) -> str:
    """`38.4` becomes `"0:38"`. The studio prints timings in the mono voice."""
    whole = int(round(seconds))
    return f"{whole // 60}:{whole % 60:02d}"


@dataclass(frozen=True, slots=True)
class Word:
    """One spoken word with its place in the source audio."""

    text: str
    start_s: float
    end_s: float


@dataclass(frozen=True, slots=True)
class Transcript:
    """What a transcriber returned, plus which transcriber it was.

    `source` is carried all the way to `summary.json` on purpose. A run backed
    by the offline stub must never be mistaken for a run backed by a real
    model, so the file says which one spoke.
    """

    words: tuple[Word, ...]
    duration_s: float
    source: str

    @property
    def text(self) -> str:
        return " ".join(word.text for word in self.words)

    def words_between(self, start_s: float, end_s: float) -> tuple[Word, ...]:
        """Words whose middle falls inside the window.

        The midpoint, not the start: a word straddling the boundary belongs to
        the cut that contains most of it, so a caption never opens or closes on
        half a word.
        """
        return tuple(
            word for word in self.words if start_s <= (word.start_s + word.end_s) / 2 < end_s
        )


@dataclass(frozen=True, slots=True)
class Moment:
    """A window of the source worth cutting, and why the engine thinks so."""

    start_s: float
    end_s: float
    hook: str
    format: str
    score: int
    reasons: tuple[str, ...] = ()

    @property
    def duration_s(self) -> float:
        return self.end_s - self.start_s


@dataclass(frozen=True, slots=True)
class CaptionLine:
    """One line of burned-in caption, with the phrase to highlight.

    `highlight` is a substring of `text` or None. DESIGN.md's "Bold highlight"
    caption style paints it on the brand's highlight colour; the other styles
    ignore it.
    """

    text: str
    start_s: float
    end_s: float
    highlight: str | None = None


@dataclass(frozen=True, slots=True)
class Finding:
    """One compliance rule's verdict on one cut."""

    rule: str
    status: ComplianceStatus
    message: str


@dataclass(frozen=True, slots=True)
class ComplianceResult:
    """Every finding for a cut, plus the worst of them.

    Worst wins: one blocked rule blocks the cut, whatever the others say.
    CLAUDE.md non-negotiable 6 makes this gate the thing scheduling depends on,
    so it never averages its way to a pass.
    """

    findings: tuple[Finding, ...]

    @property
    def status(self) -> ComplianceStatus:
        if any(finding.status == "blocked" for finding in self.findings):
            return "blocked"
        if any(finding.status == "needs-review" for finding in self.findings):
            return "needs-review"
        return "pass"

    @property
    def reasons(self) -> tuple[str, ...]:
        """Why a cut is not a pass. A passing cut has nothing to explain."""
        return tuple(
            finding.message for finding in self.findings if finding.status != "pass"
        )


@dataclass(frozen=True, slots=True)
class Cut:
    """A rendered 9:16 sample, or one about to be rendered."""

    index: int
    moment: Moment
    caption_lines: tuple[CaptionLine, ...]
    has_ai_scenes: bool = False
    ai_label_applied: bool = False
    video_path: str | None = None

    @property
    def caption_text(self) -> str:
        return " ".join(line.text for line in self.caption_lines)

    @property
    def length_label(self) -> str:
        return length_label(self.moment.duration_s)


@dataclass(frozen=True, slots=True)
class AdapterReport:
    """Which implementation actually ran, for the summary's honesty section."""

    transcriber: str
    moment_finder: str
    caption_burner: str
    notes: tuple[str, ...] = field(default_factory=tuple)

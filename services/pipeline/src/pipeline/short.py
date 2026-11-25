"""One approved script plus one upload becomes one captioned 9:16 short.

This is the V5 render leg: the entry point the worker shells out to, exactly as
`make-samples` is shelled out to today. It takes a plan as JSON on disk, writes
the finished files beside it, and writes `summary.json` saying what it did.

================================================================================
Why a plan file rather than flags
================================================================================

The worker already holds everything: the source path, the approved beats, the
words from `transcripts`, the brand kit. Passing that as command-line arguments
would mean quoting four paragraphs of a client's own script through a shell, and
`--beat "Hook:..." --beat "Setup:..."` is a bespoke serialisation format with no
tests. A JSON file is one `json.load`, is readable when a render goes wrong, and
is what `brand.json` already established in this codebase.

================================================================================
What it refuses to do
================================================================================

* **It does not invent words.** No transcript in the plan, no render — the rule
  `README.md` already states for the sample engine, for the same reason: a
  made-up transcript becomes a made-up caption on a client's own face.
* **It does not approximate a beat.** `beats.align_beats` raises
  `BeatNotFound`, which arrives here as exit code 1 and a sentence, and the
  client is told which beat is missing from their footage.
* **It does not pass its own compliance.** `check_cuts` decides, the verdict
  goes in `summary.json`, and the database refuses to let an unpassed render be
  approved. A gate the renderer could overrule is not a gate.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .beats import Beat, BeatNotFound, align_beats
from .brand import Brand, parse_brand
from .compliance import check_cuts
from .ffmpeg import (
    FfmpegError,
    burn_poster,
    font_families,
    has_filter,
    pick_h264_encoder,
    probe,
    render_segments,
)
from .models import CaptionLine, Cut, Moment, Transcript, Word
from .multiplier.ass_captions import AssStyle, TextOverlay, ass_document, pick_font_family
from .multiplier.captions import caption_lines

__all__ = [
    "PlanError",
    "RenderEnvironmentError",
    "RenderPlan",
    "ShortNotPossible",
    "ShortOutcome",
    "check_environment",
    "read_plan",
    "render_short",
]

MIN_SHORT_SECONDS = 12.0
MAX_SHORT_SECONDS = 90.0
"""The same two numbers `apps/web/lib/video/types.ts` holds, and they have to
agree: the studio promises a short of this length and this file is what makes
one. Duplicated across a language boundary rather than imported, which is a cost
— `test_short.py` asserts the pair so the copy cannot drift silently."""

HOOK_OVERLAY_SECONDS = 4.0
"""How long the hook line sits over the top of the video.

Long enough to read a sentence, short enough to be gone before the Hook beat
ends. It is the one text overlay slice 1 draws: a label per beat was the other
candidate and reads as a lecture rather than as a video."""


class PlanError(ValueError):
    """The plan file is not a plan. Exit code 2 — the caller got it wrong."""


class RenderEnvironmentError(Exception):
    """This ffmpeg cannot make the video, and no footage would change that.

    Separate from every other failure here because the audience is different.
    `BeatNotFound` is for the client — film that line. This is for whoever is
    running the engine: the binary on this machine is missing a filter or an
    encoder, and the sentence has to say which and what to do about it.

    It exists because the alternative is a 900-line ffmpeg stderr tail. The
    Homebrew ffmpeg on the machine this was written on has **no libass**
    (docs/DECISIONS.md D16), so `-vf ass=` fails there with a filter-not-found
    error buried in a wall of configuration flags — and the first person to
    meet that would reasonably conclude the pipeline was broken rather than
    their ffmpeg.
    """


class ShortNotPossible(Exception):
    """The footage and the script cannot make a short, and here is why.

    Separate from `BeatNotFound` because the cause is different in kind: every
    beat was found, and the windows they landed in are together too short to be
    a video. The client's action is different too — film the beats at more
    length rather than film a missing one — so it gets its own sentence.
    """


@dataclass(frozen=True, slots=True)
class RenderPlan:
    source: Path
    out_dir: Path
    title: str
    hook: str
    beats: tuple[Beat, ...]
    words: tuple[Word, ...]
    brand: Brand


@dataclass(frozen=True, slots=True)
class ShortOutcome:
    short_path: Path
    poster_path: Path
    captions_path: Path
    summary_path: Path
    duration_s: float


def _require(raw: dict, key: str) -> object:
    if key not in raw:
        raise PlanError(f"the plan has no {key!r}")
    return raw[key]


def read_plan(path: str | Path) -> RenderPlan:
    """Load and validate a plan. Every failure names the field."""
    plan_path = Path(path)
    try:
        raw = json.loads(plan_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PlanError(f"{plan_path} could not be read as JSON: {error}") from error

    if not isinstance(raw, dict):
        raise PlanError("the plan must be a JSON object")

    source = Path(str(_require(raw, "source")))
    if not source.exists():
        raise PlanError(f"the source {source} does not exist")

    beats_raw = _require(raw, "beats")
    if not isinstance(beats_raw, list) or not beats_raw:
        raise PlanError("the plan needs at least one beat")

    beats: list[Beat] = []
    for entry in beats_raw:
        if not isinstance(entry, dict):
            raise PlanError("each beat must be an object with a label and text")
        label = str(entry.get("label", "")).strip()
        text = str(entry.get("text", "")).strip()
        if not label or not text:
            raise PlanError("each beat needs both a label and text")
        beats.append(Beat(label=label, text=text))

    words_raw = _require(raw, "words")
    if not isinstance(words_raw, list) or not words_raw:
        # Nothing in this engine invents words. A plan with no transcript is a
        # plan to caption a guess.
        raise PlanError("the plan has no transcript words, and nothing here invents them")

    words: list[Word] = []
    for entry in words_raw:
        if not isinstance(entry, dict):
            raise PlanError("each word must be an object with text, start and end")
        try:
            words.append(
                Word(
                    text=str(entry["text"]),
                    start_s=float(entry["start"]),
                    end_s=float(entry["end"]),
                )
            )
        except (KeyError, TypeError, ValueError) as error:
            raise PlanError(f"a word is missing text, start or end: {error}") from error

    brand_raw = _require(raw, "brand")
    if not isinstance(brand_raw, dict):
        raise PlanError("the plan's brand must be an object")

    return RenderPlan(
        source=source,
        out_dir=Path(str(raw.get("out") or plan_path.parent / "out")),
        title=str(raw.get("title") or "Untitled"),
        hook=str(raw.get("hook") or ""),
        beats=tuple(beats),
        words=tuple(words),
        brand=parse_brand(brand_raw),
    )


def _style_for(brand: Brand, family: str) -> AssStyle:
    """The caption's look, from the brand kit's own colours.

    The brand's first colour is its primary, so the *highlight* is taken from
    the last one — which is how `examples/brand.sample.json` is ordered (deep
    teal first, coral third) and how the Brand kit screen presents them. Text
    stays white: a caption in the brand's dark primary over somebody's dark
    living room is unreadable, and burned-in text cannot be re-themed later.
    """
    highlight = brand.colours[-1].hex if brand.colours else "#FF5A36"
    return AssStyle(font_family=family, highlight_hex=highlight)


def _captions_for(
    transcript: Transcript,
    segments: tuple,
    highlight_words: tuple[str, ...],
) -> tuple[tuple[CaptionLine, ...], float]:
    """Caption lines on the **output** timeline, and the short's duration.

    The subtlety worth naming: each segment's words carry source timestamps, and
    the finished video is the segments joined end to end. So a line's time is
    `word.start - segment.start + output_start`, and `caption_lines` already
    subtracts an offset — pass it `segment.start - output_start` and it does the
    arithmetic in one place rather than in two.
    """
    lines: list[CaptionLine] = []
    output_start = 0.0

    for segment in segments:
        words = transcript.words_between(segment.start_s, segment.end_s)
        lines.extend(
            caption_lines(
                words,
                offset_s=segment.start_s - output_start,
                highlight_words=highlight_words,
            )
        )
        output_start += segment.duration_s

    return (tuple(lines), output_start)


def check_environment() -> None:
    """Can this ffmpeg do the two things a captioned short needs?

    Asked **before** any work, because both answers are cheap and the failure
    is otherwise expensive: transcription is the slow leg, and discovering a
    missing filter after twenty minutes of it is twenty minutes nobody gets
    back.
    """
    if not has_filter("ass"):
        raise RenderEnvironmentError(
            "this ffmpeg has no `ass` filter, so captions cannot be burned. "
            "The worker image ships a build that has it; on macOS, "
            "`brew upgrade ffmpeg` (or `brew install ffmpeg`) brings libass. "
            "Check with: ffmpeg -hide_banner -filters | grep ' ass '"
        )

    try:
        pick_h264_encoder()
    except FfmpegError as error:
        raise RenderEnvironmentError(str(error)) from error


def render_short(plan: RenderPlan) -> ShortOutcome:
    """Align, caption, encode, and write the summary. Raises on refusal."""
    check_environment()
    plan.out_dir.mkdir(parents=True, exist_ok=True)

    source_probe = probe(plan.source)
    transcript = Transcript(words=plan.words, duration_s=source_probe.duration_s, source="supplied")

    # Raises BeatNotFound, which the CLI turns into exit 1 and a sentence. No
    # encoding has happened yet, so a refusal costs nothing but the alignment.
    segments = align_beats(list(plan.beats), [(w.text, w.start_s, w.end_s) for w in plan.words])

    lines, duration_s = _captions_for(transcript, segments, plan.brand.words_always)

    if duration_s < MIN_SHORT_SECONDS:
        raise ShortNotPossible(
            f"these four beats are only {duration_s:.0f}s of footage together, and a short "
            f"needs {MIN_SHORT_SECONDS:.0f}s. Film the beats at a little more length."
        )
    if duration_s > MAX_SHORT_SECONDS:
        # Unreachable while MAX_BEAT_SECONDS * 4 < MAX_SHORT_SECONDS, and
        # asserted rather than assumed: a fifth beat or a longer per-beat cap
        # would make it reachable, and a 2-minute "short" is rejected on ingest.
        raise PlanError(
            f"these beats add up to {duration_s:.0f}s, past the {MAX_SHORT_SECONDS:.0f}s a short can be"
        )

    family, is_brand_font = pick_font_family(plan.brand.heading_font, font_families())
    style = _style_for(plan.brand, family)

    overlays: tuple[TextOverlay, ...] = ()
    if plan.hook.strip():
        hook_seconds = min(HOOK_OVERLAY_SECONDS, segments[0].duration_s)
        overlays = (TextOverlay(text=plan.hook.strip(), start_s=0.0, end_s=hook_seconds),)

    captions_path = plan.out_dir / "captions.ass"
    captions_path.write_text(ass_document(lines, style, overlays), encoding="utf-8")

    encoder = pick_h264_encoder()
    short_path = render_segments(
        plan.source,
        plan.out_dir / "short.mp4",
        tuple((segment.start_s, segment.end_s) for segment in segments),
        ass_path=captions_path,
        with_audio=source_probe.has_audio,
        encoder=encoder,
    )
    poster_path = burn_poster(short_path, plan.out_dir / "poster.jpg")

    # The compliance gate, with the renderer's own output as the cut. `Moment`
    # describes the whole short rather than one window, because that is what the
    # client receives and what the near-duplicate rule should compare.
    cut = Cut(
        index=0,
        moment=Moment(
            start_s=0.0,
            end_s=duration_s,
            hook=plan.hook or plan.title,
            format="beat-script",
            score=0,
            reasons=tuple(
                f"{segment.beat}: {round(segment.coverage * 100)}% of the beat's words"
                for segment in segments
            ),
        ),
        caption_lines=lines,
        # Slice 1 generates nothing, so there is no AI scene and no label. The
        # slot is `aiScenes` in the summary and the `Segment` union in
        # `apps/web/lib/video/segment.ts`; when the generation session fills it,
        # these two flags are what the `ai-label` rule reads.
        has_ai_scenes=False,
        ai_label_applied=False,
        video_path=str(short_path),
    )
    verdict = check_cuts((cut,), plan.brand)[0]

    finished = probe(short_path)

    summary = {
        "ok": True,
        "title": plan.title,
        "short": str(short_path),
        "poster": str(poster_path),
        "captions": str(captions_path),
        "durationS": round(finished.duration_s, 3),
        "bytes": short_path.stat().st_size,
        "width": finished.width,
        "height": finished.height,
        # The worker turns these into `Segment`s — it adds the asset id, which
        # is the one field this process has no business knowing.
        "segments": [
            {
                "beat": segment.beat,
                "startS": segment.start_s,
                "endS": segment.end_s,
                "text": segment.text,
                "coverage": segment.coverage,
            }
            for segment in segments
        ],
        # `renders.ai_scenes`, and it is `[]` because slice 1 generates nothing.
        "aiScenes": [],
        "compliance": {
            # The engine says `pass`; the database's constraint and
            # `approve_render` both read `passed`. Mapped here, in one place,
            # rather than teaching either side the other's vocabulary.
            "verdict": "passed" if verdict.status == "pass" else verdict.status,
            "findings": list(verdict.reasons),
        },
        "encoder": {"name": encoder.name, "isLgpl": encoder.is_lgpl},
        "font": {"family": family, "isBrandFont": is_brand_font},
    }

    summary_path = plan.out_dir / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    return ShortOutcome(
        short_path=short_path,
        poster_path=poster_path,
        captions_path=captions_path,
        summary_path=summary_path,
        duration_s=finished.duration_s,
    )

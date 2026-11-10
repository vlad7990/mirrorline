"""Fixtures. Every byte of test footage is generated here, by us.

CLAUDE.md non-negotiable 1 is the reason this file exists in the shape it
does: the engine is never pointed at somebody else's video, not even once, not
even in a test. `source_video` is an ffmpeg test pattern with a silent track,
made on the spot and thrown away afterwards.

The words come from `SENTENCES` below, written for this repo, and are handed to
the engine as a `.transcript.json` sidecar. That keeps the tests deterministic
and keeps a 2GB Whisper model out of CI.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.brand import load_brand
from pipeline.ffmpeg import ffmpeg_available, make_test_clip
from pipeline.models import Transcript, Word

# Twenty distinct sentences, each one its own topic so the near-duplicate rule
# has something honest to measure. Several carry the brand's `wordsAlways`,
# three open on a question, one carries a figure.
SENTENCES: tuple[str, ...] = (
    "Burnout is not a workload problem for most first-time managers.",
    "What happens when you give a new manager a team and no script?",
    "The reframe I use starts with naming the one decision nobody owns.",
    "Your calendar is a claim about what matters to you this week.",
    "How do you run a 1:1 that is not a status update in disguise?",
    "Three questions turn a status update into an actual conversation.",
    "People do not leave jobs because the work got harder than before.",
    "A promise you cannot keep is more expensive than a no you can.",
    "Why does feedback land badly even when every word of it is true?",
    "The quiet part of leadership is deciding what you will not fix.",
    "Energy is a budget, and most new managers spend it before noon.",
    "Delegation fails when the handover skips the reason behind the task.",
    "I ask every coaching client to show me their last rejected request.",
    "Trust is built in the small moments nobody writes down anywhere.",
    "A team that cannot disagree in the room will disagree in private.",
    "Burnout recovery starts by removing one commitment, not by adding rest.",
    "The first ninety days decide which version of the manager you become.",
    "Clarity is kinder than optimism when a deadline is already gone.",
    "Your best people are asking for direction, not for more autonomy.",
    "Every reframe I teach fits on one index card by design and on purpose.",
)

SENTENCE_SECONDS = 13.0
"""Each sentence spans this long, so a 2-3 sentence window lands in 18-45s."""

SENTENCE_GAP_SECONDS = 0.8
"""Longer than the 0.6s pause that `split_sentences` treats as a boundary."""

BRAND_JSON = {
    "logoLabel": "Maya Torres Coaching",
    "colors": [
        {"id": "deep-teal", "name": "Deep teal", "hex": "#12545A"},
        {"id": "warm-sand", "name": "Warm sand", "hex": "#F3E9DC"},
        {"id": "coral", "name": "Coral", "hex": "#FF5A36"},
    ],
    "headingFont": "Inter Tight",
    "bodyFont": "Inter",
    "captionStyle": "bold-highlight",
    "wordsAlways": ["first-time managers", "burnout", "reframe", "1:1"],
    "wordsNever": ["hustle", "crush it", "guaranteed"],
    "rights": {
        "holder": "Maya Torres Coaching",
        "recordId": "consent-rights-episode-47",
        "signedOn": "2026-11-09",
    },
}

needs_ffmpeg = pytest.mark.skipif(not ffmpeg_available(), reason="ffmpeg is not on PATH")


def build_transcript(sentences: tuple[str, ...] = SENTENCES) -> Transcript:
    """Words with timings, spread evenly inside each sentence's own window."""
    words: list[Word] = []
    clock = 0.0

    for sentence in sentences:
        tokens = sentence.split()
        per_word = SENTENCE_SECONDS / len(tokens)
        for position, token in enumerate(tokens):
            start = clock + position * per_word
            words.append(Word(text=token, start_s=start, end_s=start + per_word * 0.9))
        clock += SENTENCE_SECONDS + SENTENCE_GAP_SECONDS

    return Transcript(words=tuple(words), duration_s=clock, source="fixture")


@pytest.fixture(scope="session")
def transcript() -> Transcript:
    return build_transcript()


@pytest.fixture(scope="session")
def clip_seconds(transcript: Transcript) -> int:
    """Long enough to hold every window the finder can propose."""
    return int(transcript.duration_s) + 2


@pytest.fixture(scope="session")
def source_video(tmp_path_factory: pytest.TempPathFactory, clip_seconds: int) -> Path:
    """Our own test footage: a test pattern and silence, nothing downloaded."""
    if not ffmpeg_available():
        pytest.skip("ffmpeg is not on PATH")
    directory = tmp_path_factory.mktemp("footage")
    return make_test_clip(directory / "source.mp4", seconds=clip_seconds)


@pytest.fixture
def sidecar_video(tmp_path: Path, source_video: Path, transcript: Transcript) -> Path:
    """The test clip with a word-level transcript sitting next to it."""
    video = tmp_path / "source.mp4"
    video.write_bytes(source_video.read_bytes())

    sidecar = tmp_path / "source.mp4.transcript.json"
    sidecar.write_text(
        json.dumps(
            {
                "words": [
                    {"text": word.text, "start": word.start_s, "end": word.end_s}
                    for word in transcript.words
                ]
            }
        ),
        encoding="utf-8",
    )
    return video


@pytest.fixture
def brand_file(tmp_path: Path) -> Path:
    path = tmp_path / "brand.json"
    path.write_text(json.dumps(BRAND_JSON, indent=2), encoding="utf-8")
    return path


@pytest.fixture
def brand(brand_file: Path):
    return load_brand(brand_file)

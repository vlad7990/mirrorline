"""The heuristic finder: does it return 8-12 usable, non-overlapping windows."""

from __future__ import annotations

import pytest

from pipeline.brand import Brand
from pipeline.models import Transcript, Word
from pipeline.multiplier.moments import (
    MAX_SECONDS,
    MIN_SECONDS,
    HeuristicMomentFinder,
    classify_format,
    split_sentences,
)

from .conftest import build_transcript


def test_finds_between_eight_and_twelve_moments(transcript: Transcript, brand: Brand) -> None:
    """The plan's promise, asserted on the stage that decides it."""
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)

    assert 8 <= len(found) <= 12


def test_every_moment_is_inside_the_length_band(transcript: Transcript, brand: Brand) -> None:
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)

    assert found
    for moment in found:
        assert MIN_SECONDS <= moment.duration_s <= MAX_SECONDS


def test_moments_never_overlap(transcript: Transcript, brand: Brand) -> None:
    """Overlapping cuts would be near-duplicates the gate then has to hold."""
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)

    for earlier, later in zip(found, found[1:]):
        assert earlier.end_s <= later.start_s


def test_moments_come_back_in_source_order(transcript: Transcript, brand: Brand) -> None:
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)

    assert list(found) == sorted(found, key=lambda moment: moment.start_s)


def test_every_moment_explains_its_score(transcript: Transcript, brand: Brand) -> None:
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)

    for moment in found:
        assert moment.reasons, f"cut at {moment.start_s:.0f}s has a score and no reasons"
        assert 0 < moment.score <= 100


def test_the_hook_is_the_speakers_own_words(transcript: Transcript, brand: Brand) -> None:
    """Nothing in the heuristic path writes copy; it only quotes."""
    found = HeuristicMomentFinder().find(transcript, brand, wanted=12)
    spoken = transcript.text

    for moment in found:
        assert moment.hook in spoken


def test_wanted_is_a_ceiling(transcript: Transcript, brand: Brand) -> None:
    found = HeuristicMomentFinder().find(transcript, brand, wanted=3)

    assert len(found) == 3


def test_a_transcript_too_short_to_cut_yields_nothing(brand: Brand) -> None:
    """Fewer honest moments beats padding the list out to a round number."""
    words = (Word(text="Hello.", start_s=0.0, end_s=1.0),)
    tiny = Transcript(words=words, duration_s=1.0, source="fixture")

    assert HeuristicMomentFinder().find(tiny, brand, wanted=12) == ()


def test_an_empty_transcript_yields_nothing(brand: Brand) -> None:
    empty = Transcript(words=(), duration_s=0.0, source="fixture")

    assert HeuristicMomentFinder().find(empty, brand, wanted=12) == ()


def test_brand_words_raise_the_score(brand: Brand) -> None:
    """A window using the client's own vocabulary outranks one that does not."""
    with_brand = build_transcript(
        (
            "Burnout is the reframe first-time managers need to hear.",
            "It is a 1:1 habit more than a workload problem in practice.",
        )
    )
    without_brand = build_transcript(
        (
            "Something entirely unrelated happened on the way to the office.",
            "The weather turned and the trains were late again this morning.",
        )
    )

    scored_with = HeuristicMomentFinder().find(with_brand, brand, wanted=1)
    scored_without = HeuristicMomentFinder().find(without_brand, brand, wanted=1)

    assert scored_with and scored_without
    assert scored_with[0].score > scored_without[0].score


def test_split_sentences_breaks_on_a_long_pause() -> None:
    """A transcriber that returns no punctuation still gets sentences."""
    words = (
        Word(text="one", start_s=0.0, end_s=0.4),
        Word(text="two", start_s=0.4, end_s=0.8),
        Word(text="three", start_s=2.0, end_s=2.4),
    )
    unpunctuated = Transcript(words=words, duration_s=2.4, source="fixture")

    sentences = split_sentences(unpunctuated)

    assert len(sentences) == 2
    assert sentences[0].text == "one two"


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Why does feedback land badly?", "Hook question"),
        ("How do you run a 1:1", "Hook question"),
        ("Three questions turn it around.", "List"),
        ("It failed because nobody owned it.", "Story"),
        ("Clarity is kinder than optimism.", "Tip"),
    ],
)
def test_classify_format(text: str, expected: str) -> None:
    assert classify_format(text) == expected

"""Beat alignment: the part that decides what the client's video contains."""

from __future__ import annotations

import pytest

from pipeline.beats import (
    MIN_COVERAGE,
    Beat,
    BeatNotFound,
    align_beats,
    content_tokens,
)


def words_from(text: str, start_s: float, per_word_s: float = 0.4) -> list[tuple[str, float, float]]:
    """Spoken words with plausible timings, so a test reads like a transcript."""
    out: list[tuple[str, float, float]] = []
    at = start_s
    for word in text.split():
        out.append((word, round(at, 3), round(at + per_word_s, 3)))
        at += per_word_s
    return out


FOUR_BEATS = [
    Beat("Hook", "most first-time managers try to be liked"),
    Beat("Setup", "we run a weekly one-to-one with every report"),
    Beat("Payoff", "turnover on that team dropped by half"),
    Beat("Call to action", "book a thirty minute call this week"),
]


def transcript_containing_all_four() -> list[tuple[str, float, float]]:
    return [
        *words_from("so the thing is that most first-time managers try to be liked.", 1.0),
        *words_from("and nothing about parking or coffee matters here at all.", 8.0),
        *words_from("we run a weekly one-to-one with every report, properly.", 14.0),
        *words_from("turnover on that team dropped by half inside a year.", 21.0),
        *words_from("book a thirty minute call this week if that helps.", 28.0),
    ]


class TestContentTokens:
    def test_drops_the_words_that_match_everything(self) -> None:
        # With stopwords counted, a beat about delegation matches a window about
        # parking: both contain "the" and "to".
        assert content_tokens("the thing is that we have to do it") == {"thing"}

    def test_keeps_figures_because_a_beat_is_built_on_them(self) -> None:
        assert "30" in content_tokens("a 30 minute call")
        # Punctuation splits "1:1" into two tokens, and a one-character figure
        # survives the length rule precisely so this still matches.
        assert {"1", "each", "week"} <= content_tokens("a 1:1 each week")


class TestAlignBeats:
    def test_finds_all_four_beats_in_order(self) -> None:
        segments = align_beats(FOUR_BEATS, transcript_containing_all_four())

        assert [segment.beat for segment in segments] == [
            "Hook",
            "Setup",
            "Payoff",
            "Call to action",
        ]
        # Every beat's own words are in its window, not somebody else's.
        assert "liked" in segments[0].text
        assert "one-to-one" in segments[1].text
        assert "turnover" in segments[2].text
        assert "book" in segments[3].text

    def test_every_window_clears_the_coverage_floor(self) -> None:
        segments = align_beats(FOUR_BEATS, transcript_containing_all_four())
        assert all(segment.coverage >= MIN_COVERAGE for segment in segments)

    def test_windows_never_overlap(self) -> None:
        segments = align_beats(FOUR_BEATS, transcript_containing_all_four())
        ordered = sorted(segments, key=lambda segment: segment.start_s)
        for earlier, later in zip(ordered, ordered[1:]):
            # Overlapping windows would put the same sentence in the video
            # twice, which reads as a stutter rather than as a cut.
            assert earlier.end_s <= later.start_s

    def test_refuses_the_beat_that_is_not_in_the_footage(self) -> None:
        # The Payoff line was never said. The honest answer is to name it, not
        # to cut forty seconds of unrelated talk and let the client discover it.
        without_payoff = [
            *words_from("so most first-time managers try to be liked, mostly.", 1.0),
            *words_from("we run a weekly one-to-one with every report here.", 9.0),
            *words_from("book a thirty minute call this week if useful.", 16.0),
        ]

        with pytest.raises(BeatNotFound) as raised:
            align_beats(FOUR_BEATS, without_payoff)

        assert raised.value.label == "Payoff"
        assert "Payoff" in str(raised.value)
        assert "%" in str(raised.value)

    def test_refuses_an_empty_transcript(self) -> None:
        with pytest.raises(BeatNotFound):
            align_beats(FOUR_BEATS, [])

    def test_a_weak_beat_does_not_steal_the_window_a_strong_one_needs(self) -> None:
        # Both beats match the same stretch of speech; one matches it completely
        # and one only partly. Assigned in script order the Hook would take it
        # and the Payoff would fail on footage that contains it, so assignment
        # is best-first.
        shared = words_from("turnover on that team dropped by half inside a year.", 2.0)
        beats = [
            Beat("Hook", "turnover dropped somewhere unrelated entirely"),
            Beat("Payoff", "turnover on that team dropped by half"),
        ]
        later = words_from("turnover dropped somewhere unrelated entirely, honestly.", 20.0)

        segments = align_beats(beats, [*shared, *later])

        payoff = next(segment for segment in segments if segment.beat == "Payoff")
        assert payoff.start_s < 10.0

    def test_a_window_is_never_longer_than_a_beat_may_be(self) -> None:
        long_speech = words_from(
            "we run a weekly one-to-one with every report " * 12, 1.0, per_word_s=0.5
        )
        segments = align_beats([FOUR_BEATS[1]], long_speech)
        assert segments[0].duration_s <= 20.0

    def test_keeps_the_coverage_so_a_weak_match_is_visible(self) -> None:
        segments = align_beats(FOUR_BEATS, transcript_containing_all_four())
        # Carried into summary.json: a client whose Payoff matched at 45% is
        # owed that number rather than a video that silently guessed.
        assert all(0.0 < segment.coverage <= 1.0 for segment in segments)

"""The Claude finder, tested without ever calling it.

Every test here is about the gate in front of the spend, or about distrusting
the reply. Nothing in this file touches the network: the constructor is what
refuses, and `parse` is a static function over a string.
"""

from __future__ import annotations

import pytest

from pipeline.adapters.base import AdapterUnavailable
from pipeline.multiplier.claude_moments import ClaudeMomentFinder

from .conftest import build_transcript


@pytest.fixture(autouse=True)
def no_key_by_accident(monkeypatch: pytest.MonkeyPatch) -> None:
    """A real key in the environment must not make these tests spend money."""
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)


def test_a_zero_cap_refuses_before_anything_else() -> None:
    """The default. `--use-claude` without a cap cannot reach the API."""
    with pytest.raises(AdapterUnavailable, match="max-spend-usd"):
        ClaudeMomentFinder(max_spend_usd=0.0)


def test_a_negative_cap_is_refused() -> None:
    with pytest.raises(AdapterUnavailable, match="max-spend-usd"):
        ClaudeMomentFinder(max_spend_usd=-5.0)


def test_a_missing_key_is_refused_even_with_a_cap() -> None:
    with pytest.raises(AdapterUnavailable, match="ANTHROPIC_API_KEY"):
        ClaudeMomentFinder(max_spend_usd=1.0)


def test_an_empty_key_counts_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "   ")

    with pytest.raises(AdapterUnavailable, match="ANTHROPIC_API_KEY"):
        ClaudeMomentFinder(max_spend_usd=1.0)


# --- distrusting the reply ------------------------------------------------


def test_a_window_outside_the_length_band_is_dropped() -> None:
    transcript = build_transcript()
    reply = '{"moments": [{"start": 0.0, "end": 300.0, "hook": "Burnout is not"}]}'

    assert ClaudeMomentFinder.parse(reply, transcript) == ()


def test_a_hook_the_model_invented_is_dropped() -> None:
    """The strongest rule: a hook not in the transcript never becomes a cut."""
    transcript = build_transcript()
    reply = (
        '{"moments": [{"start": 0.0, "end": 25.0, '
        '"hook": "Guaranteed to triple your revenue"}]}'
    )

    assert ClaudeMomentFinder.parse(reply, transcript) == ()


def test_a_hook_quoted_from_the_transcript_survives() -> None:
    transcript = build_transcript()
    reply = '{"moments": [{"start": 0.0, "end": 25.0, "hook": "Burnout is not a workload"}]}'

    found = ClaudeMomentFinder.parse(reply, transcript)

    assert len(found) == 1
    assert found[0].hook == "Burnout is not a workload"
    assert "chosen by Claude" in found[0].reasons


def test_a_window_past_the_end_of_the_source_is_dropped() -> None:
    transcript = build_transcript()
    beyond = transcript.duration_s + 60
    reply = (
        f'{{"moments": [{{"start": {beyond}, "end": {beyond + 25}, '
        '"hook": "Burnout is not a workload"}]}'
    )

    assert ClaudeMomentFinder.parse(reply, transcript) == ()


def test_an_inverted_window_is_dropped() -> None:
    transcript = build_transcript()
    reply = '{"moments": [{"start": 40.0, "end": 10.0, "hook": "Burnout is not a workload"}]}'

    assert ClaudeMomentFinder.parse(reply, transcript) == ()


def test_prose_around_the_json_is_tolerated() -> None:
    transcript = build_transcript()
    reply = (
        "Sure, here are the moments:\n"
        '{"moments": [{"start": 0.0, "end": 25.0, "hook": "Burnout is not a workload"}]}\n'
        "Hope that helps."
    )

    assert len(ClaudeMomentFinder.parse(reply, transcript)) == 1


def test_a_reply_with_no_json_is_an_error() -> None:
    with pytest.raises(ValueError, match="no JSON object"):
        ClaudeMomentFinder.parse("I could not do that.", build_transcript())


def test_a_reply_with_no_moments_list_is_an_error() -> None:
    with pytest.raises(ValueError, match="no 'moments' list"):
        ClaudeMomentFinder.parse('{"result": "none"}', build_transcript())


def test_broken_json_is_an_error() -> None:
    """Braces present, so it gets as far as the parser, and that is what fails."""
    with pytest.raises(ValueError, match="will not parse"):
        ClaudeMomentFinder.parse('{"moments": [}', build_transcript())


def test_results_come_back_in_source_order() -> None:
    transcript = build_transcript()
    reply = (
        '{"moments": ['
        '{"start": 60.0, "end": 85.0, "hook": "reframe"},'
        '{"start": 0.0, "end": 25.0, "hook": "Burnout is not a workload"}'
        "]}"
    )

    found = ClaudeMomentFinder.parse(reply, transcript)

    assert [moment.start_s for moment in found] == sorted(m.start_s for m in found)


def test_the_estimate_grows_with_the_prompt() -> None:
    """The cap only means something if the estimate tracks the input."""
    small = ClaudeMomentFinder.estimate_usd("a" * 1_000)
    large = ClaudeMomentFinder.estimate_usd("a" * 1_000_000)

    assert large > small > 0

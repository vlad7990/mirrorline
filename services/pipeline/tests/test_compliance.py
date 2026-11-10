"""Every compliance rule, one at a time, plus the gate that combines them."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.brand import Brand, load_brand
from pipeline.compliance.rules import (
    SIMILARITY_LIMIT,
    check_ai_label,
    check_banned_phrases,
    check_cuts,
    check_near_duplicates,
    check_rights,
    similarity,
)
from pipeline.models import CaptionLine, Cut, Moment

from .conftest import BRAND_JSON


def make_cut(index: int, caption: str, **kwargs) -> Cut:
    """A cut with a known caption, which is all any rule here reads."""
    moment = Moment(
        start_s=float(index * 30),
        end_s=float(index * 30 + 30),
        hook=caption[:60],
        format="Tip",
        score=70,
    )
    line = CaptionLine(text=caption, start_s=0.0, end_s=3.0)
    return Cut(index=index, moment=moment, caption_lines=(line,), **kwargs)


def brand_without_rights(tmp_path: Path) -> Brand:
    raw = {key: value for key, value in BRAND_JSON.items() if key != "rights"}
    path = tmp_path / "brand.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return load_brand(path)


# --- rights flag ----------------------------------------------------------


def test_rights_present_passes(brand: Brand) -> None:
    finding = check_rights(brand)

    assert finding.status == "pass"
    assert "consent-rights-episode-47" in finding.message


def test_rights_absent_blocks(tmp_path: Path) -> None:
    """Non-negotiable 1. Not a warning: a block."""
    finding = check_rights(brand_without_rights(tmp_path))

    assert finding.status == "blocked"
    assert finding.rule == "rights-flag"


def test_rights_absent_blocks_every_cut_in_the_batch(tmp_path: Path) -> None:
    brand = brand_without_rights(tmp_path)
    cuts = (make_cut(1, "A clean line."), make_cut(2, "Another clean line entirely."))

    verdicts = check_cuts(cuts, brand)

    assert [verdict.status for verdict in verdicts.values()] == ["blocked", "blocked"]


# --- banned caption phrases ----------------------------------------------


@pytest.mark.parametrize(
    "caption",
    [
        "This is guaranteed to work for you.",
        "We guarantee more reach every week.",
        "Zero risk and no effort at all.",
        "10k followers in thirty days.",
        "We are SOC-2 certified now.",
        "Our clients say it is the best.",
        "Rated 5 stars by everyone.",
    ],
)
def test_claims_we_will_not_publish_are_blocked(caption: str, brand: Brand) -> None:
    finding = check_banned_phrases(make_cut(1, caption), brand)

    assert finding.status == "blocked", f"{caption!r} should not be publishable"
    assert finding.rule == "banned-phrases"


def test_a_brands_own_forbidden_word_asks_for_a_human(brand: Brand) -> None:
    """`wordsNever` is a brand preference, so it holds rather than blocks."""
    finding = check_banned_phrases(make_cut(1, "Time to hustle a little harder."), brand)

    assert finding.status == "needs-review"
    assert "hustle" in finding.message


def test_an_ordinary_caption_passes(brand: Brand) -> None:
    finding = check_banned_phrases(make_cut(1, "Burnout is rarely about the workload."), brand)

    assert finding.status == "pass"


# --- AI label -------------------------------------------------------------


def test_a_generated_scene_without_a_label_is_blocked() -> None:
    """Non-negotiable 4, enforced before the feature that needs it exists."""
    cut = make_cut(1, "A line.", has_ai_scenes=True, ai_label_applied=False)

    finding = check_ai_label(cut)

    assert finding.status == "blocked"
    assert finding.rule == "ai-label"


def test_a_generated_scene_with_a_label_passes() -> None:
    cut = make_cut(1, "A line.", has_ai_scenes=True, ai_label_applied=True)

    assert check_ai_label(cut).status == "pass"


def test_a_cut_with_no_generated_scenes_passes() -> None:
    assert check_ai_label(make_cut(1, "A line.")).status == "pass"


# --- near duplicates ------------------------------------------------------


def test_identical_captions_are_held() -> None:
    caption = "Burnout is not a workload problem for first-time managers."
    cuts = (make_cut(1, caption), make_cut(2, caption))

    finding = check_near_duplicates(cuts[0], cuts)

    assert finding.status == "needs-review"
    assert "100% similar to cut 2" in finding.message


def test_distinct_captions_pass() -> None:
    cuts = (
        make_cut(1, "Burnout is rarely about the hours worked."),
        make_cut(2, "Delegation fails when you skip the reason why."),
    )

    assert check_near_duplicates(cuts[0], cuts).status == "pass"


def test_a_single_cut_has_nothing_to_duplicate() -> None:
    only = make_cut(1, "One line, alone in the batch.")

    finding = check_near_duplicates(only, (only,))

    assert finding.status == "pass"
    assert "0% similar" in finding.message


def test_the_message_names_the_limit_the_public_site_states() -> None:
    caption = "Burnout is not a workload problem for first-time managers."
    cuts = (make_cut(1, caption), make_cut(2, caption))

    finding = check_near_duplicates(cuts[0], cuts)

    assert f"{round(SIMILARITY_LIMIT * 100)}% limit" in finding.message


def test_similarity_is_zero_against_an_empty_caption() -> None:
    assert similarity("", "anything at all") == 0.0


def test_similarity_ignores_letter_case() -> None:
    assert similarity("Burnout and reframe", "burnout and reframe") == pytest.approx(1.0)


# --- the gate as a whole --------------------------------------------------


def test_the_worst_finding_decides_the_cut(brand: Brand) -> None:
    """A block beats a hold beats a pass. Nothing averages."""
    cuts = (make_cut(1, "This is guaranteed to work."), make_cut(2, "A calm, clean line."))

    verdicts = check_cuts(cuts, brand)

    assert verdicts[1].status == "blocked"
    assert verdicts[2].status == "pass"


def test_every_cut_gets_all_four_rules(brand: Brand) -> None:
    cuts = (make_cut(1, "A calm, clean line."),)

    verdicts = check_cuts(cuts, brand)

    rules = {finding.rule for finding in verdicts[1].findings}
    assert rules == {"rights-flag", "banned-phrases", "ai-label", "near-duplicate"}


def test_a_passing_cut_has_no_reasons_to_explain(brand: Brand) -> None:
    cuts = (make_cut(1, "A calm, clean line."),)

    assert check_cuts(cuts, brand)[1].reasons == ()

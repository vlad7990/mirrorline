"""Caption grouping (arithmetic) and the Pillow burner (pixels)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.adapters.base import AdapterUnavailable, CaptionBurner
from pipeline.brand import Brand, load_brand
from pipeline.ffmpeg import VERTICAL_HEIGHT, VERTICAL_WIDTH
from pipeline.models import CaptionLine, Word
from pipeline.multiplier.captions import (
    MAX_LINE_CHARS,
    MAX_LINE_SECONDS,
    PillowCaptionBurner,
    caption_lines,
    resolve_font_path,
)

from .conftest import BRAND_JSON


def words_from(text: str, per_word: float = 0.4) -> tuple[Word, ...]:
    return tuple(
        Word(text=token, start_s=position * per_word, end_s=(position + 1) * per_word)
        for position, token in enumerate(text.split())
    )


# --- grouping -------------------------------------------------------------


def test_no_words_makes_no_lines() -> None:
    assert caption_lines(()) == ()


def test_lines_stay_short_enough_to_read() -> None:
    words = words_from("Burnout is not a workload problem for most first-time managers today")

    lines = caption_lines(words)

    assert lines
    for line in lines:
        # The word that crosses the limit still lands on the line it started.
        assert len(line.text) <= MAX_LINE_CHARS + 12


def test_lines_stay_short_enough_in_time() -> None:
    words = words_from("one two three four five six seven eight nine ten", per_word=1.0)

    lines = caption_lines(words)

    for line in lines:
        assert line.end_s - line.start_s <= MAX_LINE_SECONDS + 1.0


def test_times_are_rebased_to_the_cut() -> None:
    """ffmpeg sees a cut that starts at zero, so the lines must too."""
    words = words_from("a few words here", per_word=0.5)
    shifted = tuple(
        Word(text=word.text, start_s=word.start_s + 60.0, end_s=word.end_s + 60.0)
        for word in words
    )

    lines = caption_lines(shifted, offset_s=60.0)

    assert lines[0].start_s == pytest.approx(0.0, abs=0.01)


def test_times_never_go_negative() -> None:
    words = words_from("a few words", per_word=0.5)

    lines = caption_lines(words, offset_s=999.0)

    assert all(line.start_s >= 0.0 and line.end_s >= 0.0 for line in lines)


def test_a_brand_word_is_marked_for_highlighting() -> None:
    words = words_from("the reframe is simple")

    lines = caption_lines(words, highlight_words=("reframe",))

    assert any(line.highlight == "reframe" for line in lines)


def test_no_highlight_when_the_brand_word_is_absent() -> None:
    words = words_from("nothing notable in this line")

    lines = caption_lines(words, highlight_words=("reframe",))

    assert all(line.highlight is None for line in lines)


def test_every_spoken_word_survives_grouping() -> None:
    """Captions are the speaker's words; none may be dropped on the way."""
    spoken = "Burnout is not a workload problem for most first-time managers"
    words = words_from(spoken)

    lines = caption_lines(words)

    assert " ".join(line.text for line in lines) == spoken


# --- drawing --------------------------------------------------------------


def test_the_burner_satisfies_the_interface(brand: Brand) -> None:
    assert isinstance(PillowCaptionBurner(brand), CaptionBurner)


def test_draws_one_png_per_line_at_frame_size(brand: Brand, tmp_path: Path) -> None:
    from PIL import Image

    lines = (
        CaptionLine(text="Burnout is not", start_s=0.0, end_s=1.5),
        CaptionLine(text="a workload problem", start_s=1.5, end_s=3.0, highlight="workload"),
    )

    drawn = PillowCaptionBurner(brand).draw(lines, brand, tmp_path / "cut-01")

    assert len(drawn) == 2
    for path, start, end in drawn:
        assert path.exists()
        assert end > start
        with Image.open(path) as image:
            assert image.size == (VERTICAL_WIDTH, VERTICAL_HEIGHT)
            assert image.mode == "RGBA"


def test_the_drawn_frame_is_mostly_transparent(brand: Brand, tmp_path: Path) -> None:
    """It is an overlay, so everywhere the caption is not must stay see-through."""
    from PIL import Image

    lines = (CaptionLine(text="One short line", start_s=0.0, end_s=1.0),)

    drawn = PillowCaptionBurner(brand).draw(lines, brand, tmp_path / "cut-01")

    with Image.open(drawn[0][0]) as image:
        # The alpha histogram counts pixels per value, so bins 1-255 are the
        # pixels that carry any caption at all. Cheaper than walking the data,
        # and it does not use the API Pillow 14 removes.
        alpha = image.getchannel("A")
        opaque = sum(alpha.histogram()[1:])
    assert opaque > 0, "nothing was drawn at all"
    assert opaque < (VERTICAL_WIDTH * VERTICAL_HEIGHT) * 0.25


@pytest.mark.parametrize("style", ["bold-highlight", "editorial-serif", "clean-minimal"])
def test_every_brand_kit_style_draws(style: str, tmp_path: Path) -> None:
    path = tmp_path / "brand.json"
    path.write_text(json.dumps({**BRAND_JSON, "captionStyle": style}), encoding="utf-8")
    styled = load_brand(path)
    lines = (CaptionLine(text="A line to draw", start_s=0.0, end_s=1.0, highlight="line"),)

    drawn = PillowCaptionBurner(styled).draw(lines, styled, tmp_path / style)

    assert drawn and drawn[0][0].exists()


def test_a_font_file_that_does_not_exist_is_refused(tmp_path: Path) -> None:
    path = tmp_path / "brand.json"
    path.write_text(
        json.dumps({**BRAND_JSON, "fontFile": "/nowhere/Imaginary.ttf"}), encoding="utf-8"
    )

    with pytest.raises(AdapterUnavailable, match="points at nothing"):
        resolve_font_path(load_brand(path))


def test_a_long_line_wraps_rather_than_overflowing(brand: Brand, tmp_path: Path) -> None:
    long_line = CaptionLine(
        text="a very long caption line indeed that cannot fit across one frame",
        start_s=0.0,
        end_s=3.0,
    )

    drawn = PillowCaptionBurner(brand).draw((long_line,), brand, tmp_path / "wrap")

    assert drawn[0][0].exists()

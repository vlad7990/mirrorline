"""The `.ass` writer: colour byte order, escaping, and the font we admit to."""

from __future__ import annotations

import pytest

from pipeline.models import CaptionLine
from pipeline.multiplier.ass_captions import (
    AssStyle,
    TextOverlay,
    ass_colour,
    ass_document,
    ass_time,
    escape_ass_text,
    pick_font_family,
)


class TestAssColour:
    def test_reverses_the_bytes_because_ass_stores_them_backwards(self) -> None:
        # The bug this test exists for does not fail loudly: it paints the
        # brand's teal as orange, and ships.
        assert ass_colour("#FF5A36") == "&H00365AFF"
        assert ass_colour("#12545A") == "&H005A5412"

    def test_expands_the_short_form(self) -> None:
        assert ass_colour("#FFF") == ass_colour("#FFFFFF")

    def test_refuses_something_that_is_not_a_colour(self) -> None:
        with pytest.raises(ValueError):
            ass_colour("teal")


class TestAssTime:
    def test_writes_centiseconds(self) -> None:
        assert ass_time(0) == "0:00:00.00"
        assert ass_time(61.5) == "0:01:01.50"
        assert ass_time(3661.25) == "1:01:01.25"

    def test_rounds_without_producing_a_hundredth_hundredth(self) -> None:
        assert ass_time(1.999) == "0:00:02.00"

    def test_clamps_a_negative_time_rather_than_writing_one(self) -> None:
        assert ass_time(-3) == "0:00:00.00"


class TestEscaping:
    def test_escapes_the_brace_that_would_swallow_the_rest_of_the_line(self) -> None:
        # An unescaped `{` opens an override block, so the visible result is a
        # caption with words missing rather than an error.
        assert escape_ass_text("the {hard} part") == "the \\{hard\\} part"

    def test_turns_newlines_into_ass_line_breaks(self) -> None:
        assert escape_ass_text("two\nlines") == "two\\Nlines"


class TestPickFontFamily:
    def test_uses_the_brand_face_when_it_is_installed(self) -> None:
        family, is_brand = pick_font_family("Inter Tight", frozenset({"Inter Tight", "DejaVu Sans"}))
        assert (family, is_brand) == ("Inter Tight", True)

    def test_falls_back_and_says_so(self) -> None:
        family, is_brand = pick_font_family("Inter Tight", frozenset({"DejaVu Sans"}))
        # The boolean is what `summary.json` reports: a client who set their
        # brand face and got DejaVu is owed that, not left to notice.
        assert (family, is_brand) == ("DejaVu Sans", False)

    def test_stays_optimistic_when_it_could_not_ask(self) -> None:
        # No fontconfig means "we do not know", not "it is missing". libass does
        # its own substitution, and refusing to caption over a font query would
        # be worse than a substituted face.
        assert pick_font_family("Inter Tight", frozenset()) == ("Inter Tight", True)

    def test_picks_something_rather_than_nothing(self) -> None:
        family, is_brand = pick_font_family(None, frozenset({"Weird Display"}))
        assert (family, is_brand) == ("Weird Display", False)


class TestAssDocument:
    style = AssStyle(font_family="DejaVu Sans", highlight_hex="#FF5A36")

    lines = (
        CaptionLine(text="most first-time managers", start_s=0.0, end_s=1.4),
        CaptionLine(text="try to be liked", start_s=1.4, end_s=2.8, highlight="liked"),
    )

    def test_declares_the_frame_it_was_measured_against(self) -> None:
        document = ass_document(self.lines, self.style)
        assert "PlayResX: 1080" in document
        assert "PlayResY: 1920" in document
        # Our grouping already decided where the lines break; libass re-wrapping
        # would undo a measurement made against the frame width.
        assert "WrapStyle: 2" in document

    def test_writes_one_dialogue_per_line(self) -> None:
        document = ass_document(self.lines, self.style)
        dialogues = [line for line in document.splitlines() if line.startswith("Dialogue:")]
        assert len(dialogues) == 2
        assert "0:00:01.40,0:00:02.80,Caption" in dialogues[1]

    def test_paints_the_highlighted_phrase_in_the_brand_colour(self) -> None:
        document = ass_document(self.lines, self.style)
        assert f"{{\\c{ass_colour('#FF5A36')}}}liked" in document

    def test_skips_an_empty_line_rather_than_writing_a_blank_caption(self) -> None:
        document = ass_document((CaptionLine(text="   ", start_s=0.0, end_s=1.0),), self.style)
        assert "Dialogue:" not in document

    def test_puts_an_overlay_on_its_own_style(self) -> None:
        document = ass_document(
            self.lines, self.style, (TextOverlay(text="The thing nobody says", start_s=0, end_s=4),)
        )
        assert "Style: Overlay" in document
        assert ",Overlay,," in document

    def test_both_styles_name_the_resolved_family(self) -> None:
        document = ass_document(self.lines, self.style)
        assert document.count("DejaVu Sans") == 2

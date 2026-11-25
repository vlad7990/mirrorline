"""Captions as a subtitle file, drawn by libass instead of by Pillow.

================================================================================
Why this exists beside `captions.py` rather than replacing it
================================================================================

`captions.py` rasterises caption lines into PNGs with Pillow and composites them
with ffmpeg's `overlay` filter. That was not a preference: the ffmpeg on the
machine engine v0 was built against has **no text filters at all** — no
`drawtext`, no `subtitles`, no `ass` (docs/DECISIONS.md D16) — so there was
nothing else to do.

The worker image settles that differently. It ships a pinned **LGPL** ffmpeg
build, and the LGPL build carries libass (ISC) and freetype, because the only
GPL-only pieces are the x264/x265 encoders. So the container can burn real
subtitles, and `-vf ass=` is better than compositing PNGs in every way that
matters: one filter instead of one overlay per line, correct text shaping,
kerning and wrapping, no font rasterised at one size and scaled, and a caption
file that can be read by a human when a client asks why a line looked wrong.

`captions.py` keeps working and keeps its tests, because `make-samples` runs on
Vlad's laptop against the Homebrew build, which still has no libass. Two paths,
one of which is going away when the laptop stops being a target — and deleting
the working one first would have been the wrong order.

================================================================================
Everything here is a pure string function
================================================================================

No ffmpeg, no filesystem, no brand loading. ASS is a text format; its hard
parts are colour byte order and escaping, and both are exactly the kind of
thing that should be asserted in a unit test rather than discovered in a frame.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..models import CaptionLine

__all__ = [
    "AssStyle",
    "DEFAULT_FALLBACK_FAMILIES",
    "ass_colour",
    "ass_document",
    "ass_time",
    "escape_ass_text",
    "pick_font_family",
]

PLAY_RES_X = 1080
PLAY_RES_Y = 1920

DEFAULT_FALLBACK_FAMILIES: tuple[str, ...] = (
    "DejaVu Sans",
    "Liberation Sans",
    "Noto Sans",
    "Arial",
)
"""Families to try when the brand's own face is not installed.

DejaVu first because it is what a Debian image has after
`apt-get install fonts-dejavu-core`, which is three lines in the Dockerfile and
the difference between captions and tofu boxes.
"""


def ass_colour(hex_colour: str, alpha: int = 0) -> str:
    """`#RRGGBB` to ASS's `&HAABBGGRR`.

    ASS stores colour **backwards** — alpha, blue, green, red — and an alpha of
    0 means opaque. Getting this wrong does not fail: it silently paints the
    brand's teal as orange, which is the kind of bug that ships. Hence a
    function with a test rather than an f-string at three call sites.
    """
    value = hex_colour.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(character * 2 for character in value)
    if len(value) != 6:
        raise ValueError(f"{hex_colour!r} is not a #RRGGBB colour")

    red, green, blue = value[0:2], value[2:4], value[4:6]
    return f"&H{alpha:02X}{blue.upper()}{green.upper()}{red.upper()}"


def ass_time(seconds: float) -> str:
    """Seconds to ASS's `H:MM:SS.cc`, which is centiseconds and one hour digit."""
    clamped = max(0.0, seconds)
    hours = int(clamped // 3600)
    minutes = int((clamped % 3600) // 60)
    whole_seconds = int(clamped % 60)
    centiseconds = int(round((clamped - int(clamped)) * 100))
    if centiseconds == 100:  # rounding up a .999
        centiseconds = 0
        whole_seconds += 1
    return f"{hours}:{minutes:02d}:{whole_seconds:02d}.{centiseconds:02d}"


def escape_ass_text(text: str) -> str:
    """Make one line safe to put in a Dialogue event.

    `{` opens an override block, so an unescaped brace in a client's own words
    would turn the rest of the caption into a style instruction — and most of
    them are silently ignored, so the visible result is simply missing text.
    Newlines become `\\N`, which is ASS's hard line break.
    """
    return (
        text.replace("\\", "\\\\")
        .replace("{", "\\{")
        .replace("}", "\\}")
        .replace("\r\n", "\\N")
        .replace("\n", "\\N")
        .replace("\r", "\\N")
    )


def pick_font_family(
    requested: str | None,
    available: frozenset[str],
    fallbacks: tuple[str, ...] = DEFAULT_FALLBACK_FAMILIES,
) -> tuple[str, bool]:
    """The family to put in the ASS style, and whether it is the brand's own.

    Returns `(family, is_brand_font)`. The boolean is not decoration: it goes
    into `summary.json`, because a client who set their brand face and got
    DejaVu is owed that information rather than left to notice. The same rule
    `summary.json` already applies to which transcriber answered.

    `available` empty means "we could not ask" — fontconfig missing, or
    `fc-list` unavailable. Then the requested family is used as asked and libass
    does its own substitution: optimistic on purpose, because refusing to
    caption a video over a font query is worse than a substituted face.
    """
    wanted = (requested or "").strip()

    if not available:
        return (wanted or fallbacks[0], bool(wanted))

    if wanted and wanted in available:
        return (wanted, True)

    for family in fallbacks:
        if family in available:
            return (family, False)

    return (next(iter(sorted(available))), False)


@dataclass(frozen=True, slots=True)
class AssStyle:
    """The look of the burned-in captions, from the brand kit.

    Sizes are in the 1080x1920 coordinate space declared in the header, so they
    are real pixels in the output frame rather than points to be scaled.
    """

    font_family: str
    font_size: int = 64
    #: The caption's own colour.
    primary_hex: str = "#FFFFFF"
    #: The phrase `CaptionLine.highlight` names, for the bold-highlight style.
    highlight_hex: str = "#FF5A36"
    outline_hex: str = "#000000"
    outline: int = 4
    shadow: int = 0
    #: Distance from the bottom of the frame. Clear of every platform's chrome.
    margin_v: int = 320
    margin_h: int = 72


def _style_line(style: AssStyle) -> str:
    # Bold=-1 is ASS for true. Alignment=2 is bottom-centre; BorderStyle=1 is an
    # outline rather than a filled box, which is what DESIGN.md's caption styles
    # all assume.
    return ",".join(
        [
            "Style: Caption",
            style.font_family,
            str(style.font_size),
            ass_colour(style.primary_hex),
            ass_colour(style.primary_hex),
            ass_colour(style.outline_hex),
            ass_colour(style.outline_hex),
            "-1",
            "0",
            "0",
            "0",
            "100",
            "100",
            "0",
            "0",
            "1",
            str(style.outline),
            str(style.shadow),
            "2",
            str(style.margin_h),
            str(style.margin_h),
            str(style.margin_v),
            "1",
        ]
    )


def _overlay_style_line(style: AssStyle) -> str:
    """A second style for the hook and the beat label, at the top of the frame.

    Alignment=8 is top-centre and the margin is larger, because the top of a
    vertical video is where the platforms put their own interface.
    """
    return ",".join(
        [
            "Style: Overlay",
            style.font_family,
            str(int(style.font_size * 0.8)),
            ass_colour(style.highlight_hex),
            ass_colour(style.highlight_hex),
            ass_colour(style.outline_hex),
            ass_colour(style.outline_hex),
            "-1",
            "0",
            "0",
            "0",
            "100",
            "100",
            "0",
            "0",
            "1",
            str(style.outline),
            str(style.shadow),
            "8",
            str(style.margin_h),
            str(style.margin_h),
            "260",
            "1",
        ]
    )


def _dialogue(start_s: float, end_s: float, style_name: str, text: str) -> str:
    return (
        f"Dialogue: 0,{ass_time(start_s)},{ass_time(end_s)},{style_name},,0,0,0,,{text}"
    )


def _highlighted(line: CaptionLine, style: AssStyle) -> str:
    """One caption line, with the brand's highlight colour on one phrase."""
    text = escape_ass_text(line.text)
    if line.highlight is None:
        return text

    phrase = escape_ass_text(line.highlight)
    if phrase == "" or phrase not in text:
        return text

    coloured = (
        f"{{\\c{ass_colour(style.highlight_hex)}}}{phrase}"
        f"{{\\c{ass_colour(style.primary_hex)}}}"
    )
    # Only the first occurrence: two identical words in one line, both painted,
    # reads as a mistake rather than as emphasis.
    return text.replace(phrase, coloured, 1)


@dataclass(frozen=True, slots=True)
class TextOverlay:
    """A line of brand text over the video — the hook, or a beat's label."""

    text: str
    start_s: float
    end_s: float


def ass_document(
    lines: tuple[CaptionLine, ...],
    style: AssStyle,
    overlays: tuple[TextOverlay, ...] = (),
) -> str:
    """The whole `.ass` file, ready to write next to the video.

    `WrapStyle: 2` is "no automatic wrapping" — the caption grouping in
    `captions.py` already decided where the lines break, and letting libass
    re-wrap would undo a measurement that was made against the frame width.
    """
    header = [
        "[Script Info]",
        "; Written by Mirrorline. Captions are burned in by ffmpeg's ass filter.",
        "ScriptType: v4.00+",
        f"PlayResX: {PLAY_RES_X}",
        f"PlayResY: {PLAY_RES_Y}",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "YCbCr Matrix: TV.709",
        "",
        "[V4+ Styles]",
        (
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding"
        ),
        _style_line(style),
        _overlay_style_line(style),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    events = [
        _dialogue(overlay.start_s, overlay.end_s, "Overlay", escape_ass_text(overlay.text))
        for overlay in overlays
    ]
    events += [
        _dialogue(line.start_s, line.end_s, "Caption", _highlighted(line, style))
        for line in lines
        if line.text.strip() != ""
    ]

    return "\n".join([*header, *events, ""])

"""Captions: grouping words into lines, then drawing them.

Two jobs that stay separate because they fail differently. `caption_lines`
is arithmetic on word timings and always works. `PillowCaptionBurner` draws
pixels and depends on a font being present, so it is an adapter.

Why draw them here instead of in ffmpeg: the ffmpeg on this machine is built
without libfreetype and without libass, so `drawtext`, `subtitles` and `ass`
are all missing. Pillow rasterises the line, ffmpeg composites the PNG with
`overlay`, which every build has. docs/DECISIONS.md D16 has the detail and the
route back to `drawtext` if a fuller ffmpeg is installed later.

The three styles are the three the Brand kit screen offers, and each one reads
the brand's own colours — never a colour invented here.
"""

from __future__ import annotations

from pathlib import Path

from ..adapters.base import AdapterUnavailable
from ..brand import Brand
from ..ffmpeg import VERTICAL_HEIGHT, VERTICAL_WIDTH
from ..models import CaptionLine, Word

__all__ = ["PillowCaptionBurner", "caption_lines", "resolve_font_path"]

MAX_LINE_CHARS = 28
MAX_LINE_SECONDS = 2.6
"""A line someone can read in one glance, held long enough to read it."""

_SIDE_MARGIN = 72
_BOTTOM_MARGIN = 300
"""Clear of the platform's own UI, which eats the bottom of the frame."""

_FONT_SIZE = 64
_LINE_SPACING = 14
_PAD_X = 26
_PAD_Y = 18

# Ordered by preference. Geist is the product's own face but ships as woff2,
# which Pillow cannot read, so the brand file can name a real TTF and these
# are the fallbacks when it does not.
_FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
)


def caption_lines(
    words: tuple[Word, ...], offset_s: float = 0.0, highlight_words: tuple[str, ...] = ()
) -> tuple[CaptionLine, ...]:
    """Group words into readable lines, timed against the cut.

    `offset_s` is the cut's start in the source, subtracted so the returned
    times are cut-local — which is what ffmpeg's `enable=between(t,...)` wants
    after an input seek.
    """
    if not words:
        return ()

    wanted = tuple(word.lower().strip(".,!?") for word in highlight_words)
    lines: list[CaptionLine] = []
    current: list[Word] = []

    def flush() -> None:
        if not current:
            return
        text = " ".join(word.text for word in current)
        highlight = next(
            (
                word.text.strip(".,!?")
                for word in current
                if word.text.lower().strip(".,!?") in wanted
            ),
            None,
        )
        lines.append(
            CaptionLine(
                text=text,
                start_s=max(0.0, current[0].start_s - offset_s),
                end_s=max(0.0, current[-1].end_s - offset_s),
                highlight=highlight,
            )
        )

    for word in words:
        candidate = current + [word]
        text_length = len(" ".join(part.text for part in candidate))
        span = candidate[-1].end_s - candidate[0].start_s
        if current and (text_length > MAX_LINE_CHARS or span > MAX_LINE_SECONDS):
            flush()
            current = [word]
            continue
        current = candidate

    flush()
    return tuple(lines)


def resolve_font_path(brand: Brand) -> Path:
    """The font file the captions will actually be drawn with.

    Raises rather than falling back to Pillow's bitmap default: a 10px default
    font on a 1080-wide frame is not a caption, and shipping one as a sample
    would be worse than stopping.
    """
    if brand.font_file:
        named = Path(brand.font_file).expanduser()
        if not named.exists():
            raise AdapterUnavailable(f"brand.json fontFile points at nothing: {named}")
        return named

    for candidate in _FONT_CANDIDATES:
        path = Path(candidate)
        if path.exists():
            return path

    raise AdapterUnavailable(
        "no caption font found. Name one in brand.json as 'fontFile', "
        "e.g. /System/Library/Fonts/Supplemental/Arial Bold.ttf"
    )


class PillowCaptionBurner:
    """Draws each caption line as a transparent 1080x1920 PNG."""

    name = "pillow-overlay"

    def __init__(self, brand: Brand) -> None:
        try:
            from PIL import ImageFont  # noqa: F401
        except ImportError as error:
            raise AdapterUnavailable("Pillow is not installed (uv sync)") from error
        self._font_path = resolve_font_path(brand)
        self._style = brand.caption_style

    @property
    def font_path(self) -> Path:
        return self._font_path

    def draw(
        self, lines: tuple[CaptionLine, ...], brand: Brand, into: Path
    ) -> tuple[tuple[Path, float, float], ...]:
        from PIL import Image, ImageDraw, ImageFont

        into.mkdir(parents=True, exist_ok=True)
        font = ImageFont.truetype(str(self._font_path), _FONT_SIZE)
        drawn: list[tuple[Path, float, float]] = []

        for position, line in enumerate(lines):
            frame = Image.new("RGBA", (VERTICAL_WIDTH, VERTICAL_HEIGHT), (0, 0, 0, 0))
            canvas = ImageDraw.Draw(frame)
            self._draw_line(canvas, font, line, brand)

            path = into / f"caption-{position:03d}.png"
            frame.save(path, "PNG")
            drawn.append((path, line.start_s, line.end_s))

        return tuple(drawn)

    def _draw_line(self, canvas, font, line: CaptionLine, brand: Brand) -> None:
        """One line, in whichever of the three brand-kit styles is selected."""
        wrapped = self._wrap(canvas, font, line.text)
        heights = [self._size(canvas, font, part)[1] for part in wrapped]
        block_height = sum(heights) + _LINE_SPACING * (len(wrapped) - 1)
        top = VERTICAL_HEIGHT - _BOTTOM_MARGIN - block_height

        primary = brand.primary.rgb
        contrast = brand.contrast.rgb

        for part, height in zip(wrapped, heights):
            width = self._size(canvas, font, part)[0]
            left = (VERTICAL_WIDTH - width) // 2
            box = (left - _PAD_X, top - _PAD_Y, left + width + _PAD_X, top + height + _PAD_Y)

            if self._style == "bold-highlight":
                # White words; the key phrase gets the brand's own colour
                # behind it, which is what "Bold highlight" means on S9.
                if line.highlight and line.highlight in part:
                    canvas.rounded_rectangle(box, radius=12, fill=(*primary, 235))
                canvas.text((left, top), part, font=font, fill=(255, 255, 255, 255))
            elif self._style == "editorial-serif":
                canvas.rounded_rectangle(box, radius=10, fill=(*contrast, 240))
                canvas.text((left, top), part, font=font, fill=(*primary, 255))
            else:  # clean-minimal: no plate at all, just the words.
                canvas.text((left, top), part, font=font, fill=(255, 255, 255, 255))

            top += height + _LINE_SPACING

    @staticmethod
    def _size(canvas, font, text: str) -> tuple[int, int]:
        left, top, right, bottom = canvas.textbbox((0, 0), text, font=font)
        return (right - left, bottom - top)

    def _wrap(self, canvas, font, text: str) -> list[str]:
        """Wrap to the frame, measured in pixels rather than characters."""
        usable = VERTICAL_WIDTH - 2 * (_SIDE_MARGIN + _PAD_X)
        parts: list[str] = []
        current = ""
        for word in text.split():
            candidate = f"{current} {word}".strip()
            if current and self._size(canvas, font, candidate)[0] > usable:
                parts.append(current)
                current = word
            else:
                current = candidate
        if current:
            parts.append(current)
        return parts or [text]

"""Reading and checking a client's `brand.json`.

The file mirrors the Brand kit screen (S9) and `packages/mock`'s `brandKit`, so
what a client sets in the studio is what the engine renders: the colours, the
caption style, the words to favour and the words to never say.

It is also where the rights record lives. CLAUDE.md non-negotiable 1 allows
only client-owned material, and non-negotiable 6 puts a gate in front of
scheduling, so a brand file with no rights record is not a configuration
mistake to paper over — the compliance gate blocks every cut made from it.

This module is a system boundary, so it validates and fails loudly. No
defaults are invented for anything that carries a claim.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

__all__ = [
    "Brand",
    "BrandError",
    "CAPTION_STYLES",
    "Colour",
    "RightsRecord",
    "load_brand",
]

CAPTION_STYLES = ("bold-highlight", "editorial-serif", "clean-minimal")
"""The three presets the Brand kit screen offers. No others are renderable."""

_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class BrandError(ValueError):
    """A brand file that cannot be trusted. The message names the field."""


@dataclass(frozen=True, slots=True)
class Colour:
    id: str
    name: str
    hex: str

    @property
    def rgb(self) -> tuple[int, int, int]:
        raw = self.hex.lstrip("#")
        return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16))


@dataclass(frozen=True, slots=True)
class RightsRecord:
    """Who owns the footage, and the signed record that says so."""

    holder: str
    record_id: str
    signed_on: date


@dataclass(frozen=True, slots=True)
class Brand:
    logo_label: str
    colours: tuple[Colour, ...]
    heading_font: str
    body_font: str
    caption_style: str
    words_always: tuple[str, ...]
    words_never: tuple[str, ...]
    rights: RightsRecord | None
    font_file: str | None

    def colour(self, colour_id: str) -> Colour | None:
        return next((colour for colour in self.colours if colour.id == colour_id), None)

    @property
    def primary(self) -> Colour:
        """The caption background and highlight colour: the first listed."""
        return self.colours[0]

    @property
    def contrast(self) -> Colour:
        """The light colour captions sit on. The second listed, else the first."""
        return self.colours[1] if len(self.colours) > 1 else self.colours[0]


def _require(raw: dict, key: str, kind: type) -> object:
    if key not in raw:
        raise BrandError(f"brand.json is missing {key!r}")
    value = raw[key]
    if not isinstance(value, kind):
        name = kind.__name__
        raise BrandError(f"brand.json {key!r} must be a {name}, got {type(value).__name__}")
    return value


def _strings(raw: dict, key: str) -> tuple[str, ...]:
    value = raw.get(key, [])
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise BrandError(f"brand.json {key!r} must be a list of strings")
    return tuple(value)


def _colours(raw: dict) -> tuple[Colour, ...]:
    listed = _require(raw, "colors", list)
    if not listed:
        raise BrandError("brand.json 'colors' is empty; captions have nothing to paint with")

    colours: list[Colour] = []
    for position, entry in enumerate(listed):
        if not isinstance(entry, dict):
            raise BrandError(f"brand.json colors[{position}] must be an object")
        missing = {"id", "name", "hex"} - entry.keys()
        if missing:
            fields = ", ".join(sorted(missing))
            raise BrandError(f"brand.json colors[{position}] is missing {fields}")
        if not _HEX.match(str(entry["hex"])):
            raise BrandError(
                f"brand.json colors[{position}].hex must look like #12545A, got {entry['hex']!r}"
            )
        colours.append(Colour(id=str(entry["id"]), name=str(entry["name"]), hex=str(entry["hex"])))
    return tuple(colours)


def _rights(raw: dict) -> RightsRecord | None:
    """Absent rights is a legal state, not a parse error.

    Returning None rather than raising is deliberate: the engine still runs, so
    a client can see what their footage would become, and every cut comes back
    blocked with the reason named. Refusing to run would hide the reason.
    """
    entry = raw.get("rights")
    if entry is None:
        return None
    if not isinstance(entry, dict):
        raise BrandError("brand.json 'rights' must be an object when present")

    missing = {"holder", "recordId", "signedOn"} - entry.keys()
    if missing:
        fields = ", ".join(sorted(missing))
        raise BrandError(f"brand.json 'rights' is missing {fields}")
    signed_on = str(entry["signedOn"])
    if not _ISO_DATE.match(signed_on):
        raise BrandError(f"brand.json rights.signedOn must be YYYY-MM-DD, got {signed_on!r}")

    return RightsRecord(
        holder=str(entry["holder"]),
        record_id=str(entry["recordId"]),
        signed_on=date.fromisoformat(signed_on),
    )


def load_brand(path: str | Path) -> Brand:
    """Read a brand file, or say exactly what is wrong with it."""
    file_path = Path(path)
    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise BrandError(f"no brand file at {file_path}") from error
    except json.JSONDecodeError as error:
        raise BrandError(
            f"{file_path} is not valid JSON: {error.msg} at line {error.lineno}"
        ) from error

    if not isinstance(raw, dict):
        raise BrandError(f"{file_path} must hold a JSON object")

    caption_style = str(raw.get("captionStyle", CAPTION_STYLES[0]))
    if caption_style not in CAPTION_STYLES:
        offered = ", ".join(CAPTION_STYLES)
        raise BrandError(f"brand.json captionStyle {caption_style!r} is not one of: {offered}")

    font_file = raw.get("fontFile")
    if font_file is not None and not isinstance(font_file, str):
        raise BrandError("brand.json 'fontFile' must be a path string when present")

    return Brand(
        logo_label=str(_require(raw, "logoLabel", str)),
        colours=_colours(raw),
        heading_font=str(raw.get("headingFont", "")),
        body_font=str(raw.get("bodyFont", "")),
        caption_style=caption_style,
        words_always=_strings(raw, "wordsAlways"),
        words_never=_strings(raw, "wordsNever"),
        rights=_rights(raw),
        font_file=font_file,
    )

"""brand.json is a boundary, so these tests are mostly about refusing input."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from pipeline.brand import BrandError, load_brand

from .conftest import BRAND_JSON


def write_brand(tmp_path: Path, **overrides) -> Path:
    raw = {**BRAND_JSON, **overrides}
    path = tmp_path / "brand.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    return path


def test_reads_every_field_from_a_good_file(brand_file: Path) -> None:
    # Arrange / Act
    brand = load_brand(brand_file)

    # Assert
    assert brand.logo_label == "Maya Torres Coaching"
    assert brand.caption_style == "bold-highlight"
    assert brand.primary.hex == "#12545A"
    assert brand.primary.rgb == (18, 84, 90)
    assert brand.words_never == ("hustle", "crush it", "guaranteed")
    assert brand.rights is not None
    assert brand.rights.signed_on == date(2026, 11, 9)


def test_missing_file_names_the_path(tmp_path: Path) -> None:
    with pytest.raises(BrandError, match="no brand file at"):
        load_brand(tmp_path / "absent.json")


def test_broken_json_names_the_line(tmp_path: Path) -> None:
    path = tmp_path / "brand.json"
    path.write_text("{ not json", encoding="utf-8")

    with pytest.raises(BrandError, match="not valid JSON"):
        load_brand(path)


def test_missing_logo_label_is_refused(tmp_path: Path) -> None:
    raw = {key: value for key, value in BRAND_JSON.items() if key != "logoLabel"}
    path = tmp_path / "brand.json"
    path.write_text(json.dumps(raw), encoding="utf-8")

    with pytest.raises(BrandError, match="logoLabel"):
        load_brand(path)


def test_empty_colours_are_refused(tmp_path: Path) -> None:
    with pytest.raises(BrandError, match="colors"):
        load_brand(write_brand(tmp_path, colors=[]))


def test_a_colour_that_is_not_a_hex_is_refused(tmp_path: Path) -> None:
    bad = [{"id": "x", "name": "X", "hex": "teal"}]

    with pytest.raises(BrandError, match="#12545A"):
        load_brand(write_brand(tmp_path, colors=bad))


def test_an_unknown_caption_style_is_refused(tmp_path: Path) -> None:
    with pytest.raises(BrandError, match="is not one of"):
        load_brand(write_brand(tmp_path, captionStyle="neon-shadow"))


def test_absent_rights_loads_but_reports_none(tmp_path: Path) -> None:
    """The engine must still run, so the gate can explain the block."""
    raw = {key: value for key, value in BRAND_JSON.items() if key != "rights"}
    path = tmp_path / "brand.json"
    path.write_text(json.dumps(raw), encoding="utf-8")

    brand = load_brand(path)

    assert brand.rights is None


def test_rights_with_a_bad_date_is_refused(tmp_path: Path) -> None:
    rights = {**BRAND_JSON["rights"], "signedOn": "9 Nov 2026"}

    with pytest.raises(BrandError, match="YYYY-MM-DD"):
        load_brand(write_brand(tmp_path, rights=rights))


def test_rights_missing_a_field_is_refused(tmp_path: Path) -> None:
    with pytest.raises(BrandError, match="recordId"):
        load_brand(write_brand(tmp_path, rights={"holder": "X", "signedOn": "2026-11-09"}))


def test_contrast_falls_back_to_the_only_colour(tmp_path: Path) -> None:
    single = [{"id": "ink", "name": "Ink", "hex": "#14171C"}]

    brand = load_brand(write_brand(tmp_path, colors=single))

    assert brand.contrast.hex == "#14171C"

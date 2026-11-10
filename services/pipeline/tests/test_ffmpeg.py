"""The ffmpeg wrapper: our own test clip in, a 9:16 file out."""

from __future__ import annotations

from pathlib import Path

import pytest

from pipeline.ffmpeg import (
    VERTICAL_HEIGHT,
    VERTICAL_WIDTH,
    FfmpegError,
    FfmpegMissing,
    cut_vertical,
    has_filter,
    make_test_clip,
    probe,
    reframe_filter,
    run,
)

from .conftest import needs_ffmpeg

pytestmark = pytest.mark.ffmpeg


def test_reframe_filter_targets_the_vertical_frame() -> None:
    filtergraph = reframe_filter()

    assert f"crop={VERTICAL_WIDTH}:{VERTICAL_HEIGHT}" in filtergraph
    assert "force_original_aspect_ratio=increase" in filtergraph


def test_a_missing_binary_is_its_own_error() -> None:
    with pytest.raises(FfmpegMissing):
        run(["ffmpeg-that-is-not-installed", "-version"])


@needs_ffmpeg
def test_we_can_generate_our_own_footage(tmp_path: Path) -> None:
    """No download, ever: the test clip is made here (non-negotiable 1)."""
    clip = make_test_clip(tmp_path / "source.mp4", seconds=4)

    assert clip.exists()
    assert clip.stat().st_size > 0


@needs_ffmpeg
def test_probe_reports_duration_and_size(source_video: Path, clip_seconds: int) -> None:
    probed = probe(source_video)

    assert probed.duration_s == pytest.approx(clip_seconds, abs=1.0)
    assert (probed.width, probed.height) == (1280, 720)
    assert probed.has_audio is True


@needs_ffmpeg
def test_probe_refuses_something_that_is_not_a_video(tmp_path: Path) -> None:
    fake = tmp_path / "not-a-video.mp4"
    fake.write_text("hello", encoding="utf-8")

    with pytest.raises(FfmpegError):
        probe(fake)


@needs_ffmpeg
def test_a_cut_comes_out_vertical_and_the_right_length(source_video: Path, tmp_path: Path) -> None:
    out = cut_vertical(
        source=source_video,
        destination=tmp_path / "cut-01.mp4",
        start_s=5.0,
        duration_s=20.0,
    )

    probed = probe(out)
    assert (probed.width, probed.height) == (VERTICAL_WIDTH, VERTICAL_HEIGHT)
    assert probed.duration_s == pytest.approx(20.0, abs=1.0)


@needs_ffmpeg
def test_a_cut_keeps_its_audio(source_video: Path, tmp_path: Path) -> None:
    out = cut_vertical(
        source=source_video,
        destination=tmp_path / "cut-01.mp4",
        start_s=1.0,
        duration_s=5.0,
    )

    assert probe(out).has_audio is True


@needs_ffmpeg
def test_caption_overlays_are_composited(source_video: Path, tmp_path: Path, brand) -> None:
    """The whole reason for the PNG route: the overlay has to actually land."""
    from pipeline.models import CaptionLine
    from pipeline.multiplier.captions import PillowCaptionBurner

    lines = (CaptionLine(text="Burnout is not", start_s=0.0, end_s=4.0),)
    overlays = PillowCaptionBurner(brand).draw(lines, brand, tmp_path / "captions")

    plain = cut_vertical(source_video, tmp_path / "plain.mp4", 2.0, 5.0)
    captioned = cut_vertical(source_video, tmp_path / "captioned.mp4", 2.0, 5.0, overlays=overlays)

    # Same source window, same settings; the only difference is the caption,
    # so the encoded bytes must differ.
    assert captioned.read_bytes() != plain.read_bytes()


@needs_ffmpeg
def test_the_filter_we_composite_with_is_present() -> None:
    """`overlay` is the one filter the caption route cannot do without.

    `drawtext` is deliberately not asserted either way: it is absent on this
    Mac's Homebrew build and present on Ubuntu's, and the engine draws with
    Pillow on both so the samples look identical wherever they are made.
    docs/DECISIONS.md D16 covers the choice.
    """
    assert has_filter("overlay") is True

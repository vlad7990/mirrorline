"""`make-samples` end to end, on footage we generated ourselves."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.cli import main

from .conftest import BRAND_JSON, needs_ffmpeg

pytestmark = pytest.mark.ffmpeg

# Three cuts, not twelve. The 8-12 promise is asserted on the moment finder,
# which is the stage that decides it; encoding nine more 1080x1920 files here
# would add minutes to CI and prove nothing new.
TEST_CUTS = "3"


@needs_ffmpeg
def test_writes_cuts_and_a_summary(sidecar_video: Path, brand_file: Path, tmp_path: Path) -> None:
    # Arrange
    out = tmp_path / "samples"

    # Act
    code = main([str(sidecar_video), str(brand_file), "--out", str(out), "--cuts", TEST_CUTS])

    # Assert
    assert code == 0
    assert sorted(path.name for path in out.glob("*.mp4")) == [
        "cut-01.mp4",
        "cut-02.mp4",
        "cut-03.mp4",
    ]
    assert (out / "summary.json").exists()


@needs_ffmpeg
def test_the_summary_carries_what_a_reviewer_needs(
    sidecar_video: Path, brand_file: Path, tmp_path: Path
) -> None:
    out = tmp_path / "samples"
    main([str(sidecar_video), str(brand_file), "--out", str(out), "--cuts", TEST_CUTS])

    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))

    assert summary["counts"]["cuts"] == 3
    for cut in summary["cuts"]:
        assert cut["hook"]
        assert cut["format"]
        assert cut["lengthLabel"].count(":") == 1
        assert isinstance(cut["score"], int)
        assert cut["compliance"]["status"] in {"pass", "needs-review", "blocked"}
        assert Path(cut["file"]).exists()


@needs_ffmpeg
def test_the_summary_says_which_adapters_answered(
    sidecar_video: Path, brand_file: Path, tmp_path: Path
) -> None:
    """A stub run must never read like a model run."""
    out = tmp_path / "samples"
    main([str(sidecar_video), str(brand_file), "--out", str(out), "--cuts", TEST_CUTS])

    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))

    assert summary["adapters"]["transcriber"] == "script-sidecar (json)"
    assert summary["adapters"]["momentFinder"] == "heuristic"
    assert summary["adapters"]["captionBurner"] == "pillow-overlay"
    assert summary["flags"]["useClaude"] is False


@needs_ffmpeg
def test_asking_for_claude_without_a_cap_refuses_and_writes_nothing(
    sidecar_video: Path, brand_file: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """CLAUDE.md rule 11, asserted on the path that could spend money."""
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    out = tmp_path / "samples"

    code = main([str(sidecar_video), str(brand_file), "--out", str(out), "--use-claude"])

    assert code == 2
    assert not (out / "summary.json").exists()


@needs_ffmpeg
def test_cuts_without_rights_are_blocked_but_still_reported(
    sidecar_video: Path, tmp_path: Path
) -> None:
    """The engine ran, so the file exists and says why nothing can ship."""
    raw = {key: value for key, value in BRAND_JSON.items() if key != "rights"}
    brand_path = tmp_path / "no-rights.json"
    brand_path.write_text(json.dumps(raw), encoding="utf-8")
    out = tmp_path / "samples"

    code = main([str(sidecar_video), str(brand_path), "--out", str(out), "--cuts", TEST_CUTS])

    summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
    assert code == 0
    assert summary["counts"]["blocked"] == summary["counts"]["cuts"]
    assert summary["source"]["rightsHolder"] is None
    assert any(
        finding["rule"] == "rights-flag" and finding["status"] == "blocked"
        for finding in summary["cuts"][0]["compliance"]["findings"]
    )


def test_a_missing_video_is_bad_input(brand_file: Path, tmp_path: Path) -> None:
    code = main([str(tmp_path / "absent.mp4"), str(brand_file), "--out", str(tmp_path / "out")])

    assert code == 2


@needs_ffmpeg
def test_a_broken_brand_file_is_bad_input(sidecar_video: Path, tmp_path: Path) -> None:
    broken = tmp_path / "broken.json"
    broken.write_text("{ nope", encoding="utf-8")

    code = main([str(sidecar_video), str(broken), "--out", str(tmp_path / "out")])

    assert code == 2


@needs_ffmpeg
def test_a_video_with_no_transcript_beside_it_is_refused(
    source_video: Path, brand_file: Path, tmp_path: Path
) -> None:
    """No model and no script means no words, and no invented ones either."""
    lonely = tmp_path / "lonely.mp4"
    lonely.write_bytes(source_video.read_bytes())

    code = main(
        [
            str(lonely),
            str(brand_file),
            "--out",
            str(tmp_path / "out"),
            "--transcriber",
            "script-sidecar",
        ]
    )

    assert code == 2

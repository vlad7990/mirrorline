"""The transcribe adapters: the chain, and the sidecar that never invents words."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.adapters.base import AdapterUnavailable, Transcriber
from pipeline.adapters.transcribe import (
    FasterWhisperTranscriber,
    ScriptTranscriber,
    WhisperXTranscriber,
    resolve_transcriber,
)


def test_script_transcriber_reads_word_timings(sidecar_video: Path) -> None:
    # Arrange
    transcriber = ScriptTranscriber()

    # Act
    transcript = transcriber.transcribe(sidecar_video)

    # Assert
    assert transcript.words
    assert transcript.source == "script-sidecar (json)"
    assert transcript.words[0].text == "Burnout"
    assert transcript.words[0].start_s == pytest.approx(0.0, abs=0.01)


def test_script_transcriber_reads_plain_text_and_says_timings_are_estimated(
    tmp_path: Path,
) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"not really a video, never opened by this adapter")
    (tmp_path / "clip.mp4.script.txt").write_text("one two three four", encoding="utf-8")

    transcript = ScriptTranscriber(duration_s=4.0).transcribe(video)

    assert [word.text for word in transcript.words] == ["one", "two", "three", "four"]
    assert "estimated timings" in transcript.source
    assert transcript.words[-1].end_s == pytest.approx(4.0)


def test_script_transcriber_refuses_when_there_is_nothing_to_read(tmp_path: Path) -> None:
    """The point of the whole adapter: no script means no invented words."""
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"x")

    with pytest.raises(AdapterUnavailable, match="no script beside"):
        ScriptTranscriber().transcribe(video)


def test_script_transcriber_refuses_an_empty_words_list(tmp_path: Path) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"x")
    (tmp_path / "clip.mp4.transcript.json").write_text(json.dumps({"words": []}), encoding="utf-8")

    with pytest.raises(ValueError, match="non-empty 'words' list"):
        ScriptTranscriber().transcribe(video)


def test_script_transcriber_refuses_a_word_without_timings(tmp_path: Path) -> None:
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"x")
    (tmp_path / "clip.mp4.transcript.json").write_text(
        json.dumps({"words": [{"text": "hello"}]}), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="needs text, start and end"):
        ScriptTranscriber().transcribe(video)


def test_resolver_returns_something_that_satisfies_the_interface() -> None:
    resolved = resolve_transcriber(duration_s=10.0)

    assert isinstance(resolved, Transcriber)


def test_resolver_prefers_a_real_model_when_one_is_installed() -> None:
    """Order is the promise: whisperx, then faster-whisper, then the sidecar.

    Which one answers depends on the machine, so the assertion is about the
    order holding rather than about a particular name.
    """
    resolved = resolve_transcriber(duration_s=10.0)

    try:
        WhisperXTranscriber()
    except AdapterUnavailable:
        pass
    else:
        assert resolved.name == "whisperx"
        return

    try:
        FasterWhisperTranscriber()
    except AdapterUnavailable:
        assert resolved.name == "script-sidecar"
    else:
        assert resolved.name == "faster-whisper"


def test_pinning_an_unknown_transcriber_is_refused() -> None:
    with pytest.raises(ValueError, match="unknown transcriber"):
        resolve_transcriber("whisper-ultra")


def test_pinning_does_not_silently_fall_back() -> None:
    """A run told to use whisperx must fail loudly if whisperx is absent."""
    try:
        WhisperXTranscriber()
    except AdapterUnavailable:
        with pytest.raises(AdapterUnavailable):
            resolve_transcriber("whisperx")
    else:
        pytest.skip("whisperx is installed here, so there is no fallback to prove")

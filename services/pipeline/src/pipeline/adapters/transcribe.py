"""Transcribers, in the order we want them.

WhisperX first: it returns word-level timestamps directly, which is what the
captions need. faster-whisper second: same models, word timestamps available,
no alignment stage. Both are heavy, optional installs, so both import lazily
and raise `AdapterUnavailable` when they are not here.

Third is `ScriptTranscriber`, and it is deliberately not a mock. It reads a
transcript or a script a human put next to the video; if there is none, it
refuses. Nothing in this module ever invents words. A fabricated transcript
would become a fabricated hook and then a sample we show a client, and
CLAUDE.md non-negotiable 7 does not leave room for that.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from ..models import Transcript, Word
from .base import AdapterUnavailable, Transcriber

__all__ = [
    "FasterWhisperTranscriber",
    "ScriptTranscriber",
    "WhisperXTranscriber",
    "resolve_transcriber",
]

_DEFAULT_MODEL = "small"
_WORDS_PER_SECOND = 2.6
"""Only used to spread a plain-text script. Ordinary speech, roughly."""


class WhisperXTranscriber:
    """WhisperX with word timestamps. Preferred when installed."""

    name = "whisperx"

    def __init__(self, model_size: str = _DEFAULT_MODEL, device: str = "cpu") -> None:
        try:
            import whisperx  # noqa: F401
        except ImportError as error:
            raise AdapterUnavailable(
                "whisperx is not installed (uv sync --extra transcribe-whisperx)"
            ) from error
        self._model_size = model_size
        self._device = device

    def transcribe(self, video_path: Path) -> Transcript:
        import whisperx

        audio = whisperx.load_audio(str(video_path))
        model = whisperx.load_model(self._model_size, self._device, compute_type="int8")
        rough = model.transcribe(audio)

        language = rough.get("language", "en")
        aligner, metadata = whisperx.load_align_model(language_code=language, device=self._device)
        aligned = whisperx.align(rough["segments"], aligner, metadata, audio, self._device)

        words: list[Word] = []
        for segment in aligned.get("word_segments", []):
            text = str(segment.get("word", "")).strip()
            start = segment.get("start")
            end = segment.get("end")
            # WhisperX leaves start/end off a word it could not place. A word
            # with no timing cannot be captioned, so it is dropped rather than
            # guessed into the wrong line.
            if text and start is not None and end is not None:
                words.append(Word(text=text, start_s=float(start), end_s=float(end)))

        duration = len(audio) / 16000 if len(audio) else 0.0
        return Transcript(words=tuple(words), duration_s=duration, source=self.name)


class FasterWhisperTranscriber:
    """faster-whisper with `word_timestamps=True`. The fallback."""

    name = "faster-whisper"

    def __init__(self, model_size: str = _DEFAULT_MODEL, device: str = "cpu") -> None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as error:
            raise AdapterUnavailable(
                "faster-whisper is not installed (uv sync --extra transcribe)"
            ) from error
        self._model = WhisperModel(model_size, device=device, compute_type="int8")

    def transcribe(self, video_path: Path) -> Transcript:
        segments, info = self._model.transcribe(str(video_path), word_timestamps=True)

        words: list[Word] = []
        for segment in segments:
            for word in segment.words or []:
                text = str(word.word).strip()
                if text and word.start is not None and word.end is not None:
                    words.append(Word(text=text, start_s=float(word.start), end_s=float(word.end)))

        return Transcript(
            words=tuple(words),
            duration_s=float(getattr(info, "duration", 0.0)),
            source=self.name,
        )


class ScriptTranscriber:
    """A transcript or script a human supplied next to the video.

    Two shapes, in order of preference:

    * `<video>.transcript.json` — `{"words": [{"text", "start", "end"}, ...]}`.
      Real timings, so captions land where the words land.
    * `<video>.script.txt` — plain text. Timings are spread evenly across the
      duration, which is an estimate, and the transcript says so in `source`
      so the summary cannot imply more precision than there is.
    """

    name = "script-sidecar"

    def __init__(self, duration_s: float | None = None) -> None:
        self._duration_s = duration_s

    @staticmethod
    def sidecar_for(video_path: Path) -> Path | None:
        for suffix in (".transcript.json", ".script.txt"):
            candidate = video_path.with_suffix(video_path.suffix + suffix)
            if candidate.exists():
                return candidate
            bare = video_path.with_suffix(suffix)
            if bare.exists():
                return bare
        return None

    def transcribe(self, video_path: Path) -> Transcript:
        sidecar = self.sidecar_for(video_path)
        if sidecar is None:
            raise AdapterUnavailable(
                f"no transcriber available and no script beside {video_path.name}. "
                "Install a model (uv sync --extra transcribe) or add "
                f"{video_path.name}.script.txt"
            )

        if sidecar.name.endswith(".transcript.json"):
            return self._from_json(sidecar)
        return self._from_text(sidecar)

    def _from_json(self, sidecar: Path) -> Transcript:
        try:
            raw = json.loads(sidecar.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError(f"{sidecar} is not valid JSON: {error.msg}") from error

        entries = raw.get("words") if isinstance(raw, dict) else None
        if not isinstance(entries, list) or not entries:
            raise ValueError(f"{sidecar} needs a non-empty 'words' list")

        words: list[Word] = []
        for position, entry in enumerate(entries):
            if not isinstance(entry, dict) or {"text", "start", "end"} - entry.keys():
                raise ValueError(f"{sidecar} words[{position}] needs text, start and end")
            words.append(
                Word(
                    text=str(entry["text"]).strip(),
                    start_s=float(entry["start"]),
                    end_s=float(entry["end"]),
                )
            )

        duration = self._duration_s or max(word.end_s for word in words)
        return Transcript(words=tuple(words), duration_s=duration, source=f"{self.name} (json)")

    def _from_text(self, sidecar: Path) -> Transcript:
        tokens = sidecar.read_text(encoding="utf-8").split()
        if not tokens:
            raise ValueError(f"{sidecar} is empty")

        duration = self._duration_s or len(tokens) / _WORDS_PER_SECOND
        per_word = duration / len(tokens)
        words = tuple(
            Word(text=token, start_s=position * per_word, end_s=(position + 1) * per_word)
            for position, token in enumerate(tokens)
        )
        return Transcript(
            words=words,
            duration_s=duration,
            source=f"{self.name} (text, estimated timings)",
        )


def resolve_transcriber(
    preferred: str | None = None, duration_s: float | None = None
) -> Transcriber:
    """The best transcriber this machine can actually run.

    `preferred` pins one by name and then does not fall back: a run that was
    asked for whisperx and silently got a sidecar would make the summary a
    lie about how the words were obtained.
    """
    builders: dict[str, Callable[[], Transcriber]] = {
        WhisperXTranscriber.name: WhisperXTranscriber,
        FasterWhisperTranscriber.name: FasterWhisperTranscriber,
        ScriptTranscriber.name: lambda: ScriptTranscriber(duration_s=duration_s),
    }

    if preferred is not None:
        if preferred not in builders:
            offered = ", ".join(builders)
            raise ValueError(f"unknown transcriber {preferred!r}; try one of: {offered}")
        return builders[preferred]()

    problems: list[str] = []
    for name, build in builders.items():
        try:
            return build()
        except AdapterUnavailable as error:
            problems.append(f"{name}: {error}")

    raise AdapterUnavailable("no transcriber available.\n  " + "\n  ".join(problems))

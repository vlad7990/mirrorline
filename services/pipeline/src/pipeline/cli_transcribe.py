"""`transcribe-source` — the words, once, so a re-cut never pays for them twice.

================================================================================
Why this is its own command
================================================================================

`render-short` takes the words in its plan rather than finding them, and that
separation is the point. Transcribing an hour of audio is the expensive minute
of the job; cutting a second short from the same upload must not repeat it. So
the worker runs this once, stores the result in `transcripts` (one row per
asset, uniquely), and every render afterwards reads the row.

It also keeps the refusal in the right place. The transcriber chain is
whisperx → faster-whisper → script sidecar, and with no model installed the
chain ends at a sidecar or at nothing — `AdapterUnavailable`, exit 1, and
**nothing in this engine invents words**. A made-up transcript becomes a
made-up caption over a client's own face, which non-negotiable 7 does not
allow.

The output goes to stdout as JSON by default, because the caller is a worker
reading a pipe. `--out` writes a file instead, for a human debugging a source
that transcribed oddly.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .adapters.base import AdapterUnavailable
from .adapters.transcribe import resolve_transcriber
from .ffmpeg import FfmpegError, FfmpegMissing, probe

__all__ = ["main"]


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="transcribe-source",
        description="Word-level transcript for one video, as JSON.",
    )
    parser.add_argument("video", help="Path to the source video")
    parser.add_argument(
        "--transcriber",
        default=None,
        help="Pin one: whisperx, faster-whisper, script-sidecar. Default: best available.",
    )
    parser.add_argument("--out", default=None, help="Write JSON here instead of to stdout")
    return parser


def main(argv: list[str] | None = None) -> int:
    arguments = _parser().parse_args(argv)
    video = Path(arguments.video)

    if not video.exists():
        print(f"transcribe-source: {video} does not exist", file=sys.stderr)
        return 2

    try:
        source = probe(video)
    except (FfmpegError, FfmpegMissing) as error:
        print(f"transcribe-source: {error}", file=sys.stderr)
        return 1

    if not source.has_audio:
        # Every later stage assumes speech. Saying so here costs one probe;
        # finding out later costs a transcription of silence.
        print(f"transcribe-source: {video.name} has no audio track", file=sys.stderr)
        return 1

    try:
        transcriber = resolve_transcriber(arguments.transcriber, duration_s=source.duration_s)
        transcript = transcriber.transcribe(video)
    except AdapterUnavailable as error:
        print(f"transcribe-source: {error}", file=sys.stderr)
        return 1
    except ValueError as error:
        print(f"transcribe-source: {error}", file=sys.stderr)
        return 2

    if not transcript.words:
        print(f"transcribe-source: {video.name} produced no words", file=sys.stderr)
        return 1

    payload = {
        # The adapter's own name, carried all the way to the studio. A run
        # backed by a sidecar must never read like a run backed by a model.
        "engine": transcript.source,
        # The language is not reported by the adapters, so it is null rather
        # than assumed to be English — `transcripts.language` stays honest
        # about not knowing.
        "language": None,
        "durationS": round(transcript.duration_s, 3),
        "wordCount": len(transcript.words),
        "words": [
            {"text": word.text, "start": round(word.start_s, 3), "end": round(word.end_s, 3)}
            for word in transcript.words
        ],
        "source": {
            "durationS": round(source.duration_s, 3),
            "width": source.width,
            "height": source.height,
            "hasAudio": source.has_audio,
        },
    }

    text = json.dumps(payload)
    if arguments.out:
        Path(arguments.out).write_text(text + "\n", encoding="utf-8")
    else:
        print(text)

    return 0


if __name__ == "__main__":  # pragma: no cover - module entry point
    raise SystemExit(main())

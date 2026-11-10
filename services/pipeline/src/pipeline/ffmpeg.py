"""The only place that shells out to ffmpeg.

ffmpeg is a separate, unmodified binary we invoke, never a library we link, and
never code we vendor. That keeps it on the right side of CLAUDE.md rule 10 the
same way Postiz is: a service alongside us, not a part of us. Homebrew's build
is GPL, so if it is ever shipped inside an image rather than called on a
machine, that needs a licence review first (docs/DECISIONS.md D16).

Everything here is a thin, testable wrapper: build an argument list, run it,
raise with the tail of stderr if it fails. No filter strings are assembled
anywhere else in the engine.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

__all__ = [
    "FfmpegError",
    "FfmpegMissing",
    "Probe",
    "VERTICAL_HEIGHT",
    "VERTICAL_WIDTH",
    "cut_vertical",
    "ffmpeg_available",
    "has_filter",
    "make_test_clip",
    "probe",
    "reframe_filter",
    "run",
]

VERTICAL_WIDTH = 1080
VERTICAL_HEIGHT = 1920
"""9:16 at the size every platform accepts without re-encoding it again."""

_STDERR_TAIL = 2000
_TIMEOUT_S = 600


class FfmpegMissing(RuntimeError):
    """ffmpeg is not on PATH. The caller decides whether that is fatal."""


class FfmpegError(RuntimeError):
    """ffmpeg ran and failed. Carries the tail of what it printed."""


@dataclass(frozen=True, slots=True)
class Probe:
    duration_s: float
    width: int
    height: int
    has_audio: bool


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def has_filter(name: str) -> bool:
    """Whether this build carries a filter.

    Asked before captions are drawn: a build without `drawtext` cannot burn
    text, and the engine has to know that rather than discover it mid-render.
    """
    if shutil.which("ffmpeg") is None:
        return False
    try:
        listed = subprocess.run(
            ["ffmpeg", "-hide_banner", "-filters"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    for line in listed.stdout.splitlines():
        parts = line.split()
        # A filter line looks like: " ... scale  V->V  Scale the input video."
        if len(parts) >= 2 and parts[1] == name:
            return True
    return False


def run(args: list[str]) -> str:
    """Run ffmpeg or ffprobe. Returns stdout; raises with stderr on failure."""
    if shutil.which(args[0]) is None:
        raise FfmpegMissing(f"{args[0]} is not on PATH")
    try:
        completed = subprocess.run(
            args, capture_output=True, text=True, timeout=_TIMEOUT_S, check=False
        )
    except subprocess.TimeoutExpired as error:
        raise FfmpegError(f"{args[0]} timed out after {_TIMEOUT_S}s") from error
    except OSError as error:
        raise FfmpegError(f"{args[0]} could not start: {error}") from error

    if completed.returncode != 0:
        tail = (completed.stderr or "").strip()[-_STDERR_TAIL:]
        raise FfmpegError(f"{args[0]} exited {completed.returncode}:\n{tail}")
    return completed.stdout


def probe(video_path: str | Path) -> Probe:
    """Duration and frame size, straight from ffprobe."""
    raw = run(
        [
            "ffprobe",
            "-hide_banner",
            "-loglevel",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(video_path),
        ]
    )
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as error:
        raise FfmpegError(f"ffprobe returned output that is not JSON: {error.msg}") from error

    streams = parsed.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        raise FfmpegError(f"{video_path} has no video stream")

    try:
        duration_s = float(parsed.get("format", {}).get("duration", 0.0))
    except (TypeError, ValueError) as error:
        raise FfmpegError(f"{video_path} reports no usable duration") from error
    if duration_s <= 0:
        raise FfmpegError(f"{video_path} reports a duration of {duration_s}s")

    return Probe(
        duration_s=duration_s,
        width=int(video.get("width") or 0),
        height=int(video.get("height") or 0),
        has_audio=any(s.get("codec_type") == "audio" for s in streams),
    )


def reframe_filter() -> str:
    """Scale to cover 1080x1920, then centre-crop.

    A centre crop, stated plainly. Nothing here follows a face or a speaker:
    that is a later job for the Remake Producer, and pretending otherwise in v0
    would put a claim in the product that the code does not keep.
    """
    return (
        f"scale={VERTICAL_WIDTH}:{VERTICAL_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={VERTICAL_WIDTH}:{VERTICAL_HEIGHT},setsar=1"
    )


def cut_vertical(
    source: str | Path,
    destination: str | Path,
    start_s: float,
    duration_s: float,
    overlays: tuple[tuple[Path, float, float], ...] = (),
) -> Path:
    """Cut one window, reframe it to 9:16, and composite caption images.

    `overlays` is (png_path, start, end) with times relative to the cut, not to
    the source: seeking with -ss before -i rebases output timestamps to zero,
    so the caller converts once and the filter graph stays readable.

    One encode, not two. These files are sales samples, so they do not get
    re-compressed just to keep the code tidy.
    """
    source_path = Path(source)
    out_path = Path(destination)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    args: list[str] = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        f"{start_s:.3f}",
        "-t",
        f"{duration_s:.3f}",
        "-i",
        str(source_path),
    ]
    for png_path, _, _ in overlays:
        args += ["-i", str(png_path)]

    chain = [f"[0:v]{reframe_filter()}[base]"]
    label = "base"
    for position, (_, overlay_start, overlay_end) in enumerate(overlays, start=1):
        nxt = f"v{position}"
        chain.append(
            f"[{label}][{position}:v]overlay=x=0:y=0:"
            f"enable='between(t,{overlay_start:.3f},{overlay_end:.3f})'[{nxt}]"
        )
        label = nxt

    args += ["-filter_complex", ";".join(chain), "-map", f"[{label}]"]
    # Audio is mapped when it exists and dropped silently when it does not, so
    # a silent test clip renders the same way a real episode does.
    args += ["-map", "0:a?", "-c:a", "aac", "-b:a", "128k"]
    args += [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out_path),
    ]

    run(args)
    if not out_path.exists() or out_path.stat().st_size == 0:
        raise FfmpegError(f"ffmpeg reported success but {out_path} is empty")
    return out_path


def make_test_clip(destination: str | Path, seconds: int = 90) -> Path:
    """Generate our own test footage: a test pattern plus a silent track.

    CLAUDE.md non-negotiable 1, and the reason this function exists at all:
    the engine is never tested against somebody else's video. `testsrc2` and
    `anullsrc` are generated by ffmpeg on the spot, so nothing is downloaded
    and nothing is anyone's property.
    """
    out_path = Path(destination)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"testsrc2=size=1280x720:rate=30:duration={seconds}",
            "-f",
            "lavfi",
            "-i",
            f"anullsrc=channel_layout=stereo:sample_rate=44100:duration={seconds}",
            "-shortest",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            str(out_path),
        ]
    )
    return out_path

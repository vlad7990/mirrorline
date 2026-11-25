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
    "Encoder",
    "FfmpegError",
    "FfmpegMissing",
    "Probe",
    "VERTICAL_HEIGHT",
    "VERTICAL_WIDTH",
    "burn_poster",
    "concat_filter",
    "cut_vertical",
    "ffmpeg_available",
    "font_families",
    "has_encoder",
    "has_filter",
    "make_test_clip",
    "pick_h264_encoder",
    "probe",
    "reframe_filter",
    "render_segments",
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


def has_encoder(name: str) -> bool:
    """Whether this build carries an encoder.

    Asked because the worker image ships an **LGPL** ffmpeg, and the LGPL build
    has no libx264 — x264 is GPL-only, which is the whole reason the licence
    question had an answer worth writing down. So the encoder is chosen at
    runtime rather than hard-coded, and both answers are real: Vlad's laptop has
    x264, the container has openh264.
    """
    if shutil.which("ffmpeg") is None:
        return False
    try:
        listed = subprocess.run(
            ["ffmpeg", "-hide_banner", "-encoders"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    for line in listed.stdout.splitlines():
        parts = line.split()
        # An encoder line looks like: " V....D libx264  libx264 H.264 ..."
        if len(parts) >= 2 and parts[1] == name:
            return True
    return False


@dataclass(frozen=True, slots=True)
class Encoder:
    """Which H.264 encoder to use, and the arguments it takes.

    The arguments differ in kind rather than in value, which is why this is a
    pair and not a name: x264 takes a quality target (`-crf`) and a speed
    preset; openh264 takes neither and wants a bitrate. Passing x264's flags to
    openh264 does not fail loudly — some are ignored — so the flags travel with
    the choice.
    """

    name: str
    args: tuple[str, ...]
    #: True when this is the one with no GPL component. Recorded in summary.json.
    is_lgpl: bool


#: 8 Mbps at 1080x1920. Platforms re-encode on ingest anyway, so this is about
#: giving their encoder clean input rather than about the file we keep.
_OPENH264_BITRATE = "8M"

_X264 = Encoder(
    name="libx264",
    args=("-preset", "veryfast", "-crf", "20"),
    is_lgpl=False,
)

_OPENH264 = Encoder(
    name="libopenh264",
    args=("-b:v", _OPENH264_BITRATE, "-maxrate", _OPENH264_BITRATE, "-bufsize", "16M"),
    is_lgpl=True,
)


def pick_h264_encoder() -> Encoder:
    """The H.264 encoder this build can actually run.

    **openh264 first.** On the laptop both exist, and preferring the LGPL one
    means the thing that gets looked at is the thing the container will produce
    — quality included. Discovering openh264's bitrate ladder in production,
    after months of judging x264 output, is how a licence decision turns into a
    surprise.
    """
    if has_encoder(_OPENH264.name):
        return _OPENH264
    if has_encoder(_X264.name):
        return _X264
    raise FfmpegError(
        "this ffmpeg has neither libopenh264 nor libx264, so it cannot write H.264"
    )


def font_families() -> frozenset[str]:
    """Every font family fontconfig can see, or an empty set.

    Empty means "we could not ask", not "there are none" — `fc-list` is absent
    on a minimal image until `fontconfig` is installed. The caller treats the
    two differently: `pick_font_family` stays optimistic when it cannot ask, and
    picks a known fallback when it can.
    """
    if shutil.which("fc-list") is None:
        return frozenset()
    try:
        listed = subprocess.run(
            ["fc-list", ":", "family"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return frozenset()

    families: set[str] = set()
    for line in listed.stdout.splitlines():
        # fc-list prints comma-separated aliases: "DejaVu Sans,DejaVu Sans Book"
        for alias in line.split(","):
            name = alias.strip()
            if name:
                families.add(name)
    return frozenset(families)


def concat_filter(
    windows: tuple[tuple[float, float], ...],
    with_audio: bool,
    ass_path: Path | None = None,
) -> tuple[str, str, str | None]:
    """The filter graph that cuts, reframes, joins and captions in one pass.

    Returns `(graph, video_label, audio_label)`.

    ============================================================================
    Why `trim` rather than one ffmpeg run per window
    ============================================================================

    `cut_vertical` runs once per cut because each sample is its own file. A beat
    short is the opposite shape: four windows of one source become **one** file,
    and the obvious implementation — cut four temporary files, then concat them
    — encodes everything twice and writes four files nobody wanted. `trim` plus
    `concat` does it in a single pass, which is also the only way the captions
    can be burned against the final timeline rather than against each piece.

    `setpts=PTS-STARTPTS` after each trim is what makes the join seamless: a
    trimmed stream keeps its original timestamps, so without the rebase the
    second segment starts wherever it started in the source and the concat
    filter produces a video with a ten-minute gap in it.
    """
    chains: list[str] = []
    parts: list[str] = []

    for index, (start_s, end_s) in enumerate(windows):
        chains.append(
            f"[0:v]trim=start={start_s:.3f}:end={end_s:.3f},setpts=PTS-STARTPTS,"
            f"{reframe_filter()}[v{index}]"
        )
        parts.append(f"[v{index}]")
        if with_audio:
            chains.append(
                f"[0:a]atrim=start={start_s:.3f}:end={end_s:.3f},asetpts=PTS-STARTPTS[a{index}]"
            )
            parts.append(f"[a{index}]")

    count = len(windows)
    if with_audio:
        chains.append(f"{''.join(parts)}concat=n={count}:v=1:a=1[vcat][acat]")
        video_label, audio_label = "vcat", "acat"
    else:
        chains.append(f"{''.join(parts)}concat=n={count}:v=1:a=0[vcat]")
        video_label, audio_label = "vcat", None

    if ass_path is not None:
        # The path is escaped for the filter parser, where `:` separates options
        # and `'` quotes them. A container path is unlikely to contain either,
        # and "unlikely" is how a render fails on somebody's machine at 2am.
        escaped = str(ass_path).replace("\\", "\\\\").replace(":", r"\:").replace("'", r"\'")
        chains.append(f"[{video_label}]ass='{escaped}'[vout]")
        video_label = "vout"

    return (";".join(chains), video_label, audio_label)


def render_segments(
    source: str | Path,
    destination: str | Path,
    windows: tuple[tuple[float, float], ...],
    *,
    ass_path: Path | None = None,
    with_audio: bool = True,
    encoder: Encoder | None = None,
) -> Path:
    """Four beats of one source become one captioned 9:16 short. One encode.

    `with_audio=False` adds a silent track rather than writing a file with no
    audio stream: a video with no audio stream is rejected or silently
    re-encoded by several platforms, and a generated test clip must render the
    same way a real episode does.
    """
    if not windows:
        raise FfmpegError("a short needs at least one window")

    source_path = Path(source)
    out_path = Path(destination)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    chosen = encoder or pick_h264_encoder()
    graph, video_label, audio_label = concat_filter(windows, with_audio, ass_path)

    args: list[str] = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source_path)]

    if audio_label is None:
        args += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]

    args += ["-filter_complex", graph, "-map", f"[{video_label}]"]
    args += ["-map", f"[{audio_label}]"] if audio_label is not None else ["-map", "1:a", "-shortest"]
    args += ["-c:a", "aac", "-b:a", "128k", "-ar", "48000"]
    args += ["-c:v", chosen.name, *chosen.args]
    args += ["-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out_path)]

    run(args)
    if not out_path.exists() or out_path.stat().st_size == 0:
        raise FfmpegError(f"ffmpeg reported success but {out_path} is empty")
    return out_path


def burn_poster(video_path: str | Path, destination: str | Path, at_s: float = 1.0) -> Path:
    """One frame as a JPEG, for the card in the studio.

    A second into the video rather than the first frame: the first frame of a
    cut is often mid-blink or mid-fade, and a poster is the one image a client
    judges the video by before pressing play.
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
            "-ss",
            f"{max(0.0, at_s):.3f}",
            "-i",
            str(video_path),
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(out_path),
        ]
    )

    if not out_path.exists() or out_path.stat().st_size == 0:
        raise FfmpegError(f"ffmpeg wrote no poster to {out_path}")
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

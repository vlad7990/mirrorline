"""The Claude moment finder. Off unless someone turns it on, twice.

CLAUDE.md rule 11: "no paid API calls beyond test mode". This module is how
that rule survives contact with a feature everyone wants, so the gate is
structural rather than a default argument someone can flip by accident:

1. The CLI flag `--use-claude` must be passed. Without it this module is never
   imported, so no client object is ever constructed.
2. `ANTHROPIC_API_KEY` must be set. Missing key raises `AdapterUnavailable`.
3. `--max-spend-usd` caps the run, and the estimate is refused before the call
   if the transcript cannot fit inside it.

Importing this file still costs nothing. The `anthropic` import is lazy and the
constructor is the only thing that can fail.
"""

from __future__ import annotations

import json
import os
import re

from ..adapters.base import AdapterUnavailable
from ..brand import Brand
from ..models import Moment, Transcript
from .moments import MAX_SECONDS, MIN_SECONDS, classify_format

__all__ = ["ClaudeMomentFinder"]

_MODEL = "claude-sonnet-5"
"""Sonnet is the working model for this kind of structured reading."""

# Public list prices for Sonnet, US dollars per million tokens, used only to
# refuse a call that would exceed the cap. They are not billing truth: the
# invoice is. See docs/DECISIONS.md D15.
_USD_PER_MTOK_IN = 3.0
_USD_PER_MTOK_OUT = 15.0
_CHARS_PER_TOKEN = 4
_MAX_OUTPUT_TOKENS = 4096

_PROMPT = """\
You are reading a transcript of one coach's own long video. Find the {wanted} \
windows that would make the strongest short vertical clips.

Rules you must keep:
- Quote only what is in the transcript. Never invent a line, a figure or a claim.
- Every window must be between {min_s:.0f} and {max_s:.0f} seconds long.
- Windows must not overlap each other.
- The hook must be the speaker's own words, copied exactly from the transcript.
- Never write a guarantee, a promise of results, or a testimonial.

Favour the client's own vocabulary where it appears: {words_always}
Never use these words: {words_never}

Reply with JSON only, no prose, in this shape:
{{"moments": [{{"start": 12.4, "end": 41.0, "hook": "...", "why": "..."}}]}}

Transcript, with each word's start time in seconds:
{transcript}
"""


class ClaudeMomentFinder:
    """Claude picks the windows; the engine still checks every one of them."""

    name = "claude"

    def __init__(self, max_spend_usd: float = 0.0, model: str = _MODEL) -> None:
        if max_spend_usd <= 0:
            raise AdapterUnavailable(
                "the Claude finder needs an explicit --max-spend-usd above zero"
            )
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not api_key:
            raise AdapterUnavailable("ANTHROPIC_API_KEY is not set")
        try:
            from anthropic import Anthropic
        except ImportError as error:
            raise AdapterUnavailable(
                "the anthropic SDK is not installed (uv sync --extra claude)"
            ) from error

        self._client = Anthropic(api_key=api_key)
        self._model = model
        self._max_spend_usd = max_spend_usd

    @staticmethod
    def estimate_usd(prompt: str) -> float:
        """What this one call could cost at list price, rounded up, not down.

        Static so the cap can be checked without building a client, which is
        what lets the tests prove the refusal without an API key.
        """
        tokens_in = len(prompt) / _CHARS_PER_TOKEN
        return (tokens_in / 1_000_000) * _USD_PER_MTOK_IN + (
            _MAX_OUTPUT_TOKENS / 1_000_000
        ) * _USD_PER_MTOK_OUT

    def build_prompt(self, transcript: Transcript, brand: Brand, wanted: int) -> str:
        return _PROMPT.format(
            wanted=wanted,
            min_s=MIN_SECONDS,
            max_s=MAX_SECONDS,
            words_always=", ".join(brand.words_always) or "(none given)",
            words_never=", ".join(brand.words_never) or "(none given)",
            transcript="\n".join(f"[{word.start_s:.1f}] {word.text}" for word in transcript.words),
        )

    def find(self, transcript: Transcript, brand: Brand, wanted: int) -> tuple[Moment, ...]:
        prompt = self.build_prompt(transcript, brand, wanted)

        estimate = self.estimate_usd(prompt)
        if estimate > self._max_spend_usd:
            raise AdapterUnavailable(
                f"this call could cost about ${estimate:.2f}, over the "
                f"${self._max_spend_usd:.2f} cap; nothing was sent"
            )

        response = self._client.messages.create(
            model=self._model,
            max_tokens=_MAX_OUTPUT_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(block.text for block in response.content if block.type == "text")
        return self.parse(text, transcript)

    @staticmethod
    def parse(text: str, transcript: Transcript) -> tuple[Moment, ...]:
        """Read the reply, and throw away anything it made up.

        A model that invents a hook, drifts off the transcript or returns a
        35-second window as 350 seconds is a thing that happens. Each window is
        checked against the transcript before it becomes a Moment, so a bad
        reply costs us cuts, never a false sample.
        """
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match is None:
            raise ValueError("Claude returned no JSON object")
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError as error:
            raise ValueError(f"Claude returned JSON that will not parse: {error.msg}") from error

        entries = parsed.get("moments")
        if not isinstance(entries, list):
            raise ValueError("Claude's reply has no 'moments' list")

        haystack = transcript.text.lower()
        moments: list[Moment] = []
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            try:
                start = float(entry["start"])
                end = float(entry["end"])
            except (KeyError, TypeError, ValueError):
                continue
            hook = str(entry.get("hook", "")).strip()

            if not hook or end <= start:
                continue
            if not MIN_SECONDS <= end - start <= MAX_SECONDS:
                continue
            if end > transcript.duration_s + 1.0:
                continue
            # The hook has to be the speaker's words. If it is not in the
            # transcript, the model wrote it, and it does not ship.
            if hook.lower() not in haystack:
                continue

            why = str(entry.get("why", "")).strip()
            moments.append(
                Moment(
                    start_s=start,
                    end_s=end,
                    hook=hook,
                    format=classify_format(hook),
                    score=0,
                    reasons=("chosen by Claude",) + ((why,) if why else ()),
                )
            )

        return tuple(sorted(moments, key=lambda moment: moment.start_s))

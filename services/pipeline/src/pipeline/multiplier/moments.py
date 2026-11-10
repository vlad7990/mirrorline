"""The heuristic moment finder: the default, and the one that costs nothing.

It reads sentence boundaries out of the word timings and scores each candidate
window on things that are actually in the transcript — a question opening, the
client's own vocabulary, a number, a clean ending, a length that suits a short
vertical video. No model, no key, no spend.

The score is explained, not just emitted: every moment carries `reasons`, which
reach `summary.json`. A number on its own ("score 92") invites a client to
trust it; the reasons let anyone check it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..brand import Brand
from ..models import Moment, Transcript, Word

__all__ = ["HeuristicMomentFinder", "Sentence", "classify_format", "split_sentences"]

MIN_SECONDS = 18.0
MAX_SECONDS = 45.0
IDEAL_SECONDS = 30.0
"""A hook clip that lands on every platform without being cropped for length."""

_SENTENCE_END = re.compile(r"[.!?]$")
_QUESTION_OPENERS = (
    "what",
    "why",
    "how",
    "when",
    "who",
    "which",
    "do",
    "does",
    "did",
    "is",
    "are",
    "can",
    "should",
    "would",
)
_PAUSE_S = 0.6
"""A gap this long ends a sentence even without punctuation."""

_HOOK_CHARS = 90

_SCORE_QUESTION = 15
_SCORE_BRAND_WORD = 8
_SCORE_BRAND_CAP = 24
_SCORE_NUMBER = 6
_SCORE_CLEAN_END = 10
_SCORE_LENGTH = 20
_SCORE_BASE = 40


@dataclass(frozen=True, slots=True)
class Sentence:
    words: tuple[Word, ...]

    @property
    def text(self) -> str:
        return " ".join(word.text for word in self.words)

    @property
    def start_s(self) -> float:
        return self.words[0].start_s

    @property
    def end_s(self) -> float:
        return self.words[-1].end_s

    @property
    def ends_cleanly(self) -> bool:
        return bool(_SENTENCE_END.search(self.words[-1].text))


def split_sentences(transcript: Transcript) -> tuple[Sentence, ...]:
    """Group words into sentences on punctuation or on a long pause.

    Transcribers punctuate inconsistently, so a silence long enough to be a
    breath counts as a boundary too. Without that, a model that returns no
    punctuation at all would yield exactly one sentence and no candidates.
    """
    sentences: list[Sentence] = []
    current: list[Word] = []

    for position, word in enumerate(transcript.words):
        current.append(word)
        is_last = position == len(transcript.words) - 1
        gap_follows = (
            not is_last and transcript.words[position + 1].start_s - word.end_s >= _PAUSE_S
        )
        if _SENTENCE_END.search(word.text) or gap_follows or is_last:
            sentences.append(Sentence(words=tuple(current)))
            current = []

    return tuple(sentences)


def classify_format(text: str) -> str:
    """Name the shape of the clip, in the words the studio already uses."""
    lowered = text.lower().strip()
    first_words = lowered.split()
    if "?" in lowered or (first_words and first_words[0] in _QUESTION_OPENERS):
        return "Hook question"
    if re.search(r"\b(first|second|third|three|two|\d+)\b", lowered):
        return "List"
    if re.search(r"\b(because|so that|which is why|that is why)\b", lowered):
        return "Story"
    return "Tip"


def _length_points(duration_s: float) -> int:
    """Closest to the ideal length scores highest, falling off either side."""
    distance = abs(duration_s - IDEAL_SECONDS)
    span = max(IDEAL_SECONDS - MIN_SECONDS, MAX_SECONDS - IDEAL_SECONDS)
    return int(round(_SCORE_LENGTH * max(0.0, 1.0 - distance / span)))


def _hook_of(text: str) -> str:
    hook = text.strip()
    if len(hook) <= _HOOK_CHARS:
        return hook
    # Cut at a word, never mid-word, and do not add an ellipsis: the hook is
    # read as a line of copy, and a trailing "..." reads as missing text.
    clipped = hook[:_HOOK_CHARS].rsplit(" ", 1)[0]
    return clipped.rstrip(",;:")


class HeuristicMomentFinder:
    """Windows of the source, scored on what the transcript actually says."""

    name = "heuristic"

    def find(self, transcript: Transcript, brand: Brand, wanted: int) -> tuple[Moment, ...]:
        sentences = split_sentences(transcript)
        if not sentences:
            return ()

        candidates = self._candidates(sentences, brand)
        chosen = self._choose_without_overlap(candidates, wanted)
        # Best-first for picking, then chronological for the output: a
        # salesperson scrubbing the folder expects cut 1 to come first.
        return tuple(sorted(chosen, key=lambda moment: moment.start_s))

    def _candidates(self, sentences: tuple[Sentence, ...], brand: Brand) -> list[Moment]:
        brand_words = tuple(word.lower() for word in brand.words_always)
        candidates: list[Moment] = []

        for start_index, opening in enumerate(sentences):
            window: list[Sentence] = []
            for sentence in sentences[start_index:]:
                if sentence.end_s - opening.start_s > MAX_SECONDS:
                    break
                window.append(sentence)
                duration = sentence.end_s - opening.start_s
                if duration < MIN_SECONDS:
                    continue

                text = " ".join(part.text for part in window)
                reasons: list[str] = []
                score = _SCORE_BASE

                if "?" in opening.text or classify_format(opening.text) == "Hook question":
                    score += _SCORE_QUESTION
                    reasons.append("opens on a question")

                hits = sum(1 for word in brand_words if word in text.lower())
                if hits:
                    points = min(hits * _SCORE_BRAND_WORD, _SCORE_BRAND_CAP)
                    score += points
                    reasons.append(f"uses {hits} of the brand's own words")

                if re.search(r"\d", text):
                    score += _SCORE_NUMBER
                    reasons.append("contains a figure")

                if sentence.ends_cleanly:
                    score += _SCORE_CLEAN_END
                    reasons.append("ends on a full sentence")

                length_points = _length_points(duration)
                score += length_points
                if length_points >= _SCORE_LENGTH // 2:
                    reasons.append(f"length {duration:.0f}s suits a vertical cut")

                candidates.append(
                    Moment(
                        start_s=opening.start_s,
                        end_s=sentence.end_s,
                        hook=_hook_of(opening.text),
                        format=classify_format(opening.text),
                        score=min(100, score),
                        reasons=tuple(reasons),
                    )
                )

        return candidates

    @staticmethod
    def _choose_without_overlap(candidates: list[Moment], wanted: int) -> list[Moment]:
        """Greedy by score, skipping anything that overlaps a pick.

        Overlapping cuts would be near-duplicates of each other by
        construction, and the compliance gate would then hold half the batch.
        Cheaper to not make them.
        """
        chosen: list[Moment] = []
        for moment in sorted(candidates, key=lambda item: (-item.score, item.start_s)):
            if len(chosen) >= wanted:
                break
            overlaps = any(
                moment.start_s < taken.end_s and taken.start_s < moment.end_s for taken in chosen
            )
            if overlaps:
                continue
            chosen.append(moment)
        return chosen

"""Finding each beat of an approved script in the client's own footage.

This is the one genuinely new piece of thinking in V5, so the reasoning is
here rather than in a commit message.

================================================================================
The problem is not "find the good bits"
================================================================================

`multiplier/moments.py` already finds good bits: it scores every sentence of a
transcript and picks the strongest windows. That is the right tool when nobody
has said what the video should be about.

Here somebody has. An approved idea from `lib/scripts/first-videos.ts` carries
four beats — Hook, Setup, Payoff, Call to action — written for *this* client,
screened by the Originality Gate and the fact check, and then approved by them.
The script is the spec. The job is to find where in an hour of footage each beat
was actually said.

So this module does not score interestingness. It scores **agreement with a
sentence somebody already approved**.

================================================================================
It refuses rather than approximating
================================================================================

The tempting failure is to always return something: take the best window for
each beat however poor, and let the client judge the result. That produces a
video whose Payoff beat is forty seconds of unrelated conversation, which is
worse than no video — it costs them the watch to find out, and it teaches them
that our cuts need checking.

`BeatNotFound` is therefore a normal outcome, and it names the beat and the
best coverage found. The worker turns it into a sentence — "the Payoff beat is
not in this footage" — which a client can act on by filming that line. A
refusal they can fix beats a video they cannot use.

================================================================================
Coverage, not similarity
================================================================================

The score is *what fraction of the beat's content words appear in this window*.
It is deliberately the same shape as the token-coverage idea the script agent's
fact check uses, and deliberately not a cosine similarity or an edit distance:

* A client paraphrases. "Most new managers try to be liked" and "the thing
  first-time managers get wrong is trying to be liked" share their content
  words and almost nothing else, and an edit distance would reject the second.
* Word order carries no information here. The beat is a *written* line; the
  footage is somebody talking around it.
* It is explainable. "7 of 9 words from this beat are in this window" is a
  sentence; "cosine 0.71" is not, and this number ends up in `summary.json`
  where somebody has to act on it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

__all__ = [
    "Beat",
    "BeatNotFound",
    "AlignedSegment",
    "MAX_BEAT_SECONDS",
    "MIN_BEAT_SECONDS",
    "MIN_COVERAGE",
    "align_beats",
    "content_tokens",
]

MIN_BEAT_SECONDS = 2.0
"""Below this a beat is a cut nobody can follow, whatever the words say."""

MAX_BEAT_SECONDS = 20.0
"""Four of these is eighty seconds, inside the ninety every platform treats as
the edge of short-form. A beat that wants more than twenty seconds is a beat
that should have been two beats."""

MIN_COVERAGE = 0.4
"""Two of five content words, and the choice is a judgement worth stating.

Lower and unrelated speech starts matching on common words; higher and ordinary
paraphrase is rejected — a client who says "liked" where the beat says "likeable"
loses the match. 0.4 was picked to survive paraphrase and reject coincidence,
and it is a named constant because the day a real client's footage argues with
it, this is the number to move and the tests are what say what moving it costs.
"""

_MAX_WINDOW_WORDS = 240
"""An hour of speech is ~9,000 words and a naive all-pairs scan of it is 81
million windows. Twenty seconds of speech is ~60 words, so a window longer than
this cannot be under `MAX_BEAT_SECONDS` and need never be built — which turns
the scan linear in practice."""

_STOPWORDS = frozenset(
    """
    a an and are as at be been but by can cant could do does doing dont for from
    get got had has have how i id if ill im in into is it its just like me my no
    not of on or our out so than that the their them then there these they this
    to too up us was we were what when which who why will with would you your
    """.split()
)
"""Words that match everything and therefore mean nothing here.

Not a linguistics exercise: with these counted, a beat about delegation matches
a window about parking, because both contain "the" and "to". The list is small
and English-only, which is honest about where the product is — and a client
speaking another language fails the coverage floor loudly rather than quietly
matching noise."""

_TOKEN = re.compile(r"[a-z0-9']+")


def content_tokens(text: str) -> set[str]:
    """The words of `text` that carry meaning, lowercased.

    Numbers are kept and are not stopwords: "three" and "1:1" are exactly the
    kind of concrete thing a beat is built around, and the fact check already
    treats a figure as the most load-bearing token in a sentence.
    """
    words = _TOKEN.findall(text.lower())
    return {
        word
        for word in words
        # Short words are noise *unless* they are figures. "to" and "it" match
        # everything; "30" and the "1" of a 1:1 are the most load-bearing
        # tokens a beat has, and dropping them on length is how a beat about a
        # thirty-minute call stops matching the words "thirty minute call".
        if word not in _STOPWORDS and (len(word) > 2 or word.isdigit())
    }


@dataclass(frozen=True, slots=True)
class Beat:
    """One beat of an approved script: the label and the line."""

    label: str
    text: str


@dataclass(frozen=True, slots=True)
class AlignedSegment:
    """Where a beat was found in the source, and how well."""

    beat: str
    start_s: float
    end_s: float
    #: The words the window actually contains, for the captions and for the log.
    text: str
    #: 0.0–1.0. Carried into `summary.json` so a weak match is visible.
    coverage: float

    @property
    def duration_s(self) -> float:
        return self.end_s - self.start_s


class BeatNotFound(Exception):
    """A beat is not in this footage well enough to cut.

    Carries the label and the best coverage found, because "the Payoff beat is
    not in this footage (best match 18% of its words)" is a sentence a client
    can act on, and "alignment failed" is not.
    """

    def __init__(self, label: str, best_coverage: float) -> None:
        self.label = label
        self.best_coverage = best_coverage
        percent = round(best_coverage * 100)
        super().__init__(
            f"the {label} beat is not in this footage (best match {percent}% of its words)"
        )


@dataclass(frozen=True, slots=True)
class _Window:
    start_index: int
    end_index: int
    start_s: float
    end_s: float
    coverage: float
    matched: int
    ends_sentence: bool

    @property
    def duration_s(self) -> float:
        return self.end_s - self.start_s

    def overlaps(self, other: _Window) -> bool:
        return self.start_index < other.end_index and other.start_index < self.end_index


def _ends_sentence(text: str) -> bool:
    return text.rstrip().endswith((".", "!", "?"))


def _windows_for(
    beat_tokens: set[str],
    words: list[tuple[str, float, float]],
    min_seconds: float,
    max_seconds: float,
) -> list[_Window]:
    """Every plausible window for one beat, scored.

    A window is plausible when it is long enough to watch, short enough to be a
    beat, and contains at least one of the beat's content words. The last
    condition is what keeps this cheap: most start positions die immediately.
    """
    if not beat_tokens:
        return []

    found: list[_Window] = []

    for start in range(len(words)):
        start_s = words[start][1]
        seen: set[str] = set()

        for end in range(start, min(start + _MAX_WINDOW_WORDS, len(words))):
            text, _, word_end = words[end]
            seen |= content_tokens(text) & beat_tokens

            duration = word_end - start_s
            if duration > max_seconds:
                break
            if duration < min_seconds or not seen:
                continue

            found.append(
                _Window(
                    start_index=start,
                    end_index=end + 1,
                    start_s=start_s,
                    end_s=word_end,
                    coverage=len(seen) / len(beat_tokens),
                    matched=len(seen),
                    ends_sentence=_ends_sentence(text),
                )
            )

    return found


def _best(windows: list[_Window]) -> _Window:
    """The window to cut, out of the ones that scored.

    Coverage first, then a clean ending, then the shortest. The order matters:
    a window that ends mid-word is a cut that sounds broken however well it
    matches, and among equally good matches the tighter one is the better short.
    """
    return max(windows, key=lambda w: (round(w.coverage, 3), w.ends_sentence, -w.duration_s))


def align_beats(
    beats: list[Beat],
    words: list[tuple[str, float, float]],
    *,
    min_coverage: float = MIN_COVERAGE,
    min_seconds: float = MIN_BEAT_SECONDS,
    max_seconds: float = MAX_BEAT_SECONDS,
) -> tuple[AlignedSegment, ...]:
    """One window per beat, in script order, never overlapping.

    Raises `BeatNotFound` for the first beat that cannot be found, which stops
    the job before any encoding happens.

    **Beats are assigned best-first, not in script order.** A podcast does not
    say the four lines in the order a script lists them, so the windows are
    allocated to whichever beat matched most strongly first — otherwise the Hook
    takes a window the Payoff needed and the Payoff then fails on footage that
    contains it. The returned tuple is still in script order, because that is
    the order the video plays.
    """
    if not words:
        raise BeatNotFound(beats[0].label if beats else "Hook", 0.0)

    scored: list[tuple[int, Beat, list[_Window]]] = []
    for index, beat in enumerate(beats):
        windows = _windows_for(content_tokens(beat.text), words, min_seconds, max_seconds)
        usable = [window for window in windows if window.coverage >= min_coverage]
        if not usable:
            best = max((w.coverage for w in windows), default=0.0)
            raise BeatNotFound(beat.label, best)
        scored.append((index, beat, usable))

    # Strongest beat first, so a weak beat never steals the window a strong one
    # needed. Ties broken by script order to keep the result deterministic.
    scored.sort(key=lambda entry: (-_best(entry[2]).coverage, entry[0]))

    taken: list[_Window] = []
    chosen: list[tuple[int, Beat, _Window]] = []

    for index, beat, usable in scored:
        free = [window for window in usable if not any(window.overlaps(t) for t in taken)]
        if not free:
            # Every window for this beat was spent on another beat. That is a
            # script whose beats say the same thing, not footage that is missing
            # one — and the honest answer is still "this one is not here", with
            # the coverage it would have had.
            raise BeatNotFound(beat.label, _best(usable).coverage)

        window = _best(free)
        taken.append(window)
        chosen.append((index, beat, window))

    chosen.sort(key=lambda entry: entry[0])

    return tuple(
        AlignedSegment(
            beat=beat.label,
            start_s=round(window.start_s, 3),
            end_s=round(window.end_s, 3),
            text=" ".join(word[0] for word in words[window.start_index : window.end_index]),
            coverage=round(window.coverage, 3),
        )
        for _, beat, window in chosen
    )

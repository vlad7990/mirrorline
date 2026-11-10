"""Compliance v1: the gate every cut passes before it can be scheduled.

CLAUDE.md non-negotiable 6 makes this the thing everything else depends on, so
it is deliberately boring: four rules, each one a pure function of a cut and
its brand, each one returning a `Finding` that names itself and explains
itself in a sentence a client could read.

The four, and the non-negotiable each one serves:

1. `rights-flag` — non-negotiable 1, client-owned material only. No signed
   rights record in brand.json means every cut is blocked, not warned about.
2. `near-duplicate` — non-negotiable 2 and the 30% similarity limit the public
   site already states. Cuts too close to each other are held for a human.
3. `banned-phrases` — non-negotiable 7, no guarantees and no invented proof,
   plus the client's own `wordsNever`.
4. `ai-label` — non-negotiable 4, an AI scene is always labelled. A cut with
   generated footage and no label is blocked.

Nothing here averages or scores. A rule either passes, wants a human, or
blocks, and `ComplianceResult` takes the worst.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher

from ..brand import Brand
from ..models import ComplianceResult, Cut, Finding

__all__ = [
    "BANNED_PATTERNS",
    "SIMILARITY_LIMIT",
    "check_ai_label",
    "check_banned_phrases",
    "check_cuts",
    "check_near_duplicates",
    "check_rights",
    "similarity",
]

SIMILARITY_LIMIT = 0.30
"""The limit the public site states: "limit 30% similarity".

The number is low on purpose. These are cuts of one episode by one speaker, so
they share vocabulary by nature; a limit that only caught near-identical text
would catch nothing. Above this, a human looks.
"""

# Each pattern is a claim we will not publish. The message says which, because
# a blocked caption is useless to a client without the reason.
BANNED_PATTERNS: tuple[tuple[str, str, str], ...] = (
    (
        "guarantee",
        r"\bguarantee(s|d)?\b",
        "promises a result; non-negotiable 7 allows no guarantees",
    ),
    (
        "zero-claim",
        r"\bzero\s+(risk|effort|work|spam|downtime)\b",
        "is a 'zero anything' claim",
    ),
    (
        "promised-growth",
        r"\b(\d+[kx]?|thousands?|millions?)\s+(followers|views|leads|clients)\s+"
        r"(in|within|guaranteed)\b",
        "promises a specific amount of growth",
    ),
    (
        "certified",
        r"\b(soc-?2|certified|accredited)\b",
        "claims a certification we do not hold",
    ),
    (
        "testimonial",
        r"\b(our clients? (say|said|love)|rated \d(\.\d)? stars?)\b",
        "reads as a testimonial or rating",
    ),
)

_WORD = re.compile(r"[a-z0-9']+")


def _tokens(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def similarity(left: str, right: str) -> float:
    """How alike two captions are, 0.0 to 1.0.

    `SequenceMatcher` on the token lists rather than on raw characters: word
    order matters for a near-duplicate, but a different inflection of the same
    word should not read as a different sentence.
    """
    left_tokens, right_tokens = _tokens(left), _tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return SequenceMatcher(None, left_tokens, right_tokens).ratio()


def check_rights(brand: Brand) -> Finding:
    """Is there a signed rights record behind this footage at all."""
    if brand.rights is None:
        return Finding(
            rule="rights-flag",
            status="blocked",
            message=(
                "no rights record in brand.json, so we cannot show this footage is "
                "the client's own. Add rights.holder, rights.recordId and "
                "rights.signedOn."
            ),
        )
    return Finding(
        rule="rights-flag",
        status="pass",
        message=(
            f"rights held by {brand.rights.holder}, record "
            f"{brand.rights.record_id}, signed {brand.rights.signed_on.isoformat()}"
        ),
    )


def check_banned_phrases(cut: Cut, brand: Brand) -> Finding:
    """Does the burned-in caption say something we will not publish."""
    lowered = cut.caption_text.lower()

    for name, pattern, why in BANNED_PATTERNS:
        found = re.search(pattern, lowered)
        if found:
            return Finding(
                rule="banned-phrases",
                status="blocked",
                message=f"caption {found.group(0)!r} {why} ({name})",
            )

    # The client's own list is a brand rule, not a legal one, so it asks for a
    # human rather than blocking: they may have changed their mind since.
    for word in brand.words_never:
        if word.lower() in lowered:
            return Finding(
                rule="banned-phrases",
                status="needs-review",
                message=f"caption uses {word!r}, which this brand lists under wordsNever",
            )

    return Finding(
        rule="banned-phrases",
        status="pass",
        message="caption carries no banned claim",
    )


def check_ai_label(cut: Cut) -> Finding:
    """An AI scene is labelled, every time, or it does not ship."""
    if cut.has_ai_scenes and not cut.ai_label_applied:
        return Finding(
            rule="ai-label",
            status="blocked",
            message="this cut uses a generated scene and carries no AI label",
        )
    if cut.has_ai_scenes:
        return Finding(
            rule="ai-label",
            status="pass",
            message="generated scene, AI label applied",
        )
    return Finding(
        rule="ai-label",
        status="pass",
        message="no generated scenes in this cut",
    )


def check_near_duplicates(cut: Cut, others: tuple[Cut, ...]) -> Finding:
    """Is this cut too close to another cut in the same batch."""
    worst_index: int | None = None
    worst_score = 0.0

    for other in others:
        if other.index == cut.index:
            continue
        score = similarity(cut.caption_text, other.caption_text)
        if score > worst_score:
            worst_score, worst_index = score, other.index

    percent = round(worst_score * 100)
    if worst_index is not None and worst_score > SIMILARITY_LIMIT:
        return Finding(
            rule="near-duplicate",
            status="needs-review",
            message=(
                f"{percent}% similar to cut {worst_index}, over the "
                f"{round(SIMILARITY_LIMIT * 100)}% limit"
            ),
        )
    return Finding(
        rule="near-duplicate",
        status="pass",
        message=f"closest other cut is {percent}% similar",
    )


def check_cuts(cuts: tuple[Cut, ...], brand: Brand) -> dict[int, ComplianceResult]:
    """Run every rule over every cut. Keyed by cut index.

    The rights finding is computed once and shared: it is a property of the
    brand file, not of any one cut, and recomputing it per cut would invite it
    to disagree with itself.
    """
    rights = check_rights(brand)

    return {
        cut.index: ComplianceResult(
            findings=(
                rights,
                check_banned_phrases(cut, brand),
                check_ai_label(cut),
                check_near_duplicates(cut, cuts),
            )
        )
        for cut in cuts
    }

"""The Compliance gate.

CLAUDE.md non-negotiable 6: "every video passes the Compliance agent before it
can be scheduled." Four rules, in `rules`, each one a pure function so it can
be read, tested and argued with on its own.
"""

from .rules import (
    BANNED_PATTERNS,
    SIMILARITY_LIMIT,
    check_ai_label,
    check_banned_phrases,
    check_cuts,
    check_near_duplicates,
    check_rights,
    similarity,
)

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

"""Everything that talks to a model, an API or a binary.

04_AGENTS_SPEC.md: "Every model and platform sits behind an adapter interface,
so it can be swapped." The interfaces are in `base`; the implementations
import their heavy dependencies lazily and raise `AdapterUnavailable` when the
machine cannot run them.
"""

from .base import AdapterUnavailable, CaptionBurner, MomentFinder, Transcriber

__all__ = ["AdapterUnavailable", "CaptionBurner", "MomentFinder", "Transcriber"]

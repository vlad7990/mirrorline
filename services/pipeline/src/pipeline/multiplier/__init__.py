"""The Multiplier: one long video becomes many short ones.

04_AGENTS_SPEC.md gives it the job of turning an upload into cuts. Here that
is four steps, each its own module: find the moments, group the words into
caption lines, draw them, render the 9:16 file.
"""

from .captions import PillowCaptionBurner, caption_lines
from .moments import HeuristicMomentFinder
from .render import RenderOutcome, render_cuts

__all__ = [
    "HeuristicMomentFinder",
    "PillowCaptionBurner",
    "RenderOutcome",
    "caption_lines",
    "render_cuts",
]

"""Engine v0.

One client video becomes 8 to 12 captioned 9:16 cuts, each one checked by the
compliance gate before anyone sees it. `make-samples` is the way in; see
services/pipeline/README.md.

Two agents live here, which is the layout CLAUDE.md asks for:

* `multiplier/` — the Multiplier: transcribe, find moments, cut, caption.
* `compliance/` — the Compliance gate: rights, duplicates, claims, AI labels.

Anything that talks to a model, an API or a binary sits in `adapters/` behind
an interface, so it can be swapped without touching either agent.
"""

__all__ = ["__version__"]

__version__ = "0.1.0"

# Active context

## Current focus

- Memory bank initialization so future sessions can resume with accurate project state.
- SnapBug exists as a working **Manifest V3** extension under `extension/` with capture → storage → annotate tab flow.

## Recent understanding

- `CLAUDE.md` at repo root still says “no source code yet”; the `extension/` tree is the real source of truth until that file is updated.

## Next steps (suggested)

- Keep `CLAUDE.md` in sync with `extension/` capabilities.
- Flesh out annotation tools and any upload pipeline implied by the manifest description.
- Decide whether `annotate.html` assets need manifest `web_accessible_resources` or other permissions as features grow.

## Open decisions

- Hosting/upload target for screenshots (if any).
- How much logic stays in the service worker vs. shared modules (`modules/capture.js` is already extracted for tests).

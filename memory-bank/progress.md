# Progress

## Working

- Extension loads as SnapBug (MV3) with icons and popup.
- Capture flow: popup → background captures visible tab as PNG → stores data URL → opens `annotate.html` with image on canvas.
- Vitest tests exist for `modules/capture.js`.

## In progress / partial

- **Annotation page**: `annotate.html` + `annotate.js` only load the screenshot onto a canvas and show dimensions — no drawing tools or export/upload UI yet.
- **Upload**: Not implemented; manifest description is forward-looking.

## Known gaps

- Root `CLAUDE.md` is outdated relative to `extension/`.
- Memory bank did not exist before this initiation; future sessions should read `memory-bank/*.md` first.

## How to verify

- Manual: load unpacked extension, open a tab, use popup capture, confirm annotate tab shows the image.
- Automated: `cd extension && npm test`.

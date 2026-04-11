# Product context

## Problem

Reporting bugs often needs a clear screenshot of what the user sees. SnapBug aims to shorten the path from “see the bug” to “shareable, annotated evidence.”

## Intended experience

1. User opens the extension popup and triggers capture.
2. The visible tab is captured as PNG and stored temporarily.
3. A dedicated tab opens for review/annotation (`annotate.html`) with the image on a canvas.
4. Future: upload or export for bug trackers (aligned with manifest description).

## User experience goals

- Minimal clicks from popup to captured image in the editor.
- Clear feedback when capture fails (permissions, API errors).
- Annotation surface that matches real bug-report needs (to be expanded).

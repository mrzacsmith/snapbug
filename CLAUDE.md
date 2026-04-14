# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SnapBug** — Chrome extension (Manifest V3) that captures the visible tab, opens a full-tab annotation editor, uploads annotated PNGs to **Cloudflare R2** via an authenticated **Cloudflare Worker**, and copies a markdown-friendly URL block to the clipboard. Also supports **video screen recording** (WebM) with a separate R2 bucket and 14-day retention.

## Repository layout

- **`extension/`** — Vanilla JS ES modules: `background.js` (capture, shortcut, messaging), `popup`, `options`, `annotate.html` + `annotate.js`, and `modules/` (annotator, toolbar, crop, history, upload, output, settings, toast, capture helpers, tests).
- **`worker/`** — Cloudflare Worker + R2 (`wrangler.toml`); upload (PNG + WebM), GET, and `/watch/` video player routes. Two R2 buckets: `SCREENSHOTS` (30-day) and `VIDEOS` (14-day).
- **`README.md`** — Setup (Wrangler, R2 bucket, secrets), usage, architecture diagram, test commands.
- **`memory-bank/`** — Session continuity: read `projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md` when starting substantive work.

## Quick commands

```bash
cd extension && npm test
cd worker && npm test && npm run dev   # local dev; see README for .dev.vars
```

## Notes

- Capture handoff uses `chrome.storage.local` keys: `pendingScreenshot`, `pendingPageUrl`, `pendingTimestamp` (set in `background.js`, consumed in `annotate.js`).
- After changing extension code, reload the extension at `chrome://extensions`.

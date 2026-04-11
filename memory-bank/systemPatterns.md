# System patterns

## Architecture

- **Chrome extension (MV3)** with a **service worker** (`background.js`) handling privileged APIs.
- **Popup** (`popup.html` / `popup.js`) sends messages to the background script; it does not call `captureVisibleTab` directly.
- **Capture pipeline**: `chrome.tabs.captureVisibleTab` → PNG data URL → `chrome.storage.local` key `pendingScreenshot` → `chrome.tabs.create` to `annotate.html`.
- **Annotate page** (`annotate.js`) reads `pendingScreenshot`, draws to canvas, then removes the key from storage.

## Module layout

- `extension/modules/capture.js` — async helpers: `captureAndOpen`, `loadPendingScreenshot`, `clearPendingScreenshot` (accepts `chrome` for testability).
- `extension/modules/capture.test.js` — Vitest tests for capture helpers.

## Messaging

- Popup uses `chrome.runtime.sendMessage({ action: 'capture' })`; background responds asynchronously (`return true` in listener).

## Permissions

- Manifest: `activeTab`, `storage` — sufficient for visible-tab capture and temporary screenshot handoff.

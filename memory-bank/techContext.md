# Tech context

## Stack

- **Browser**: Chrome extension Manifest **V3**.
- **Language**: JavaScript (ES modules in `extension/package.json` with `"type": "module"` for tooling).
- **Testing**: **Vitest** (^3.1.1) in `extension/` — `npm test` / `vitest run`.

## Key paths

| Path | Role |
|------|------|
| `extension/manifest.json` | Extension id, permissions, popup, background service worker |
| `extension/background.js` | Message handler + capture + open annotate tab |
| `extension/popup.*` | User trigger for capture |
| `extension/annotate.html` + `annotate.js` | Canvas viewer for pending screenshot |
| `extension/modules/capture.js` | Shared capture/storage logic |
| `extension/vitest.config.js` | Test runner config |

## Development

- Load unpacked extension from `extension/` in `chrome://extensions` during development.
- Run tests from `extension/`: `npm test`.

## Constraints

- Service worker is ephemeral; long tasks should not assume persistent background state beyond `chrome.storage`.
- Large data URLs in `storage.local` are acceptable for a single pending screenshot but may need limits if history or multiple drafts are added later.

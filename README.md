# SnapBug

Screenshot capture, annotate, and upload Chrome extension. Captures the visible tab, opens a full-tab annotation editor, uploads the annotated PNG to Cloudflare R2 via an authenticated Worker, and copies the image URL to your clipboard. Also supports **video screen recording** — records the active tab as WebM, uploads to a separate R2 bucket with 14-day auto-delete, and provides a shareable player page. Paste into GitHub issues for inline rendering.

## Prerequisites

- Node.js (v18+)
- Google Chrome
- Cloudflare account (free tier works)

## Setup

### 1. Deploy the Worker

```bash
cd worker
npm install
npx wrangler login          # opens browser — sign in to Cloudflare
npx wrangler r2 bucket create screenshots
npx wrangler r2 bucket create snapbug-videos
npx wrangler secret put API_KEY
# type a shared secret, e.g. my-snapbug-key-123
npm run deploy
```

The deploy prints your Worker URL:
```
https://snapbug.<your-subdomain>.workers.dev
```

Verify it works:
```bash
curl https://snapbug.<your-subdomain>.workers.dev/
# {"ok":true}
```

### 1b. Set up R2 lifecycle rules

Configure auto-delete in the [Cloudflare Dashboard](https://dash.cloudflare.com) > R2:

**Screenshots bucket** (`screenshots`) — 30-day retention:
1. Click **Settings** > **Object lifecycle rules**
2. Add rule: Delete objects older than **30 days**

**Videos bucket** (`snapbug-videos`) — 14-day retention:
1. Click **Settings** > **Object lifecycle rules**
2. Add rule: Delete objects older than **14 days**

> Lifecycle rules cannot be configured via `wrangler.toml` — they must be set in the dashboard.

### 2. Install the Extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. SnapBug appears in your extensions list

### 3. Configure the Extension

1. Click the SnapBug icon in the toolbar
2. Click **Open Settings** (or right-click the icon > Options)
3. Enter:
   - **Worker URL**: `https://snapbug.<your-subdomain>.workers.dev` (no trailing slash)
   - **API Key**: the same secret you set in step 1
4. Click **Save**

## Usage

### Capture

- **Keyboard shortcut**: `Alt+Shift+S` (works without opening the popup)
- **Popup**: Click the SnapBug icon > **Capture Screenshot**

A new tab opens with the screenshot in the annotation editor.

### Record Video

- **Keyboard shortcut**: `Alt+Shift+V` (toggle start/stop)
- **Popup**: Click the SnapBug icon > **Record Video**, then **Stop Recording**

Recordings are saved as WebM and uploaded to the videos R2 bucket (14-day retention). A shareable player URL is copied to your clipboard:

```
[Video recording](https://snapbug.your-subdomain.workers.dev/2026/04/10/...)
URL: https://the-page-you-recorded.com
Recorded: 2026-04-10 14:32 UTC
(expires in 14 days)
```

The player page is available at `/watch/{key}` with autoplay and native controls.

- Max recording duration: 5 minutes
- Max file size: 100MB
- Badge shows **REC** while recording

### Annotate

| Tool | Description |
|------|-------------|
| Pen | Freehand drawing |
| Arrow | Line with arrowhead |
| Rectangle | Stroke-only rectangle |
| Text | Click to place, Enter to commit |
| Crop | Drag to select region, resizes canvas |

- **Colors**: Red (default), blue, green, yellow, black, white
- **Widths**: Thin (2px), medium (4px), thick (8px)
- **Undo**: `Ctrl+Z`
- **Redo**: `Ctrl+Shift+Z`
- **Clear All**: toolbar button

### Upload

Click **Upload** in the top-right of the toolbar. The URL is copied to your clipboard:

```
![screenshot](https://snapbug.your-subdomain.workers.dev/2026/04/10/...)
URL: https://the-page-you-captured.com
Captured: 2026-04-10 14:32 UTC
```

Paste directly into a GitHub issue or comment.

## Git Setup

After cloning, enable the auto-version-bump hook:

```bash
git config core.hooksPath .githooks
```

This automatically increments the patch version in `manifest.json` on each commit that changes extension files.

## Local Development

### Worker

```bash
cd worker
echo "API_KEY=my-snapbug-key-123" > .dev.vars   # local secret
npm run dev                                       # http://localhost:8787
npm test                                          # 15 tests
```

### Extension

```bash
cd extension
npm test           # 68 tests
```

After code changes, reload the extension at `chrome://extensions` (click the refresh icon).

## Rotating the API Key

```bash
cd worker
npx wrangler secret put API_KEY
# type the new key when prompted
```

The old key stops working immediately. Have the team update the key in extension settings.

## Updating

```bash
git pull
cd worker && npm run deploy    # redeploy worker if changed
```

Then reload the extension at `chrome://extensions`.

## Architecture

```
extension/          Chrome Extension (Manifest V3, vanilla JS)
  modules/          ES modules: capture, recorder, annotator, toolbar,
                    crop, history, upload, output, settings
  popup.html/js     Capture + record trigger + settings link
  annotate.html/js  Full-tab annotation editor
  offscreen.html/js Offscreen document for MediaRecorder (video)
  options.html/js   Worker URL + API key config
  background.js     Service worker (capture, recording, shortcuts)

worker/             Cloudflare Worker + R2
  src/index.js      POST /upload, GET /<key>, GET /watch/<key>, OPTIONS
  wrangler.toml     R2 bucket bindings (screenshots + videos)
```
# autocsuite

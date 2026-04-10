# SnapBug

Screenshot capture, annotate, and upload Chrome extension. Captures the visible tab, opens a full-tab annotation editor, uploads the annotated PNG to Cloudflare R2 via an authenticated Worker, and copies the image URL to your clipboard. Paste into GitHub issues for inline rendering.

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

### 1b. Set up R2 lifecycle rule (optional)

To auto-delete screenshots older than 180 days (keeps storage within free tier):

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2 > `screenshots` bucket
2. Click **Settings** > **Object lifecycle rules**
3. Add a rule:
   - **Rule name**: `auto-delete-180d`
   - **Action**: Delete
   - **Condition**: Objects older than **180 days**
4. Save

> This cannot be configured via `wrangler.toml` — it must be done in the dashboard.

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

## Updating

```bash
git pull
cd worker && npm run deploy    # redeploy worker if changed
```

Then reload the extension at `chrome://extensions`.

## Architecture

```
extension/          Chrome Extension (Manifest V3, vanilla JS)
  modules/          ES modules: capture, annotator, toolbar, crop,
                    history, upload, output, settings
  popup.html/js     Capture trigger + settings link
  annotate.html/js  Full-tab annotation editor
  options.html/js   Worker URL + API key config
  background.js     Service worker (capture + keyboard shortcut)

worker/             Cloudflare Worker + R2
  src/index.js      POST /upload, GET /<key>, GET /, OPTIONS
  wrangler.toml     R2 bucket binding
```

# Chrome Network Enhance

A Chrome DevTools extension for enhanced network request inspection. Quickly copy cURL commands, export to Postman, and batch copy responses.

## Features

- **Network Request Monitoring** - Real-time capture of all network requests
- **Multi-Select** - Checkbox + Shift (range) + Ctrl/Cmd (individual) selection
- **Right-Click Menu** - Copy as cURL, Postman Collection, Markdown Table
- **Status Highlighting** - Color-coded status codes (2xx green, 4xx orange, 5xx red)
- **Filtering** - Search by URL, filter by status code and HTTP method
- **Recording Control** - Start/stop recording, clear requests

## Installation

```bash
# Install dependencies
pnpm install

# Build
pnpm build
```

### Load Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder
5. Open DevTools (F12) on any webpage
6. Switch to the "Network Enhance" tab

## Development

```bash
# Watch mode
pnpm dev
```

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Chrome DevTools API (Manifest V3)

## License

MIT

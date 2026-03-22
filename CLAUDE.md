# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome DevTools extension (Manifest V3) that adds a "Network Enhance" panel for enhanced network request inspection. It captures requests via `chrome.devtools.network.onRequestFinished`, provides multi-select with right-click context menu for batch operations (copy as cURL, export Postman collection, copy as Markdown).

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Watch mode (vite build --watch)
pnpm build            # Type-check then build (tsc && vite build)
```

Output goes to `dist/`. Load as unpacked extension in `chrome://extensions/` (Developer mode) → select `dist/` folder → open DevTools → "Network Enhance" tab.

## Architecture

### Entry Points (Vite multi-entry build)

- **`src/devtools/devtools.ts`** — Registers the DevTools panel via `chrome.devtools.panels.create()`. Entry point loaded by `manifest.json`'s `devtools_page`.
- **`src/panel/main.tsx`** — React app root rendered inside the DevTools panel.
- **`src/background/service-worker.ts`** — Minimal Manifest V3 service worker (currently only logs install event). Not bundled by Vite — referenced directly.

### Panel App (`src/panel/`)

Single-component React app with no routing or state management library:

- **`App.tsx`** — Top-level orchestrator. Owns filter state, coordinates hooks, wires up context menu and toast. Filtering logic (URL search, status code range, HTTP method, resource type) lives here inline.
- **`components/RequestTable.tsx`** — Table display with expandable rows (double-click). Expanded view has tabs: Response, Request Body, Headers. Contains `RequestRow` as an internal component.
- **`components/FilterBar.tsx`** — Toolbar with recording toggle, clear button, resource type selector, URL search, status/method dropdowns.
- **`components/ContextMenu.tsx`** — Right-click menu. Single-select shows cURL/response/request body/headers copy. Multi-select shows Postman export, Markdown table, batch response copy. Contains internal `MenuItem` and `Divider` components.
- **`components/Toast.tsx`** — Simple 2-second notification.

### Hooks (`src/panel/hooks/`)

- **`useNetworkRequests.ts`** — Listens to `chrome.devtools.network.onRequestFinished`, extracts HAR entry data, fetches response body via `request.getContent()`. Uses a ref for recording state to avoid re-registering the listener.
- **`useSelection.ts`** — Multi-select logic: click (single), Shift+click (range), Ctrl/Cmd+click (toggle), select all (toggle).

### Utils (`src/panel/utils/`)

- **`copyUtils.ts`** — Generates cURL commands, Postman Collection v2.1 JSON, Markdown with embedded cURL + response. Clipboard write with `navigator.clipboard` fallback to `execCommand`.
- **`formatters.ts`** — Display helpers: bytes, time, status color (Tailwind classes), method color, JSON pretty-print, URL path extraction.

### Types (`src/types/index.ts`)

Core interfaces: `NetworkRequest`, `Header`, `FilterState`, `SelectionState`, `ResourceType`.

## Build Details

- Vite config uses a custom `copy-extension-files` plugin to copy `manifest.json` and `icons/*.svg` into `dist/` after build.
- Two Rollup input entries: `panel` and `devtools` (no service worker bundling).
- Output uses `assets/[name].js` naming (no hash on entry files).
- Tailwind CSS 3 with PostCSS/Autoprefixer.

## Key Conventions

- UI uses VS Code dark theme colors (hardcoded hex: `#1e1e1e`, `#252526`, `#2a2d2e`, `#094771` for selection).
- All comments in source are in Traditional Chinese (繁體中文).
- Default filter shows only Fetch/XHR requests (not all resource types).
- No test framework is configured.
- Package manager is pnpm.

## CI/CD

GitHub Actions workflow (`.github/workflows/release.yml`) runs on push to `main`: builds with pnpm and uploads `dist/` as artifact (retained 30 days).

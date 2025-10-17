# BlaC DevTools Chrome Extension

DevTools Chrome extension for debugging [BlaC](https://github.com/jsnanigans/blac) state management applications.

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+

### Setup

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build
```

### Loading the Extension

1. Build the extension: `pnpm build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/` directory from this project

### Development Workflow

```bash
# Build the extension
pnpm build

# Rebuild after changes
pnpm build

# Type checking
pnpm typecheck
```

## Project Structure

```
apps/devtools/
├── extension/          # Chrome extension scripts
│   ├── manifest.json   # Extension manifest
│   ├── contentScript.ts
│   ├── background.ts
│   ├── devtools.ts
│   ├── devtools.html
│   └── panel.html
├── src/                # React UI
│   ├── components/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── public/             # Static assets
    └── icons/
```

## Usage

1. Install `@blac/devtools-connect` in your app
2. Add the DevToolsPlugin to your Blac configuration
3. Load this Chrome extension
4. Open Chrome DevTools
5. Navigate to the "BlaC" tab

## Features

- 📝 Event Log - See all dispatched events with timestamps
- 🔍 Bloc Registry - View all active blocs
- 📊 State Inspector - Inspect current bloc state
- 🎛️ Controls - Clear events, filter, and more

## License

MIT

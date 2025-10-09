# Plan: BlaC DevTools Chrome Extension

## Decision

**Approach:** Build Chrome Extension with time-travel debugging as MVP, expand to advanced features in phases  
**Why:** DevTools directly addresses the #1 developer pain point (tooling quality). Redux's competitive moat is their DevTools - we need parity with event-centric advantages.  
**Risk Level:** Medium (Chrome API complexity, security surface area)

---

## Architecture: Two-Package System

**YES, we need `packages/devtools-connect/`** as a separate npm package.

**Why?**

1. **Users install it in their app:** `npm install @blac/devtools-connect`
2. **Apps shouldn't export npm packages:** `apps/devtools/` is for the Chrome extension app, not publishable packages
3. **Separation of concerns:** Plugin code (in user's app) vs Extension UI (Chrome-only)
4. **Independent versioning:** Plugin and extension can be updated separately

### Package Roles

```
┌──────────────────────────────────────────────────────────────┐
│  packages/devtools-connect/  (npm package)                   │
│  - npm install @blac/devtools-connect                        │
│  - DevToolsPlugin (hooks into BlaC lifecycle)               │
│  - DevToolsBridge (window message communication)            │
│  - Serialization utilities                                   │
│  - React-specific utilities (if needed)                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ window.postMessage()
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  apps/devtools/  (Chrome Extension - not npm)                │
│  - Chrome Web Store installation                             │
│  - Extension files (manifest, background, content script)   │
│  - UI Panel (React components)                              │
│  - Receives and displays messages from devtools-connect     │
└──────────────────────────────────────────────────────────────┘
```

---

## MVP Scope (3 Weeks)

**Core Features:**

1. **Event Log** - Chronological list of all dispatched events with timestamps
2. **State Inspector** - JSON tree viewer for current bloc state
3. **Time-Travel** - Slider to replay state at any point in event history
4. **Bloc Registry** - List of active blocs with lifecycle status
5. **Enable/Disable** - Toggle DevTools connection without page reload

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│            Chrome Extension (apps/devtools/)                 │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Background │◄─┤ Content      │◄─┤ DevTools Panel   │   │
│  │ Script     │  │ Script       │  │ (React UI)       │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
│       ▲               ▲                     │               │
└───────┼───────────────┼─────────────────────┼───────────────┘
        │               │                     │
        │         window.__BLAC_DEVTOOLS__    │
        │               │                     │
┌───────┴───────────────┴─────────────────────┴───────────────┐
│                    User's React App                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @blac/devtools-connect (npm package)              │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │ DevToolsPlugin (SystemPlugin)                │ │    │
│  │  │ - Intercepts all lifecycle events            │ │    │
│  │  │ - Sends to bridge via window messages        │ │    │
│  │  │ - Handles time-travel commands               │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │ DevToolsBridge                               │ │    │
│  │  │ - Window message communication               │ │    │
│  │  │ - Rate limiting, size limits                 │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Blac Core (existing)                              │    │
│  │  - CounterBloc, UserBloc, etc.                     │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### 1.1 Package Structures

**A. `packages/devtools-connect/` (npm package)**

```
packages/devtools-connect/
├── src/
│   ├── plugin/
│   │   ├── DevToolsPlugin.ts     # SystemPlugin implementation
│   │   └── types.ts              # Plugin types
│   ├── bridge/
│   │   ├── DevToolsBridge.ts     # Window message bridge
│   │   └── types.ts              # Message types
│   ├── serialization/
│   │   ├── serialize.ts          # Safe JSON serialization
│   │   └── deserialize.ts        # Event deserialization
│   └── index.ts                  # Public API exports
├── package.json
├── tsconfig.json
└── README.md
```

**User Installation:**

```bash
npm install @blac/devtools-connect
```

**User Usage:**

```typescript
// main.tsx
import { DevToolsPlugin } from '@blac/devtools-connect';

Blac.addPlugin(
  new DevToolsPlugin({
    enabled: import.meta.env.DEV, // Only in development
    maxEvents: 500,
  }),
);
```

**B. `apps/devtools/` (Chrome Extension - not npm)**

```
apps/devtools/
├── extension/                  # Chrome extension files
│   ├── manifest.json          # Extension config (v3)
│   ├── background.ts          # Service worker
│   ├── contentScript.ts       # Page injection
│   ├── devtools.html          # Entry point
│   ├── panel.html             # DevTools panel
│   └── icons/                 # Extension icons
├── src/                        # React UI for panel
│   ├── components/
│   │   ├── EventLog.tsx       # Event list component
│   │   ├── StateViewer.tsx    # JSON tree for state
│   │   ├── Timeline.tsx       # Time-travel slider
│   │   ├── BlocList.tsx       # Active blocs list
│   │   └── ConnectionStatus.tsx
│   ├── App.tsx                # Main panel app
│   └── main.tsx               # Entry point
├── package.json
├── vite.config.ts             # Vite for building extension
└── README.md
```

---

#### 1.2 DevTools Plugin (packages/devtools-connect)

**File:** `packages/devtools-connect/src/plugin/DevToolsPlugin.ts`

**Responsibilities:**

- Hook into BlaC lifecycle events (onCreate, onEvent, onStateChange, onDispose)
- Serialize state/events safely (handle circular refs, functions, symbols)
- Send messages to bridge with size limits (max 10MB per message)
- Handle time-travel commands from DevTools (replay to event index)
- Zero production overhead when extension not installed

**Implementation:**

```typescript
import { SystemPlugin, BlocBase, Blac } from '@blac/core';
import { DevToolsBridge } from '../bridge/DevToolsBridge';
import { serialize } from '../serialization/serialize';
import type { SerializedEvent } from './types';

export interface DevToolsPluginConfig {
  enabled?: boolean;
  maxEvents?: number;
}

export class DevToolsPlugin implements SystemPlugin {
  name = 'DevToolsPlugin';
  private bridge: DevToolsBridge;
  private eventHistory: SerializedEvent[] = [];
  private maxEvents: number;
  private enabled: boolean;

  constructor(config: DevToolsPluginConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.maxEvents = config.maxEvents ?? 500;
    this.bridge = new DevToolsBridge(this.enabled);
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    if (!this.enabled) return;

    this.bridge.send({
      type: 'BLOC_CREATED',
      payload: {
        id: bloc.uid,
        name: bloc._name,
        state: serialize(bloc.state),
        timestamp: Date.now(),
      },
    });
  }

  onEventDispatched(bloc: BlocBase<any>, event: any): void {
    if (!this.enabled) return;

    // Store event for time-travel
    const serializedEvent: SerializedEvent = {
      id: this.generateEventId(),
      blocId: bloc.uid,
      blocName: bloc._name,
      type: event.constructor.name,
      payload: serialize(event),
      timestamp: Date.now(),
    };

    this.eventHistory.push(serializedEvent);

    // Limit history size (prevent memory leaks)
    if (this.eventHistory.length > this.maxEvents) {
      this.eventHistory.shift();
    }

    this.bridge.send({
      type: 'EVENT_DISPATCHED',
      payload: serializedEvent,
    });
  }

  onStateChanged(bloc: BlocBase<any>, prevState: any, newState: any): void {
    if (!this.enabled) return;

    this.bridge.send({
      type: 'STATE_CHANGED',
      payload: {
        blocId: bloc.uid,
        state: serialize(newState),
        diff: this.computeDiff(prevState, newState),
        timestamp: Date.now(),
      },
    });
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    if (!this.enabled) return;

    this.bridge.send({
      type: 'BLOC_DISPOSED',
      payload: {
        id: bloc.uid,
        name: bloc._name,
        timestamp: Date.now(),
      },
    });
  }

  // Time-travel: Replay events up to index
  async replayToEvent(eventIndex: number): Promise<void> {
    const eventsToReplay = this.eventHistory.slice(0, eventIndex + 1);

    // Reset all blocs to initial state
    // TODO: This needs proper implementation in Blac core
    // Blac.disposeAll();

    // Replay events
    for (const event of eventsToReplay) {
      const bloc = Blac.instance(event.blocId);
      const eventInstance = this.deserializeEvent(event);
      (bloc as any).add(eventInstance);
    }
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private computeDiff(prev: any, next: any): any {
    // Simple diff implementation (can be enhanced)
    const diff: any = {};

    for (const key in next) {
      if (prev[key] !== next[key]) {
        diff[key] = { prev: prev[key], next: next[key] };
      }
    }

    return diff;
  }

  private deserializeEvent(serializedEvent: SerializedEvent): any {
    // Reconstruct event from serialized form
    // This requires event class registry (future enhancement)
    return serializedEvent.payload;
  }
}
```

---

#### 1.3 Message Bridge (packages/devtools-connect)

**File:** `packages/devtools-connect/src/bridge/DevToolsBridge.ts`

**Security Requirements:**

- Validate message origin (same-origin policy)
- Sanitize all data before sending to UI (prevent XSS)
- Rate-limit messages (max 100/sec to prevent DoS)
- Size limits per message (10MB max)

```typescript
import type { DevToolsMessage } from './types';

export class DevToolsBridge {
  private messageQueue: DevToolsMessage[] = [];
  private isConnected = false;
  private rateLimitCounter = 0;
  private rateLimitWindow = 1000; // 1 second
  private maxMessagesPerSecond = 100;

  constructor(enabled: boolean) {
    if (!enabled || typeof window === 'undefined') return;

    // Check if extension is installed
    this.isConnected = this.checkConnection();

    if (this.isConnected) {
      this.setupListeners();
      this.startRateLimitReset();
    }
  }

  private checkConnection(): boolean {
    // Extension injects this marker
    return !!(window as any).__BLAC_DEVTOOLS__;
  }

  send(message: DevToolsMessage): void {
    if (!this.isConnected) return;

    // Rate limiting
    if (this.rateLimitCounter >= this.maxMessagesPerSecond) {
      console.warn('[BlaC DevTools] Rate limit exceeded, dropping message');
      return;
    }

    // Size limit
    const serialized = JSON.stringify(message);
    if (serialized.length > 10_000_000) {
      // 10MB
      console.error('[BlaC DevTools] Message too large:', serialized.length);
      return;
    }

    this.rateLimitCounter++;

    window.postMessage(
      {
        source: 'blac-devtools-app',
        payload: message,
      },
      '*',
    );
  }

  private setupListeners(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from same window
      if (event.source !== window) return;
      if (event.data.source !== 'blac-devtools-extension') return;

      const command = event.data.payload;

      // Handle commands from DevTools
      this.handleCommand(command);
    });
  }

  private handleCommand(command: any): void {
    switch (command.type) {
      case 'TIME_TRAVEL':
        // Dispatch to plugin
        this.handleTimeTravel(command.payload.eventIndex);
        break;
      case 'REQUEST_STATE':
        this.handleStateRequest(command.payload.blocId);
        break;
      case 'CLEAR_EVENTS':
        this.handleClearEvents();
        break;
    }
  }

  private startRateLimitReset(): void {
    setInterval(() => {
      this.rateLimitCounter = 0;
    }, this.rateLimitWindow);
  }

  private handleTimeTravel(eventIndex: number): void {
    // Plugin will handle this
    window.dispatchEvent(
      new CustomEvent('blac-devtools-time-travel', {
        detail: { eventIndex },
      }),
    );
  }

  private handleStateRequest(blocId: string): void {
    window.dispatchEvent(
      new CustomEvent('blac-devtools-request-state', {
        detail: { blocId },
      }),
    );
  }

  private handleClearEvents(): void {
    window.dispatchEvent(new CustomEvent('blac-devtools-clear-events'));
  }
}
```

---

#### 1.4 Serialization Utilities (packages/devtools-connect)

**File:** `packages/devtools-connect/src/serialization/serialize.ts`

```typescript
export function serialize(data: any): any {
  const seen = new WeakSet();

  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }

      // Handle special types
      if (value === undefined) return '[undefined]';
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'symbol') return '[Symbol]';
      if (value instanceof Error)
        return {
          __type: 'Error',
          message: value.message,
          stack: value.stack,
        };
      if (value instanceof Date)
        return {
          __type: 'Date',
          value: value.toISOString(),
        };
      if (value instanceof RegExp)
        return {
          __type: 'RegExp',
          value: value.toString(),
        };

      return value;
    }),
  );
}
```

---

#### 1.5 Chrome Extension Manifest (apps/devtools)

**File:** `apps/devtools/extension/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "BlaC DevTools",
  "version": "1.0.0",
  "description": "DevTools for BlaC state management - event log, time-travel debugging, state inspection",
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_start"
    }
  ],
  "permissions": ["storage", "tabs"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**File:** `apps/devtools/extension/contentScript.ts`

```typescript
// Inject marker to let devtools-connect know extension is present
(window as any).__BLAC_DEVTOOLS__ = true;

// Forward messages between app and extension
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data.source === 'blac-devtools-app') {
    // Forward to extension
    chrome.runtime.sendMessage(event.data.payload);
  }
});

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message) => {
  // Forward to app
  window.postMessage(
    {
      source: 'blac-devtools-extension',
      payload: message,
    },
    '*',
  );
});
```

---

### Phase 2: UI Implementation (Week 2)

#### 2.1 Event Log Component

**File:** `apps/devtools/src/components/EventLog.tsx`

**Features:**

- Virtual scrolling (handle 10k+ events)
- Filtering by bloc name or event type
- Search by event payload
- Click to jump to that moment in time
- Export events as JSON

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function EventLog({ events }: { events: SerializedEvent[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div ref={parentRef} className="event-log">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const event = events[virtualItem.index];
          return (
            <EventRow
              key={virtualItem.key}
              event={event}
              onClick={() => onEventClick(virtualItem.index)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
```

#### 2.2 State Viewer Component

**File:** `apps/devtools/src/components/StateViewer.tsx`

**Features:**

- Collapsible JSON tree (like Chrome DevTools)
- Syntax highlighting
- Copy path to clipboard
- Diff view (before/after)

**Library:** Use `react-json-tree` for MVP

#### 2.3 Time-Travel Component

**File:** `apps/devtools/src/components/Timeline.tsx`

**Features:**

- Slider with event markers
- Play/pause animation (auto-advance through events)
- Jump to event by clicking marker
- Show current event index / total

---

### Phase 3: Testing & Polish (Week 3)

#### 3.1 Testing Strategy

**packages/devtools-connect tests:**

- Unit tests for serialization (circular refs, special types)
- Unit tests for bridge (rate limiting, size limits)
- Unit tests for plugin (event tracking, time-travel)

**apps/devtools tests:**

- Integration tests: Extension ↔ App communication
- Manual testing: Real app (playground) with edge cases

**Edge Cases to Test:**

- Circular references in state
- Functions/symbols in state
- Large state (1MB+)
- Rapid event dispatch (100+ events/sec)
- Multiple tabs with same app
- Extension disabled/enabled dynamically

#### 3.2 Performance Benchmarks

- Event log with 10,000 events: < 100ms render
- Time-travel to any event: < 500ms
- Memory overhead: < 50MB
- FPS impact on host app: < 5%

#### 3.3 Documentation

**packages/devtools-connect:**

- Installation guide
- Quick start (5-minute tutorial)
- API reference
- Configuration options

**apps/devtools:**

- Chrome Web Store listing
- Screenshots and demo video
- Troubleshooting guide

---

## Advanced Features (Phase 4+)

### Performance Profiling (Weeks 4-5)

- Re-render counts per component
- Slow event handlers (>16ms)
- Memory usage over time
- Component tree with bloc dependencies

### Event Flow Visualization (Weeks 6-7)

- Graph: Event → Handlers → State Changes → Re-renders
- Interactive (click to inspect)
- Timeline view (Gantt chart style)

### Export/Import Sessions (Week 8)

- Export full session (events + state snapshots)
- Import session for debugging
- Share session URLs (cloud storage integration)

---

## Files to Create/Modify

### New Packages

- `packages/devtools-connect/` - npm package for plugin and bridge
- `apps/devtools/` - Chrome extension application

### Core Package Changes

- `packages/blac/src/core/Blac.ts:150` - Add `addSystemPlugin()` method if not exists
- `packages/blac/src/types.ts:50` - Add `SystemPlugin` interface if not exists

### Workspace Configuration

- `pnpm-workspace.yaml` - Add devtools-connect to catalog if needed
- `turbo.json` - Add build pipeline for devtools-connect

### Documentation

- `apps/docs/docs/devtools/installation.md` - Installation guide
- `apps/docs/docs/devtools/quick-start.md` - Quick start tutorial
- `apps/docs/docs/devtools/api-reference.md` - API reference

### Playground Integration

- `apps/playground/src/main.tsx:10` - Add DevTools plugin initialization
- `apps/playground/package.json` - Add @blac/devtools-connect dependency

---

## Acceptance Criteria

### MVP (Must pass before launch)

- [ ] `packages/devtools-connect` publishes to npm successfully
- [ ] Extension installs from Chrome Web Store without errors
- [ ] User can `npm install @blac/devtools-connect` and use plugin
- [ ] Event log displays all events from playground counter example
- [ ] State viewer shows current state with collapsible JSON tree
- [ ] Time-travel slider rewinds state correctly (all events)
- [ ] Zero console errors in host app when extension disabled
- [ ] Performance: Event log with 1000 events renders in < 100ms
- [ ] Security: No XSS vulnerabilities in state display (test with `<script>` in state)
- [ ] Memory: DevTools uses < 50MB RAM with 1000 events
- [ ] Documentation: 5-minute quick start guide complete

### Phase 2 (Advanced features)

- [ ] Performance profiler shows component re-render counts
- [ ] Event flow visualization renders correctly
- [ ] Export/import session works across browser restarts
- [ ] Dark mode matches Chrome DevTools theme
- [ ] Keyboard shortcuts (j/k to navigate events, space to play/pause)

---

## Risks & Mitigations

### Risk 1: Chrome API Breaking Changes

**Mitigation:**

- Use stable APIs only (Manifest v3)
- Maintain compatibility matrix in README
- Test against Chrome Canary monthly

### Risk 2: Performance Overhead

**Mitigation:**

- Virtual scrolling for event log (only render visible)
- Debounce state updates (max 60fps)
- Size limits on serialization (max 10MB per message)
- Benchmark against Redux DevTools

### Risk 3: Security Vulnerabilities

**Mitigation:**

- Sanitize all state before display (DOMPurify in extension UI)
- Content Security Policy in manifest
- No `eval()` or `Function()` anywhere
- Restrict permissions to minimum required

### Risk 4: Serialization Edge Cases

**Mitigation:**

- Custom serializer handles: circular refs, functions, symbols, undefined
- Try-catch around all serialization with fallback
- Display "[Non-serializable]" placeholder for failures
- Test with complex real-world state (nested objects, classes, proxies)

### Risk 5: Version Mismatch

**Mitigation:**

- Plugin and extension version compatibility check
- Display warning if versions don't match
- Document version compatibility matrix

---

## Out of Scope (Not in MVP)

### Explicitly NOT Building

- ❌ **Visual state machine editor** (too complex, not core value)
- ❌ **Flame graphs** (Phase 4+ if requested)
- ❌ **Network request tracking** (use Chrome Network tab)
- ❌ **React component tree** (use React DevTools)
- ❌ **Code coverage** (use dedicated tools)

### Future Considerations (Post-MVP)

- Firefox extension (depends on Chrome adoption)
- VS Code extension (inline debugging)
- Standalone Electron app (for non-Chrome users)
- Cloud session storage (share debugging sessions)

---

## Next Steps

### 1. Set up `packages/devtools-connect/`

```bash
cd packages
mkdir devtools-connect
cd devtools-connect
pnpm init
```

**package.json:**

```json
{
  "name": "@blac/devtools-connect",
  "version": "0.1.0",
  "description": "DevTools plugin for BlaC state management",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@blac/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

### 2. Set up `apps/devtools/`

```bash
cd apps
pnpm create vite devtools --template react-ts
```

### 3. Implement Plugin

- Build DevToolsPlugin in `packages/devtools-connect/src/plugin/`
- Build DevToolsBridge in `packages/devtools-connect/src/bridge/`
- Build serialization utilities

### 4. Implement Extension

- Create manifest.json with Manifest v3
- Build background script and content script
- Build React UI panel

### 5. Test Integration

- Add plugin to playground app
- Test with Chrome extension loaded unpacked
- Verify events flow from app → plugin → extension → UI

### 6. Document

- Write installation guide
- Write quick start tutorial
- Create API reference

### 7. Publish

- Publish `@blac/devtools-connect` to npm
- Submit Chrome extension to Web Store

---

**Estimated Effort:** 3 weeks (MVP), 8 weeks (advanced features)  
**Dependencies:** None (can start immediately)

---

_This plan follows the strategic recommendation from `reports/strategic-differentiation-analysis.md` to prioritize DevTools as #1 competitive differentiator._

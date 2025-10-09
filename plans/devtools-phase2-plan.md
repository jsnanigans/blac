# BlaC DevTools Phase 2: Refined Implementation Plan

**Date:** October 8, 2025  
**Status:** Research Complete, Ready to Implement  
**Research:** `/reports/devtools-best-practices-research.md`

## Executive Summary

Based on comprehensive research of Redux DevTools, React DevTools, and industry best practices, this plan focuses on the **20% of features that provide 80% of developer value**, while leveraging BlaC's unique competitive advantages.

### Strategy: Phased Rollout

**Phase 0 (Week 1):** Redux DevTools Integration - Instant value, low effort  
**Phase 1 (Weeks 2-4):** Core Custom DevTools - Time-travel, state inspection, action log  
**Phase 2 (Weeks 5-6):** React Integration - Re-render tracking, component highlighting  
**Phase 3 (Weeks 7-8):** Performance & Polish - Profiling, optimization, UX refinement

---

## Current State Analysis

### ✅ What's Working (Phase 1 Complete)

- Extension loads and connects to page
- `@blac/devtools-connect` npm package published
- Basic event capture working
- Message bridge functional
- Safe serialization with limits

### ❌ Critical Issues to Fix

1. **Random disconnections** - No heartbeat/keepalive
2. **No state visibility** - Can only see bloc names
3. **Minimal event display** - Just a basic table
4. **No React integration** - Can't track component re-renders
5. **Missing time-travel** - Core feature not implemented
6. **No performance insights** - Can't identify slow operations

---

## Phase 0: Quick Win with Redux DevTools (Week 1)

### Goal

**Ship DevTools support in 2-3 days** by piggybacking on Redux DevTools.

### Why This First?

- Redux DevTools is the industry standard (14.3k ⭐)
- Already installed by most React developers
- Proven UX patterns (time-travel, state inspection, action log)
- Zero custom UI needed initially
- Validates architecture before building custom UI

### Implementation

**File:** `packages/devtools-connect/src/integrations/ReduxDevToolsAdapter.ts`

```typescript
import type { BlacPlugin } from '@blac/core';
import type { BlocBase, Bloc } from '@blac/core';

interface ReduxDevToolsExtension {
  connect(options?: { name?: string }): ReduxDevToolsInstance;
}

interface ReduxDevToolsInstance {
  init(state: any): void;
  send(action: { type: string; [key: string]: any }, state: any): void;
  subscribe(listener: (message: any) => void): () => void;
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
  }
}

export class ReduxDevToolsAdapter implements BlacPlugin {
  readonly name = 'ReduxDevToolsAdapter';
  readonly version = '0.1.0';

  private devTools: ReduxDevToolsInstance | null = null;
  private currentState: Map<string, any> = new Map();
  private enabled: boolean;

  constructor(config: { enabled?: boolean; name?: string } = {}) {
    this.enabled = config.enabled ?? true;

    if (
      this.enabled &&
      typeof window !== 'undefined' &&
      window.__REDUX_DEVTOOLS_EXTENSION__
    ) {
      this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
        name: config.name || 'BlaC State',
      });

      this.devTools.init({});

      // Handle time-travel from Redux DevTools
      this.devTools.subscribe((message) => {
        if (message.type === 'DISPATCH' && message.state) {
          this.handleTimeTravel(JSON.parse(message.state));
        }
      });
    }
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    if (!this.devTools) return;

    this.currentState.set(bloc._name, bloc.state);

    this.devTools.send(
      {
        type: `[${bloc._name}] CREATED`,
      },
      this.getGlobalState(),
    );
  }

  onEventAdded(bloc: Bloc<any, any>, event: any): void {
    if (!this.devTools) return;

    const eventName = event.constructor?.name || 'UnknownEvent';

    this.devTools.send(
      {
        type: `[${bloc._name}] ${eventName}`,
        payload: event,
      },
      this.getGlobalState(),
    );
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    if (!this.devTools) return;

    this.currentState.set(bloc._name, currentState);

    this.devTools.send(
      {
        type: `[${bloc._name}] STATE_CHANGED`,
        previousState,
        currentState,
      },
      this.getGlobalState(),
    );
  }

  onBlocDisposed(bloc: BlocBase<any>): void {
    if (!this.devTools) return;

    this.currentState.delete(bloc._name);

    this.devTools.send(
      {
        type: `[${bloc._name}] DISPOSED`,
      },
      this.getGlobalState(),
    );
  }

  private getGlobalState(): Record<string, any> {
    return Object.fromEntries(this.currentState);
  }

  private handleTimeTravel(state: Record<string, any>): void {
    console.log('[ReduxDevToolsAdapter] Time travel:', state);
    // TODO: Implement state restoration
    // This would require BlaC core support for replaying to a specific state
  }
}
```

**Usage:**

```typescript
// In user's app
import { Blac } from '@blac/core';
import { ReduxDevToolsAdapter } from '@blac/devtools-connect';

Blac.instance.plugins.add(
  new ReduxDevToolsAdapter({
    enabled: import.meta.env.DEV,
    name: 'My App State',
  }),
);
```

**Benefits:**

- ✅ Works with existing Redux DevTools extension
- ✅ Time-travel debugging out of the box
- ✅ Action log with state inspection
- ✅ No custom UI needed
- ✅ 1-2 days to implement

**Result:** Developers get immediate DevTools support while custom UI is being built.

---

## Phase 1: Core Custom DevTools (Weeks 2-4)

### Goal

**Build the essential 5 features** that provide 80% of developer value.

### Top 5 Features (Ranked by Usage)

1. **Time-Travel Debugging** ⭐⭐⭐⭐⭐
2. **Real-Time State Inspection** ⭐⭐⭐⭐⭐
3. **Action/Event History** ⭐⭐⭐⭐
4. **Connection Stability** ⭐⭐⭐⭐
5. **Filter & Search** ⭐⭐⭐

---

### 1. Fix Connection Stability (Priority 1)

**Issue:** Random disconnections after some time.

**Root Causes:**

- No heartbeat mechanism
- Chrome service worker can terminate
- No connection recovery

**Solution: Heartbeat + Persistence + Reconnection**

**File:** `packages/devtools-connect/src/bridge/DevToolsBridge.ts`

```typescript
export class DevToolsBridge {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = Date.now();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(config: DevToolsBridgeConfig) {
    // ... existing code
    if (this.isConnected) {
      this.startHeartbeat();
      this.setupListeners();
      this.startRateLimitReset();
    }
  }

  private startHeartbeat(): void {
    // Send heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected) return;

      this.send({
        type: 'HEARTBEAT',
        payload: {
          timestamp: Date.now(),
          connectedSince: this.connectedSince,
        },
      });

      // Check if we've received a heartbeat response recently
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > 15000) {
        // 15 seconds without response
        console.warn(
          '[BlaC DevTools] Heartbeat timeout, attempting reconnection...',
        );
        this.reconnect();
      }
    }, 5000);
  }

  private setupListeners(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data as WindowMessage;
      if (!data || typeof data !== 'object') return;
      if (data.source !== 'blac-devtools-extension') return;

      const command = data.payload as DevToolsCommand;

      // Update heartbeat timestamp on any message
      this.lastHeartbeat = Date.now();

      if (command.type === 'HEARTBEAT_ACK') {
        this.reconnectAttempts = 0; // Reset on successful heartbeat
        return;
      }

      this.handleCommand(command);
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkConnection();
      }
    });
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '[BlaC DevTools] Max reconnection attempts reached. Please reload DevTools panel.',
      );
      this.isConnected = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff

    console.log(
      `[BlaC DevTools] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    setTimeout(() => {
      this.isConnected = this.checkConnection();

      if (this.isConnected) {
        console.log('[BlaC DevTools] Reconnected successfully');
        this.reconnectAttempts = 0;

        // Request full state refresh
        this.send({
          type: 'RECONNECTED',
          payload: {
            timestamp: Date.now(),
            requestStateSync: true,
          },
        });
      } else {
        this.reconnect(); // Try again
      }
    }, delay);
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isConnected = false;
    this.commandHandlers.clear();
  }
}
```

**File:** `apps/devtools/extension/background.ts`

```typescript
// Persist connection state to survive service worker restarts
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  if (port.name !== 'blac-devtools-panel') return;

  let inspectedTabId: number | undefined;

  port.onMessage.addListener((message: any) => {
    if (message.type === 'INIT' && typeof message.tabId === 'number') {
      inspectedTabId = message.tabId;
      connections.set(message.tabId, port);

      // Persist connection info
      chrome.storage.session.set({
        [`connection_${message.tabId}`]: {
          connected: true,
          timestamp: Date.now(),
        },
      });
      return;
    }

    // Send heartbeat acknowledgment
    if (message.type === 'HEARTBEAT') {
      port.postMessage({
        type: 'HEARTBEAT_ACK',
        payload: { timestamp: Date.now() },
      });
      return;
    }

    if (inspectedTabId !== undefined) {
      chrome.tabs.sendMessage(inspectedTabId, message);
    }
  });

  port.onDisconnect.addListener(() => {
    if (inspectedTabId !== undefined) {
      connections.delete(inspectedTabId);
      chrome.storage.session.remove(`connection_${inspectedTabId}`);
    }
  });
});

// Restore connections on service worker wake
chrome.runtime.onStartup.addListener(async () => {
  const items = await chrome.storage.session.get();
  Object.keys(items).forEach((key) => {
    if (key.startsWith('connection_')) {
      const tabId = parseInt(key.replace('connection_', ''));
      console.log(`[Background] Restoring connection for tab ${tabId}`);
      // Connection will be restored when panel reconnects
    }
  });
});
```

**Result:** Stable connection with automatic recovery.

---

### 2. Real-Time State Inspection (Priority 1)

**Goal:** JSON tree viewer with copy, search, and expand/collapse.

**Library:** Use `react-json-tree` (9k stars, proven in Redux DevTools)

```bash
cd apps/devtools
pnpm add react-json-tree
pnpm add @types/react-json-tree -D
```

**File:** `apps/devtools/src/components/StateViewer.tsx`

```typescript
import JSONTree from 'react-json-tree';
import { useState } from 'react';

interface StateViewerProps {
  blocName: string;
  state: any;
  previousState?: any;
  onCopy?: () => void;
}

// Match Chrome DevTools theme
const theme = {
  scheme: 'monokai',
  author: 'wimer hazenberg (http://www.monokai.nl)',
  base00: '#272822',
  base01: '#383830',
  base02: '#49483e',
  base03: '#75715e',
  base04: '#a59f85',
  base05: '#f8f8f2',
  base06: '#f5f4f1',
  base07: '#f9f8f5',
  base08: '#f92672',
  base09: '#fd971f',
  base0A: '#f4bf75',
  base0B: '#a6e22e',
  base0C: '#a1efe4',
  base0D: '#66d9ef',
  base0E: '#ae81ff',
  base0F: '#cc6633',
};

export function StateViewer({
  blocName,
  state,
  previousState,
  onCopy,
}: StateViewerProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    onCopy?.();
  };

  const exportState = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blocName}-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredState = searchQuery
    ? filterObjectByQuery(state, searchQuery)
    : state;

  return (
    <div className="state-viewer">
      <div className="state-header">
        <h3>{blocName} State</h3>
        <div className="state-actions">
          <input
            type="text"
            placeholder="Search state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {previousState && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={showDiff ? 'active' : ''}
            >
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          )}
          <button onClick={copyToClipboard} title="Copy to clipboard">
            📋 Copy
          </button>
          <button onClick={exportState} title="Export as JSON">
            💾 Export
          </button>
        </div>
      </div>

      <div className="state-content">
        {showDiff && previousState ? (
          <DiffViewer previous={previousState} current={state} />
        ) : (
          <JSONTree
            data={filteredState}
            theme={theme}
            invertTheme={false}
            hideRoot
            shouldExpandNodeInitially={(keyPath, data, level) => level < 2}
            labelRenderer={([key]) => <strong>{key}:</strong>}
            valueRenderer={(raw, value) => {
              if (typeof value === 'string' && value.length > 100) {
                return <span title={value}>{value.slice(0, 100)}...</span>;
              }
              return <span>{String(raw)}</span>;
            }}
          />
        )}
      </div>
    </div>
  );
}

function filterObjectByQuery(obj: any, query: string): any {
  const lowerQuery = query.toLowerCase();

  if (typeof obj !== 'object' || obj === null) {
    return String(obj).toLowerCase().includes(lowerQuery) ? obj : null;
  }

  const filtered: any = Array.isArray(obj) ? [] : {};
  let hasMatches = false;

  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes(lowerQuery)) {
      filtered[key] = value;
      hasMatches = true;
    } else {
      const filteredValue = filterObjectByQuery(value, query);
      if (filteredValue !== null) {
        filtered[key] = filteredValue;
        hasMatches = true;
      }
    }
  }

  return hasMatches ? filtered : null;
}
```

**File:** `apps/devtools/src/components/DiffViewer.tsx`

```typescript
import { useMemo } from 'react';
import { diff as deepDiff, Diff } from 'deep-diff';

interface DiffViewerProps {
  previous: any;
  current: any;
}

export function DiffViewer({ previous, current }: DiffViewerProps) {
  const differences = useMemo(
    () => deepDiff(previous, current) || [],
    [previous, current],
  );

  return (
    <div className="diff-viewer">
      {differences.length === 0 ? (
        <div className="no-changes">No changes detected</div>
      ) : (
        <table className="diff-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Previous</th>
              <th>Current</th>
            </tr>
          </thead>
          <tbody>
            {differences.map((diff, index) => (
              <DiffRow key={index} diff={diff} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DiffRow({ diff }: { diff: Diff<any, any> }) {
  const path = diff.path?.join('.') || 'root';

  let previous = '';
  let current = '';
  let changeType = '';

  switch (diff.kind) {
    case 'N': // New
      current = JSON.stringify(diff.rhs);
      changeType = 'added';
      break;
    case 'D': // Deleted
      previous = JSON.stringify(diff.lhs);
      changeType = 'deleted';
      break;
    case 'E': // Edited
      previous = JSON.stringify(diff.lhs);
      current = JSON.stringify(diff.rhs);
      changeType = 'edited';
      break;
    case 'A': // Array
      changeType = 'array-changed';
      break;
  }

  return (
    <tr className={`diff-row diff-${changeType}`}>
      <td className="diff-path">{path}</td>
      <td className="diff-previous">{previous || '-'}</td>
      <td className="diff-current">{current || '-'}</td>
    </tr>
  );
}
```

**Dependencies:**

```bash
pnpm add deep-diff react-json-tree
pnpm add @types/deep-diff @types/react-json-tree -D
```

---

### 3. Enhanced Bloc List with Status & Metrics (Priority 1)

**Goal:** Show full bloc details, lifecycle status, and metrics.

**File:** `packages/devtools-connect/src/bridge/types.ts`

```typescript
export interface BlocInfo {
  id: string;
  name: string;
  state: any;
  status: 'ACTIVE' | 'DISPOSAL_REQUESTED' | 'DISPOSING' | 'DISPOSED';
  createdAt: number;
  disposedAt?: number;
  eventCount: number;
  stateChangeCount: number;
  consumerCount: number;
  lastEventAt?: number;
  lastStateChangeAt?: number;
  isolated: boolean;
  keepAlive: boolean;
}
```

**File:** `packages/devtools-connect/src/plugin/DevToolsPlugin.ts`

```typescript
private blocMetrics = new Map<string, {
  eventCount: number;
  stateChangeCount: number;
  createdAt: number;
  lastEventAt?: number;
  lastStateChangeAt?: number;
}>();

onBlocCreated(bloc: BlocBase<any>): void {
  if (!this.enabled) return;

  this.blocMetrics.set(bloc.uid, {
    eventCount: 0,
    stateChangeCount: 0,
    createdAt: Date.now(),
  });

  const stateResult = safeSerialize(bloc.state);

  this.bridge.send({
    type: 'BLOC_CREATED',
    payload: {
      id: bloc.uid,
      name: bloc._name,
      state: stateResult.success ? stateResult.data : { error: stateResult.error },
      status: bloc.status,
      createdAt: Date.now(),
      consumerCount: (bloc as any).consumers?.size || 0,
      isolated: (bloc.constructor as any).isolated || false,
      keepAlive: (bloc.constructor as any).keepAlive || false,
      eventCount: 0,
      stateChangeCount: 0,
    },
  });
}

onEventAdded(bloc: Bloc<any, any>, event: any): void {
  if (!this.enabled) return;

  const metrics = this.blocMetrics.get(bloc.uid);
  if (metrics) {
    metrics.eventCount++;
    metrics.lastEventAt = Date.now();
  }

  // ... rest of existing code

  // Send updated metrics
  this.bridge.send({
    type: 'BLOC_METRICS_UPDATED',
    payload: {
      id: bloc.uid,
      eventCount: metrics?.eventCount || 0,
      lastEventAt: metrics?.lastEventAt,
    },
  });
}

onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any): void {
  if (!this.enabled) return;

  const metrics = this.blocMetrics.get(bloc.uid);
  if (metrics) {
    metrics.stateChangeCount++;
    metrics.lastStateChangeAt = Date.now();
  }

  // ... rest of existing code

  // Send updated metrics
  this.bridge.send({
    type: 'BLOC_METRICS_UPDATED',
    payload: {
      id: bloc.uid,
      stateChangeCount: metrics?.stateChangeCount || 0,
      lastStateChangeAt: metrics?.lastStateChangeAt,
      consumerCount: (bloc as any).consumers?.size || 0,
    },
  });
}
```

**File:** `apps/devtools/src/components/BlocList.tsx`

```typescript
import { useState } from 'react';
import type { BlocInfo } from '@blac/devtools-connect';

interface BlocListProps {
  blocs: BlocInfo[];
  selectedBlocId: string | null;
  onBlocSelect: (id: string) => void;
}

export function BlocList({
  blocs,
  selectedBlocId,
  onBlocSelect,
}: BlocListProps) {
  const [sortBy, setSortBy] = useState<'name' | 'events' | 'age'>('name');

  const sortedBlocs = [...blocs].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'events':
        return b.eventCount - a.eventCount;
      case 'age':
        return a.createdAt - b.createdAt;
      default:
        return 0;
    }
  });

  return (
    <div className="bloc-list">
      <div className="bloc-list-header">
        <h2>Blocs ({blocs.length})</h2>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="name">Sort by Name</option>
          <option value="events">Sort by Activity</option>
          <option value="age">Sort by Age</option>
        </select>
      </div>

      <div className="bloc-items">
        {sortedBlocs.length === 0 ? (
          <div className="empty-state">
            <p>No active blocs</p>
            <p className="hint">
              Blocs will appear here as they're created in your app
            </p>
          </div>
        ) : (
          sortedBlocs.map((bloc) => (
            <BlocItem
              key={bloc.id}
              bloc={bloc}
              isSelected={selectedBlocId === bloc.id}
              onClick={() => onBlocSelect(bloc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BlocItem({
  bloc,
  isSelected,
  onClick,
}: {
  bloc: BlocInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const age = Date.now() - bloc.createdAt;
  const ageStr = formatAge(age);

  const statusColor = {
    ACTIVE: '#4ade80',
    DISPOSAL_REQUESTED: '#fb923c',
    DISPOSING: '#fb923c',
    DISPOSED: '#ef4444',
  }[bloc.status];

  return (
    <div
      className={`bloc-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="bloc-header">
        <span
          className="status-indicator"
          style={{ backgroundColor: statusColor }}
          title={bloc.status}
        />
        <div className="bloc-name">{bloc.name}</div>
        {bloc.isolated && <span className="badge">isolated</span>}
        {bloc.keepAlive && <span className="badge">keepAlive</span>}
      </div>

      <div className="bloc-metrics">
        <div className="metric">
          <span className="metric-label">Events</span>
          <span className="metric-value">{bloc.eventCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Changes</span>
          <span className="metric-value">{bloc.stateChangeCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Consumers</span>
          <span className="metric-value">{bloc.consumerCount}</span>
        </div>
      </div>

      <div className="bloc-age" title={`Created ${ageStr} ago`}>
        {ageStr}
      </div>
    </div>
  );
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
```

---

### 4. Time-Travel Debugging (Priority 2)

**Goal:** Navigate through state history with slider + timeline.

**File:** `apps/devtools/src/components/Timeline.tsx`

```typescript
import { useState, useEffect } from 'react';
import type { SerializedEvent } from '@blac/devtools-connect';

interface TimelineProps {
  events: SerializedEvent[];
  currentIndex: number;
  isLive: boolean;
  onSeek: (index: number) => void;
  onToggleLive: () => void;
}

export function Timeline({
  events,
  currentIndex,
  isLive,
  onSeek,
  onToggleLive,
}: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying || isLive) return;

    const interval = setInterval(
      () => {
        if (currentIndex < events.length - 1) {
          onSeek(currentIndex + 1);
        } else {
          setIsPlaying(false);
        }
      },
      500 / playbackSpeed,
    );

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, events.length, playbackSpeed, isLive]);

  const handleSliderChange = (value: number) => {
    if (isLive) {
      onToggleLive(); // Switch to history mode
    }
    onSeek(value);
  };

  return (
    <div className="timeline">
      {!isLive && (
        <div className="timeline-warning">
          ⏸️ <strong>Historical State View</strong> - You are viewing state from the past.
          <button onClick={onToggleLive} className="resume-live-btn">
            Resume Live
          </button>
        </div>
      )}

      <div className="timeline-controls">
        <button
          onClick={() => handleSliderChange(0)}
          disabled={currentIndex === 0 || isLive}
          title="Jump to first event"
        >
          ⏮️
        </button>

        <button
          onClick={() => handleSliderChange(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0 || isLive}
          title="Previous event"
        >
          ⏪
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={isLive || currentIndex === events.length - 1}
          title={isPlaying ? 'Pause replay' : 'Play replay'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button
          onClick={() =>
            handleSliderChange(Math.min(events.length - 1, currentIndex + 1))
          }
          disabled={currentIndex === events.length - 1 || isLive}
          title="Next event"
        >
          ⏩
        </button>

        <button
          onClick={() => handleSliderChange(events.length - 1)}
          disabled={currentIndex === events.length - 1 || isLive}
          title="Jump to latest event"
        >
          ⏭️
        </button>

        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
          disabled={isLive}
          className="playback-speed"
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
        </select>
      </div>

      <div className="timeline-slider">
        <input
          type="range"
          min={0}
          max={Math.max(0, events.length - 1)}
          value={isLive ? events.length - 1 : currentIndex}
          onChange={(e) => handleSliderChange(parseInt(e.target.value))}
          disabled={isLive || events.length === 0}
          className="timeline-range"
        />

        <div className="timeline-info">
          {isLive ? (
            <span className="live-indicator">🔴 LIVE</span>
          ) : (
            <span>
              Event {currentIndex + 1} / {events.length}
              {events[currentIndex] && (
                <span className="event-timestamp">
                  {' '}
                  - {formatTimestamp(events[currentIndex].timestamp)}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {!isLive && events[currentIndex] && (
        <div className="timeline-event-preview">
          <span className="event-bloc">{events[currentIndex].blocName}</span>
          <span className="event-type">{events[currentIndex].type}</span>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}
```

**File:** `apps/devtools/src/App.tsx`

Add time-travel state management:

```typescript
const [timelineIndex, setTimelineIndex] = useState<number>(-1); // -1 = live
const [historicalState, setHistoricalState] = useState<Map<string, any>>(
  new Map(),
);

const isLive = timelineIndex === -1;

const handleTimeTravel = (index: number) => {
  setTimelineIndex(index);

  // Request historical state from plugin
  if (port) {
    port.postMessage({
      type: 'TIME_TRAVEL',
      payload: { eventIndex: index },
    });
  }
};

const handleToggleLive = () => {
  setTimelineIndex(-1);
  setHistoricalState(new Map());
};

// Use historical state when in time-travel mode
const displayedBlocs = isLive ? blocs : historicalState;
```

---

### 5. Filter & Search (Priority 2)

**File:** `apps/devtools/src/components/FilterBar.tsx`

```typescript
import { useState, useEffect } from 'react';
import type { EventFilters } from '../types';

interface FilterBarProps {
  onFilterChange: (filters: EventFilters) => void;
  blocNames: string[];
  eventTypes: string[];
}

export function FilterBar({
  onFilterChange,
  blocNames,
  eventTypes,
}: FilterBarProps) {
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    blocName: '',
    eventType: '',
  });

  useEffect(() => {
    const debounced = setTimeout(() => {
      onFilterChange(filters);
    }, 300); // Debounce search

    return () => clearTimeout(debounced);
  }, [filters, onFilterChange]);

  return (
    <div className="filter-bar">
      <div className="filter-search">
        <input
          type="text"
          placeholder="Search events... (Cmd+F)"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
      </div>

      <div className="filter-selects">
        <select
          value={filters.blocName}
          onChange={(e) => setFilters({ ...filters, blocName: e.target.value })}
        >
          <option value="">All Blocs</option>
          {blocNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={filters.eventType}
          onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
        >
          <option value="">All Events</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            setFilters({ search: '', blocName: '', eventType: '' })
          }
          disabled={!filters.search && !filters.blocName && !filters.eventType}
          className="clear-filters-btn"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 2: React Integration (Weeks 5-6)

### Goal

**Track React-specific behavior:** component re-renders, dependency tracking, performance.

### 1. Component Re-Render Tracking

**File:** `packages/blac-react/src/useBloc.ts`

Add devtools integration:

```typescript
export function useBloc<T, E = any, P = undefined>(
  BlocClass: BlocConstructor<T, E, P>,
  config?: UseBlocConfig<T, P>,
): [T, BlocBase<T, E, P>] {
  const componentName = useComponentName(); // Get component name via stack trace or React DevTools

  // ... existing code

  useEffect(() => {
    // Notify DevTools of component subscription
    if ((window as any).__BLAC_DEVTOOLS__) {
      (window as any).__BLAC_DEVTOOLS_BRIDGE__?.send({
        type: 'COMPONENT_SUBSCRIBED',
        payload: {
          componentName,
          blocName: instance._name,
          blocId: instance.uid,
          timestamp: Date.now(),
        },
      });
    }

    return () => {
      // Notify DevTools of component unsubscription
      if ((window as any).__BLAC_DEVTOOLS__) {
        (window as any).__BLAC_DEVTOOLS_BRIDGE__?.send({
          type: 'COMPONENT_UNSUBSCRIBED',
          payload: {
            componentName,
            blocName: instance._name,
            blocId: instance.uid,
            timestamp: Date.now(),
          },
        });
      }
    };
  }, [instance, componentName]);

  // Track re-renders
  useEffect(() => {
    if ((window as any).__BLAC_DEVTOOLS__) {
      (window as any).__BLAC_DEVTOOLS_BRIDGE__?.send({
        type: 'COMPONENT_RENDERED',
        payload: {
          componentName,
          blocName: instance._name,
          blocId: instance.uid,
          state: stateSlice,
          timestamp: Date.now(),
        },
      });
    }
  });

  return [stateSlice, instance];
}

function useComponentName(): string {
  // Try to get component name from React DevTools
  const stack = new Error().stack;
  const match = stack?.match(/at (\w+)/);
  return match?.[1] || 'UnknownComponent';
}
```

**File:** `packages/devtools-connect/src/plugin/ReactIntegrationPlugin.ts`

```typescript
import type { BlacPlugin } from '@blac/core';

export class ReactIntegrationPlugin implements BlacPlugin {
  readonly name = 'ReactIntegrationPlugin';
  readonly version = '0.1.0';

  private componentSubscriptions = new Map<
    string,
    Set<{ componentName: string; timestamp: number }>
  >();
  private componentRenderCounts = new Map<string, number>();

  constructor(private bridge: any) {
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.source === 'blac-react-useBloc') {
        this.handleReactEvent(event.data.payload);
      }
    });
  }

  private handleReactEvent(payload: any): void {
    switch (payload.type) {
      case 'COMPONENT_SUBSCRIBED':
        this.trackSubscription(
          payload.blocId,
          payload.componentName,
          payload.timestamp,
        );
        break;

      case 'COMPONENT_UNSUBSCRIBED':
        this.removeSubscription(payload.blocId, payload.componentName);
        break;

      case 'COMPONENT_RENDERED':
        this.trackRender(payload.componentName);
        break;
    }
  }

  private trackSubscription(
    blocId: string,
    componentName: string,
    timestamp: number,
  ): void {
    if (!this.componentSubscriptions.has(blocId)) {
      this.componentSubscriptions.set(blocId, new Set());
    }

    this.componentSubscriptions.get(blocId)!.add({ componentName, timestamp });

    this.bridge.send({
      type: 'REACT_COMPONENT_SUBSCRIBED',
      payload: {
        blocId,
        componentName,
        timestamp,
        totalSubscribers: this.componentSubscriptions.get(blocId)!.size,
      },
    });
  }

  private removeSubscription(blocId: string, componentName: string): void {
    const subscribers = this.componentSubscriptions.get(blocId);
    if (subscribers) {
      for (const sub of subscribers) {
        if (sub.componentName === componentName) {
          subscribers.delete(sub);
          break;
        }
      }

      this.bridge.send({
        type: 'REACT_COMPONENT_UNSUBSCRIBED',
        payload: {
          blocId,
          componentName,
          timestamp: Date.now(),
          totalSubscribers: subscribers.size,
        },
      });
    }
  }

  private trackRender(componentName: string): void {
    const count = (this.componentRenderCounts.get(componentName) || 0) + 1;
    this.componentRenderCounts.set(componentName, count);

    // Only send updates for excessive re-renders (optimization)
    if (count % 10 === 0) {
      this.bridge.send({
        type: 'REACT_RENDER_COUNT',
        payload: {
          componentName,
          count,
          timestamp: Date.now(),
        },
      });
    }
  }

  getSubscribers(
    blocId: string,
  ): Array<{ componentName: string; timestamp: number }> {
    return Array.from(this.componentSubscriptions.get(blocId) || []);
  }

  getRenderCount(componentName: string): number {
    return this.componentRenderCounts.get(componentName) || 0;
  }
}
```

### 2. Component List Panel

**File:** `apps/devtools/src/components/ComponentList.tsx`

```typescript
interface ComponentInfo {
  name: string;
  blocName: string;
  blocId: string;
  renderCount: number;
  subscribedAt: number;
}

export function ComponentList({ components }: { components: ComponentInfo[] }) {
  const sortedByRenders = [...components].sort(
    (a, b) => b.renderCount - a.renderCount,
  );

  return (
    <div className="component-list">
      <h3>React Components ({components.length})</h3>

      {components.length === 0 ? (
        <div className="empty-state">No components subscribed to Blocs</div>
      ) : (
        <table className="component-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Bloc</th>
              <th>Renders</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {sortedByRenders.map((comp) => (
              <tr key={`${comp.name}-${comp.blocId}`}>
                <td>{comp.name}</td>
                <td>{comp.blocName}</td>
                <td>
                  <span
                    className={
                      comp.renderCount > 100
                        ? 'render-count-high'
                        : comp.renderCount > 50
                          ? 'render-count-medium'
                          : ''
                    }
                  >
                    {comp.renderCount}
                    {comp.renderCount > 100 && ' ⚠️'}
                  </span>
                </td>
                <td>{formatAge(Date.now() - comp.subscribedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {sortedByRenders.some((c) => c.renderCount > 100) && (
        <div className="performance-warning">
          ⚠️ Some components have excessive render counts. Consider using
          selectors to optimize.
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3: Performance & Polish (Weeks 7-8)

### 1. Virtual Scrolling for Event Log

```bash
cd apps/devtools
pnpm add react-window
pnpm add @types/react-window -D
```

**File:** `apps/devtools/src/components/EventLog.tsx`

```typescript
import { FixedSizeList } from 'react-window';
import type { SerializedEvent } from '@blac/devtools-connect';

export function EventLog({ events }: { events: SerializedEvent[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = events[index];
    return (
      <div style={style} className="event-row">
        <EventRow event={event} />
      </div>
    );
  };

  return (
    <div className="event-log">
      <FixedSizeList
        height={600}
        itemCount={events.length}
        itemSize={60}
        width="100%"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}
```

### 2. Performance Profiling

**File:** `packages/devtools-connect/src/plugin/PerformanceProfiler.ts`

```typescript
export class PerformanceProfiler {
  private eventDurations = new Map<string, number[]>();
  private slowEvents: Array<{
    blocName: string;
    eventType: string;
    duration: number;
    timestamp: number;
  }> = [];

  trackEventStart(blocName: string, eventType: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      // Track duration
      const key = `${blocName}:${eventType}`;
      if (!this.eventDurations.has(key)) {
        this.eventDurations.set(key, []);
      }
      this.eventDurations.get(key)!.push(duration);

      // Flag slow events (> 16ms = 1 frame)
      if (duration > 16) {
        this.slowEvents.push({
          blocName,
          eventType,
          duration,
          timestamp: Date.now(),
        });

        // Keep only last 100 slow events
        if (this.slowEvents.length > 100) {
          this.slowEvents.shift();
        }
      }

      return duration;
    };
  }

  getAverageDuration(blocName: string, eventType: string): number {
    const key = `${blocName}:${eventType}`;
    const durations = this.eventDurations.get(key);

    if (!durations || durations.length === 0) return 0;

    const sum = durations.reduce((a, b) => a + b, 0);
    return sum / durations.length;
  }

  getSlowEvents(): typeof this.slowEvents {
    return this.slowEvents;
  }

  reset(): void {
    this.eventDurations.clear();
    this.slowEvents = [];
  }
}
```

### 3. Keyboard Shortcuts

**File:** `apps/devtools/src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: {
  onClearEvents?: () => void;
  onFocusSearch?: () => void;
  onExportState?: () => void;
  onToggleLive?: () => void;
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey;

      if (isModifier && e.key === 'k') {
        e.preventDefault();
        handlers.onClearEvents?.();
      }

      if (isModifier && e.key === 'f') {
        e.preventDefault();
        handlers.onFocusSearch?.();
      }

      if (isModifier && e.key === 'e') {
        e.preventDefault();
        handlers.onExportState?.();
      }

      if (e.key === 'Escape') {
        handlers.onToggleLive?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
}
```

---

## Security Hardening

### Auto-Redact Sensitive Fields

**File:** `packages/devtools-connect/src/serialization/redact.ts`

```typescript
const DEFAULT_SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /access[-_]?token/i,
  /refresh[-_]?token/i,
  /auth[-_]?token/i,
  /bearer/i,
  /credential/i,
  /ssn/i,
  /credit[-_]?card/i,
  /cvv/i,
  /pin/i,
];

export function redactSensitiveData(
  obj: any,
  additionalPatterns: RegExp[] = [],
): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const patterns = [...DEFAULT_SENSITIVE_PATTERNS, ...additionalPatterns];

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, additionalPatterns));
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = patterns.some((pattern) => pattern.test(key));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, additionalPatterns);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}
```

**Usage in DevToolsPlugin:**

```typescript
import { redactSensitiveData } from '../serialization/redact';

onStateChanged(bloc: BlocBase<any>, prev: any, current: any): void {
  const redactedState = this.config.autoRedact
    ? redactSensitiveData(current, this.config.redactPatterns)
    : current;

  const stateResult = safeSerialize(redactedState);

  // ... rest of implementation
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/devtools-connect/src/__tests__/DevToolsPlugin.test.ts
import { describe, it, expect, vi } from 'vitest';
import { DevToolsPlugin } from '../plugin/DevToolsPlugin';
import { Cubit } from '@blac/core';

describe('DevToolsPlugin', () => {
  it('should track bloc creation', () => {
    const bridge = { send: vi.fn() };
    const plugin = new DevToolsPlugin({ bridge });

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    const cubit = new TestCubit();
    plugin.onBlocCreated(cubit);

    expect(bridge.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BLOC_CREATED',
        payload: expect.objectContaining({
          name: 'TestCubit',
          state: 0,
        }),
      }),
    );
  });

  it('should redact sensitive fields', () => {
    const plugin = new DevToolsPlugin({ autoRedact: true });

    const state = {
      user: {
        name: 'Alice',
        password: 'secret123',
        apiKey: 'abc123',
      },
    };

    const redacted = plugin.redactState(state);

    expect(redacted.user.name).toBe('Alice');
    expect(redacted.user.password).toBe('[REDACTED]');
    expect(redacted.user.apiKey).toBe('[REDACTED]');
  });

  it('should throttle high-frequency updates', async () => {
    const bridge = { send: vi.fn() };
    const plugin = new DevToolsPlugin({ bridge, throttle: 16 });

    // Emit 100 rapid state changes
    for (let i = 0; i < 100; i++) {
      plugin.onStateChanged(cubit, i - 1, i);
    }

    // Should batch to ~60fps (16ms throttle)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(bridge.send).toHaveBeenCalledTimes(expect.lessThan(100));
  });
});
```

### Integration Tests

```bash
cd apps/devtools
pnpm add -D puppeteer
```

```typescript
// apps/devtools/tests/integration.test.ts
import puppeteer from 'puppeteer';

describe('DevTools Extension Integration', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
  });

  it('should connect to page and capture events', async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Wait for DevTools to connect
    await page.waitForFunction(() => window.__BLAC_DEVTOOLS__);

    // Trigger an action in the app
    await page.click('#increment-button');

    // Check if DevTools received the event
    const events = await getDevToolsEvents();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'IncrementEvent',
      }),
    );
  });
});
```

---

## Performance Budget

**Strict Limits:**

- Event logging overhead: < 5% CPU
- State serialization: < 16ms (1 frame)
- UI update frequency: Max 60fps (throttled)
- Memory usage: < 100MB with 1000 events
- Extension bundle size: < 500KB

**Monitoring:**

```typescript
// Track DevTools overhead
const measureOverhead = () => {
  const start = performance.now();

  // Run 1000 state updates
  for (let i = 0; i < 1000; i++) {
    cubit.emit(i);
  }

  const withDevTools = performance.now() - start;

  // Disable DevTools
  plugin.disable();

  const startWithout = performance.now();
  for (let i = 0; i < 1000; i++) {
    cubit.emit(i);
  }
  const withoutDevTools = performance.now() - startWithout;

  const overhead = ((withDevTools - withoutDevTools) / withoutDevTools) * 100;

  expect(overhead).toBeLessThan(10); // < 10% overhead
};
```

---

## BlaC-Specific Competitive Advantages

### 1. Proxy Dependency Visualization

**Unique Insight:** Show which state properties components _actually_ access vs. what they subscribe to.

```typescript
// In DevTools UI
interface DependencyInfo {
  componentName: string;
  blocName: string;
  subscribedTo: string[]; // All state properties
  actuallyAccessed: string[]; // Only what was read via Proxy
  optimizationPotential: boolean; // subscribedTo > actuallyAccessed
}

// Show optimization suggestions
const UnusedDependencies = ({ info }: { info: DependencyInfo }) => {
  const unused = info.subscribedTo.filter(
    (prop) => !info.actuallyAccessed.includes(prop),
  );

  if (unused.length === 0) return null;

  return (
    <div className="optimization-tip">
      ⚡ <strong>{info.componentName}</strong> subscribes to{' '}
      <code>{unused.join(', ')}</code> but never accesses them.
      <button onClick={() => generateSelector(info)}>
        Generate Optimized Selector
      </button>
    </div>
  );
};

function generateSelector(info: DependencyInfo): string {
  return `
// Optimized selector (generated by BlaC DevTools)
const [state] = useBloc(${info.blocName}, {
  selector: (state) => ({
    ${info.actuallyAccessed.map((prop) => `${prop}: state.${prop}`).join(',\n    ')}
  })
});
`;
}
```

### 2. Bloc Lifecycle Visualization

**Timeline view:**

```
CounterBloc Timeline:
├─ 10:30:15.123 - Created (isolated: false, keepAlive: false)
├─ 10:30:15.156 - First consumer: HomeComponent
├─ 10:30:16.234 - Event: IncrementEvent
├─ 10:30:16.236 - State changed: 0 → 1
├─ 10:31:22.456 - Event: IncrementEvent
├─ 10:31:22.458 - State changed: 1 → 2
├─ 10:32:05.789 - Last consumer unmounted: HomeComponent
└─ 10:32:05.790 - Disposed (reason: no consumers + !keepAlive)
```

### 3. Props-Based Bloc Instance Manager

**Show all instances:**

```
UserProfileBloc
├─ Instance 1: { userId: "user-123" }
│  ├─ State: { name: "Alice", email: "alice@..." }
│  ├─ Consumers: 2 (ProfilePage, SettingsPage)
│  └─ Created: 2 minutes ago
└─ Instance 2: { userId: "user-456" }
   ├─ State: { name: "Bob", email: "bob@..." }
   ├─ Consumers: 1 (ProfilePage)
   └─ Created: 30 seconds ago
```

---

## Implementation Checklist

### Phase 0: Redux DevTools Integration (Week 1)

- [ ] Create ReduxDevToolsAdapter
- [ ] Test with playground app
- [ ] Document integration in README
- [ ] Publish `@blac/devtools-connect@0.2.0`

### Phase 1: Core Custom DevTools (Weeks 2-4)

- [ ] Fix connection stability (heartbeat + reconnect)
- [ ] Add bloc status & metrics display
- [ ] Implement state viewer with JSON tree
- [ ] Add diff viewer for state changes
- [ ] Build time-travel slider with controls
- [ ] Add filter & search functionality
- [ ] Virtual scrolling for event log
- [ ] Keyboard shortcuts

### Phase 2: React Integration (Weeks 5-6)

- [ ] Track component subscriptions in useBloc
- [ ] Component list panel with render counts
- [ ] Proxy dependency tracking visualization
- [ ] Optimization suggestions UI
- [ ] Auto-generate optimized selectors

### Phase 3: Performance & Polish (Weeks 7-8)

- [ ] Performance profiler (event durations, flame graphs)
- [ ] Security hardening (auto-redact sensitive fields)
- [ ] Theme refinement (match Chrome DevTools exactly)
- [ ] Documentation and examples
- [ ] Performance benchmarks
- [ ] Integration tests with Puppeteer

---

## Success Criteria

**Must Pass Before Launch:**

- [ ] Works with Redux DevTools (Phase 0 fallback)
- [ ] Custom DevTools connects reliably (no disconnects for 1 hour)
- [ ] State viewer handles 100KB+ objects without lag
- [ ] Time-travel works correctly (state reconstructs accurately)
- [ ] Filter & search respond in < 100ms
- [ ] Event log with 10,000 events renders smoothly (virtual scrolling)
- [ ] DevTools overhead < 10% CPU, < 100MB RAM
- [ ] Security: Sensitive fields auto-redacted
- [ ] React integration: Component re-renders tracked
- [ ] Documentation: 5-minute quick start guide

**Nice to Have:**

- [ ] Props-based Bloc instance visualization
- [ ] Lifecycle timeline view
- [ ] Optimization suggestions with auto-generated code
- [ ] Export/import debugging sessions
- [ ] Performance flame graphs

---

## Next Immediate Actions

1. **Today:** Implement Redux DevTools integration (2-3 hours)
2. **Tomorrow:** Fix connection stability with heartbeat (4 hours)
3. **Day 3:** Build state viewer with JSON tree (6 hours)
4. **Day 4:** Add time-travel slider (6 hours)
5. **Day 5:** Filter & search (4 hours)

**Estimated Timeline:**

- Phase 0: 1 week
- Phase 1: 3 weeks
- Phase 2: 2 weeks
- Phase 3: 2 weeks

**Total: 8 weeks to production-ready DevTools**

---

**Status:** Ready to start Phase 0 (Redux DevTools Integration)  
**Blocker:** None - All research complete, plan refined  
**Risk:** Low - Following proven patterns from Redux/React DevTools

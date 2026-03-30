# Plan: Devtools Initiator Feature

## Decision

**Approach**: Capture a stack trace at instance creation time (`initConfig`), store it on `StateContainer`, pipe it through existing plugin/devtools data flow, and render it as a new "Initiator" section in the StateViewer below Dependencies.
**Why**: Reuses the existing `captureStackTrace` method and the established metadata-to-plugin-to-UI pipeline. Zero new abstractions needed.
**Risk Level**: Low

## Implementation Steps

### 1. Capture initiator stack trace in blac-core

Modify `StateContainer.initConfig()` to capture a creation-time stack trace.

- **`packages/blac-core/src/core/StateContainer.ts:60`** -- Add new property:
  ```
  createdFrom: string = '';
  ```
- **`packages/blac-core/src/core/StateContainer.ts:85-93`** (`initConfig` method) -- After setting `instanceId`, capture the stack:
  ```
  this.createdFrom = this.captureStackTrace();
  ```
  The existing `captureStackTrace()` private method (line 241) already filters out internal blac frames, react-dom frames, and node_modules. It returns an empty string in production. No changes needed to the method itself.

### 2. Add `createdFrom` to PluginContext metadata

- **`packages/blac-core/src/plugin/BlacPlugin.ts:21`** (`InstanceMetadata` interface) -- Add:
  ```
  createdFrom?: string;
  ```
- **`packages/blac-core/src/plugin/PluginManager.ts:210-222`** (`getInstanceMetadata` in `createPluginContext`) -- Add to the returned object:
  ```
  createdFrom: instance.createdFrom || undefined,
  ```

### 3. Transport through devtools-connect

The `DevToolsBrowserPlugin.createInstanceData()` already spreads `...metadata` from `context.getInstanceMetadata(instance)`, so `createdFrom` will flow through automatically. No code change needed in `DevToolsBrowserPlugin.ts` -- but verify the field propagates.

- **`packages/devtools-connect/src/types/index.ts`** (`InstanceState` interface, line 40) -- Add `createdFrom?: string;` for type correctness (optional, since the spread handles it at runtime).

### 4. Transport through extension bridge

The inject script's `transformInstancesForPanel()` already passes through unknown fields via the spread pattern. But add it explicitly for clarity:

- **`apps/devtools-extension/src/panel/comm.ts`** (`PanelInstance` interface, line 26) -- Add:
  ```
  createdFrom?: string;
  ```
- **`apps/devtools-extension/src/inject/inject-script.ts:34-54`** (`transformInstancesForPanel`) -- Add `createdFrom: i.createdFrom` to the returned object.
- **`apps/devtools-extension/src/panel/index.tsx:194-204`** (`instance-created` handler in ATOMIC_UPDATE) -- Add `createdFrom: d.createdFrom` to the `addInstance` call.

### 5. Add to devtools-ui types and InstanceData

- **`packages/devtools-ui/src/types.ts`** (`InstanceData` interface, line 43) -- Add:
  ```
  createdFrom?: string;
  ```

### 6. Wire through in-app overlay data mapping

- **`packages/devtools-ui/src/DraggableOverlay.tsx:85-103`** (`toInstanceData` function) -- Add:
  ```
  createdFrom: inst.createdFrom,
  ```

### 7. Display in StateViewer UI

Add a new `InitiatorSection` component in `packages/devtools-ui/src/components/StateViewer.tsx`, placed between `DependenciesSection` and the end of the scrollable content (around line 655-661).

The section should:

- Only render when `createdFrom` is non-empty
- Show a collapsible section with header "Initiator" (reuse `SectionHeader`)
- Render the stack trace lines in a monospace pre-formatted block
- Style each line similarly to the existing `CallStackView` pattern: monospace, small font, muted colors
- Parse each line to highlight the function name vs file path

Rough structure:

```
InitiatorSection
  SectionHeader label="Initiator"
  <div> with monospace stack lines
    each line: function name in accent color, file:line in muted color
```

Insert between `DependenciesSection` and end of scrollable content in `StateViewer`:

```tsx
<InitiatorSection createdFrom={selectedInstance.createdFrom} />
<DependenciesSection ... />
```

Place it ABOVE dependencies since "where it was created" is more fundamental info than "what it depends on".

## Files to Change

- `packages/blac-core/src/core/StateContainer.ts:60,85-93` -- Add `createdFrom` prop, capture in `initConfig`
- `packages/blac-core/src/plugin/BlacPlugin.ts:21` -- Add to `InstanceMetadata`
- `packages/blac-core/src/plugin/PluginManager.ts:210-222` -- Include in `getInstanceMetadata`
- `packages/devtools-connect/src/types/index.ts:40` -- Add to `InstanceState`
- `packages/devtools-ui/src/types.ts:43` -- Add to `InstanceData`
- `packages/devtools-ui/src/DraggableOverlay.tsx:85-103` -- Add to `toInstanceData`
- `packages/devtools-ui/src/components/StateViewer.tsx` -- New `InitiatorSection` component + render
- `apps/devtools-extension/src/panel/comm.ts:26` -- Add to `PanelInstance`
- `apps/devtools-extension/src/inject/inject-script.ts:34-54` -- Add to transform
- `apps/devtools-extension/src/panel/index.tsx:194-204` -- Add to `instance-created` handler

## Acceptance Criteria

- [ ] Creating any cubit/bloc populates `createdFrom` with a filtered stack trace (dev mode only)
- [ ] `createdFrom` is empty string in production (`NODE_ENV=production`)
- [ ] Devtools instance detail view shows "Initiator" section with readable stack frames
- [ ] Section is hidden when `createdFrom` is empty/undefined
- [ ] Section is collapsible (consistent with Dependencies/Consumers pattern)
- [ ] Works in both in-app overlay and Chrome extension panel
- [ ] No performance regression (stack capture already exists, just called at a different lifecycle point)

## Risks & Mitigations

**Main Risk**: Stack trace quality varies by bundler -- source-mapped vs raw paths.
**Mitigation**: The existing `cleanFilePath` and `formatStackLine` methods handle Vite, webpack, and raw paths. The same filtering applies here. If a stack is unhelpful, the section simply shows short paths -- still better than nothing.

**Secondary Risk**: `captureStackTrace` is a private method being called from within the same class, so no access issue. But the creation stack may be deep (registry -> acquire -> useBloc). The existing frame filtering already strips internal blac-core frames, so the user should see their component or module as the top frame.

## Out of Scope

- Source map resolution (would require async work; not worth the complexity)
- Click-to-open-in-editor from devtools (future feature)
- Capturing initiator for `depend()` calls (separate concern)
- Filtering/searching by initiator in the instance list

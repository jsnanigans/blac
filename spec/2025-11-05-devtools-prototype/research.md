# BlaC DevTools Research Findings

## 1. Chrome Extension Architecture (Manifest V3)

### Core Architecture Components
- **Manifest V3 Requirements**: Modern Chrome extensions require manifest v3 (2024+)
- **3-Layer Communication Model**:
  1. **DevTools Panel**: UI layer, isolated from page
  2. **Service Worker** (background.js): Message broker and coordination
  3. **Content Script**: Bridge between extension and page
  4. **Injected Script**: Runs in MAIN world to access window objects

### Communication Patterns
```
Page (window.BLAC_INSTANCES)
  ↓ postMessage
Content Script (ISOLATED world)
  ↓ chrome.runtime.sendMessage
Service Worker
  ↓ chrome.runtime.connect (Port)
DevTools Panel
```

### Security Considerations
- Content scripts run in ISOLATED world by default (cannot access page's window)
- Must inject scripts into MAIN world to access BlaC state
- All data must be serialized (no direct object references)
- Validate and sanitize all messages from page context

## 2. Current BlaC Architecture Analysis

### Instance Management System
- **Local Instance Storage**: Each StateContainer subclass has its own `instances` Map
- **Instance Metadata Available**:
  - `instanceId`: Unique identifier (auto-generated or custom)
  - `name`: Class name or custom name
  - `state`: Current state value
  - `isDisposed`: Disposal status
  - Reference count (for shared instances)

### Existing APIs We Can Leverage
```typescript
// Get all instances of a type
StateContainer.getAll(): T[]

// Iterate over instances
StateContainer.forEach((instance) => { ... })

// Get statistics
StateContainer.getStats(): {
  registeredTypes: number;
  totalInstances: number;
  typeBreakdown: Record<string, number>;
}

// Check instance existence
StateContainer.hasInstance(key?: string): boolean

// Get reference count
StateContainer.getRefCount(key?: string): number
```

### Registry System
- **StateContainerRegistry**: Tracks all registered types
- **Lifecycle Events**: 'created' and 'disposed' events
- **Type Tracking**: Maintains Set of all StateContainer types

## 3. Existing DevTools Integration

### Current Redux DevTools Adapter
- Located in `packages/devtools-connect/`
- Provides time-travel debugging
- Serialization utilities already exist
- Event tracking and replay capabilities

### Reusable Components
- `safeSerialize()`: Handles circular references and errors
- `DevToolsBridge`: Message passing infrastructure
- `EventRegistry`: Event tracking system

## 4. Technical Challenges and Solutions

### Challenge 1: Accessing BlaC Instances from Extension
**Problem**: Extension runs in isolated context, cannot directly access StateContainer instances

**Solution**:
- Expose global API on window object (dev mode only)
- Use injected script to read and serialize state
- Pass data through message chain to devtools

### Challenge 2: Type Registry Access
**Problem**: Need to enumerate all StateContainer types to find all instances

**Solution**:
- Use `StateContainerRegistry.types` Set to get all registered types
- Iterate each type and call `Type.getAll()` to get instances
- Build complete instance map

### Challenge 3: Real-time Updates
**Problem**: Need to show state changes and lifecycle events in real-time

**Solution**:
- Hook into StateContainer lifecycle events ('created', 'disposed')
- Use MutationObserver or polling for state changes
- Establish persistent Port connection for continuous updates

### Challenge 4: State Serialization
**Problem**: States may contain circular references, functions, or non-serializable data

**Solution**:
- Use existing `safeSerialize()` from devtools-connect
- Show error placeholders for non-serializable values
- Implement depth limits for nested objects

## 5. Implementation Approach

### Phase 1: Core Library Preparation
1. **Add DevTools API to StateContainer**:
   ```typescript
   class StateContainer {
     static getDevToolsData() {
       // Returns all instance data for devtools
     }
   }
   ```

2. **Expose Global Access (Dev Mode)**:
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     window.__BLAC_DEVTOOLS__ = {
       getInstances: () => { ... },
       subscribe: (callback) => { ... }
     };
   }
   ```

### Phase 2: Extension Structure
```
blac-devtools-extension/
├── manifest.json          # Extension configuration
├── devtools/
│   ├── devtools.html     # DevTools page entry
│   ├── devtools.js       # Panel creation
│   └── panel/
│       ├── panel.html    # Panel UI
│       └── panel.js      # Panel logic
├── background/
│   └── service-worker.js # Message broker
├── content/
│   └── content-script.js # Page bridge
└── inject/
    └── inject.js         # MAIN world script
```

### Phase 3: Communication Protocol
```typescript
interface DevToolsMessage {
  type: 'INIT' | 'UPDATE' | 'DISPOSE';
  payload: {
    instances: InstanceData[];
    timestamp: number;
  };
}

interface InstanceData {
  id: string;
  className: string;
  instanceKey: string;
  state: any; // Serialized state
  refCount: number;
  createdAt: number;
}
```

## 6. Alternative Approaches Considered

### Approach 1: Standalone Web App
- **Pros**: Easier to develop, no extension limitations
- **Cons**: Requires manual integration, less convenient
- **Decision**: Rejected - Extension provides better DX

### Approach 2: Piggyback on Redux DevTools
- **Pros**: No new extension needed, familiar UI
- **Cons**: Limited to Redux patterns, no instance-specific features
- **Decision**: Rejected - Need BlaC-specific features

### Approach 3: React DevTools Integration
- **Pros**: Already installed by most React devs
- **Cons**: Complex integration, React-specific
- **Decision**: Rejected - Not all BlaC apps use React

## 7. Performance Considerations

### Memory Management
- Limit state history to prevent memory leaks
- Use WeakMap for instance tracking where possible
- Implement data pruning for large states

### Update Frequency
- Batch updates to prevent flooding
- Use requestIdleCallback for non-critical updates
- Implement throttling for rapid state changes

### Serialization Costs
- Cache serialized states when unchanged
- Use structural sharing for nested objects
- Implement lazy serialization for large states

## 8. Security Best Practices

### Content Security Policy
- Never use eval() or new Function()
- Sanitize all HTML content
- Use textContent instead of innerHTML

### Data Validation
- Validate all messages from content scripts
- Check message origin before processing
- Implement message schema validation

### Isolation
- Keep devtools code separate from page code
- Use structured cloning for data transfer
- Never expose sensitive data to extensions

## 9. Prior Art and Inspiration

### React DevTools
- Component tree visualization
- Props/state inspection
- Profiler integration

### Redux DevTools
- Time-travel debugging
- Action history
- State diffs

### Vue DevTools
- Component hierarchy
- Vuex state inspection
- Event tracking

### MobX DevTools
- Reaction tracking
- Dependency graphs
- Action logging

## 10. Key Decisions for MVP

1. **No State Manipulation**: Read-only for safety and simplicity
2. **Simple List View**: Avoid complex visualizations initially
3. **Development Only**: No production overhead concerns
4. **Chrome First**: Focus on Chrome, Firefox later
5. **Minimal Dependencies**: Keep extension lightweight

## Conclusion

The research indicates that building a Chrome extension for BlaC DevTools is technically feasible with the current architecture. The main challenges are around cross-context communication and state serialization, both of which have established solutions. The existing StateContainer APIs provide good foundations for instance enumeration and state access.
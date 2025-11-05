# BlaC DevTools MVP Specifications

## Overview
Create a browser extension devtools for BlaC state management library, focused on instance inspection and management. The MVP will provide developers with visibility into StateContainer instances, their states, and lifecycle information.

## Core Requirements

### Functional Requirements

#### 1. Instance Inspector (Primary Focus)
- **Display all active StateContainer instances** in the application
  - Show instance ID (uid)
  - Show class name (e.g., CounterCubit, UserBloc)
  - Show instance key (e.g., 'default', 'user-123')
  - Show creation timestamp
- **State Snapshot viewing**
  - Display current state value for each instance
  - Show state in a collapsible JSON tree view
  - Support for complex nested objects
  - Handle circular references gracefully
- **Read-only inspection**
  - No manipulation features in MVP
  - Pure observation and monitoring

#### 2. UI Delivery
- **Browser Extension Architecture**
  - Chrome extension (with potential Firefox compatibility)
  - Separate devtools panel (like React DevTools)
  - Communication via content script and background script
  - Extension manifest v3 compliant

#### 3. Data Collection
- **Basic Instance Information**
  - Instance metadata (ID, class name, key, timestamp)
  - Current state snapshot
  - State serialization with error handling
- **Simple List Display**
  - Show all instances in a scrollable list
  - No pagination or complex filtering in MVP
  - Basic visual hierarchy

### Non-Functional Requirements

#### Performance
- **Development-only operation**
  - Can have reasonable performance overhead
  - No production optimization needed
  - Focus on developer experience over performance

#### Integration
- **Standalone solution**
  - No dependency on Redux DevTools
  - No integration with React DevTools
  - Independent operation

#### Technical Constraints
- **Browser Compatibility**
  - Chrome 100+ (primary target)
  - Firefox support (nice-to-have, not required)
- **Framework**
  - TypeScript for type safety
  - Minimal dependencies for extension
  - Use existing BlaC serialization utilities where possible

## Success Criteria

1. **Visibility**: Developers can see all active StateContainer instances in their application
2. **State Inspection**: Current state of any instance is viewable in a readable format
3. **Zero Configuration**: Works immediately after extension installation without app changes
4. **Developer Experience**: Clear, intuitive UI that doesn't require documentation
5. **Reliability**: Stable operation without crashing the application or extension

## Out of Scope (MVP)

- State manipulation or editing
- Time-travel debugging
- Performance profiling
- Dependency tracking visualization
- Event/action history
- State diffs or change detection
- Production deployment
- Export/import functionality
- Memory leak detection (beyond showing instance count)
- Reference counting display

## Technical Architecture Overview

### Components
1. **Core Library Integration** (@blac/core)
   - DevTools API exposed on StateContainer
   - Instance registry hooks
   - State serialization

2. **Browser Extension**
   - **Content Script**: Injected into application pages
   - **Background Script**: Manages extension lifecycle
   - **DevTools Panel**: UI for instance inspection
   - **Popup** (optional): Quick status/stats

3. **Communication Layer**
   - Message passing between content script and devtools
   - Serialization of state data
   - Error boundary for malformed data

### Data Flow
1. BlaC instances register with global devtools API
2. Content script polls or listens for instance changes
3. Data serialized and sent to devtools panel
4. Panel renders instance list and state trees

## Constraints and Limitations

1. **Bundle Size**: Extension size not critical, but keep under 1MB
2. **Memory Usage**: Acceptable to use more memory in development
3. **Update Frequency**: Real-time updates preferred, polling acceptable
4. **State Size**: Handle states up to 10MB (with appropriate warnings)
5. **Instance Count**: Support up to 1000 instances (performance may degrade)

## User Journey

1. Developer installs BlaC DevTools extension from Chrome Web Store
2. Opens application with BlaC state management
3. Opens Chrome DevTools
4. Clicks on "BlaC" tab in devtools
5. Sees list of all active StateContainer instances
6. Clicks on an instance to expand state view
7. Inspects current state in JSON tree format
8. Monitors instance lifecycle (creation/disposal) in real-time

## Risk Mitigation

- **Risk**: State serialization errors
  - **Mitigation**: Graceful error handling with fallback display
- **Risk**: Large state objects causing UI freeze
  - **Mitigation**: Virtualization or truncation for large objects
- **Risk**: Extension conflicts with app
  - **Mitigation**: Isolated execution context, defensive coding
- **Risk**: Memory leaks in extension
  - **Mitigation**: Proper cleanup, bounded data retention
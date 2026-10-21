---
'@blac/devtools-connect': major
'@blac/devtools-ui': major
---

DevTools v3, rebuilt around a typed, versioned protocol.

- `@blac/devtools-connect`: `createDevToolsBrowserPlugin` is replaced by `createDevToolsAgent`. The agent records plain references and serializes and sends nothing until a client attaches. `window.__BLAC_DEVTOOLS__`, time-travel, getter enumeration, the event ring and the heartbeat/full-sync are removed. New entry points `@blac/devtools-connect/client` (`DevToolsClient`, `connectInPage`) and `@blac/devtools-connect/protocol`. Serialization now caps depth, breadth, string length and total size.
- `@blac/devtools-ui`: a single `<Panel client={client} />` plus the `<BlacDevtoolsUi />` overlay (Alt+D, Shadow DOM, connects only while open). The BlaC-based stores, `DevToolsPanel` and `DraggableOverlay` are removed, along with `@uiw/react-json-view` and `json-diff-kit`. `@blac/core` and `@blac/react` are no longer peer dependencies.

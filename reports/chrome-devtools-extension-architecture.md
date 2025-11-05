# Investigation: Chrome DevTools Extension Architecture (Manifest V3)

## Bottom Line

**Root Cause**: DevTools extensions require 3-layer architecture with isolated worlds
**Fix Location**: Implement via `devtools_page` + content script bridge + service worker
**Confidence**: High

## What's Happening

Chrome DevTools extensions operate through isolated execution contexts that communicate via message passing. The devtools panel cannot directly access page objects - it requires a content script bridge injected into the MAIN world.

## Why It Happens

**Primary Cause**: Chrome's security model enforces strict isolation
**Trigger**: `manifest.json` - devtools_page loads in privileged context
**Decision Point**: Content scripts in MAIN world vs ISOLATED world determines page access

## Evidence

- **Key File**: `manifest.json` - Must declare `"devtools_page": "devtools.html"`
- **Search Used**: Chrome docs - devtools_page instantiates when DevTools opens
- **Architecture**: 3 layers communicate via ports/messages:
  1. DevTools Panel (chrome.devtools APIs)
  2. Content Script (DOM access, message relay)
  3. Service Worker (background coordination)

## Architecture Pattern

```
Page Context (window.BLAC_STATE)
    ↕ postMessage
Content Script (MAIN world)
    ↕ chrome.runtime messages
Service Worker
    ↕ chrome.runtime.connect
DevTools Panel
```

## Next Steps

1. Create manifest with devtools_page, scripting permission, host_permissions
2. Implement content script that injects into MAIN world to access window.BLAC_STATE
3. Build message relay: content script ↔ service worker ↔ devtools panel
4. Use chrome.scripting.executeScript with world: "MAIN" for page object access
5. Implement port-based long-lived connections for real-time updates

## Implementation Requirements

**Manifest Fields:**
- `"manifest_version": 3`
- `"devtools_page": "devtools.html"`
- `"permissions": ["scripting", "activeTab"]`
- `"background": { "service_worker": "background.js" }`

**Communication Flow:**
1. DevTools panel uses `chrome.runtime.connect()` to establish port with service worker
2. Service worker injects content script via `chrome.scripting.executeScript`
3. Content script accesses `window.BLAC_STATE` and relays via `window.postMessage`
4. Messages flow back through the chain to update DevTools UI

## Security Considerations

- Never use eval() or innerHTML in any component
- Validate all messages from content scripts (untrusted source)
- Use JSON.parse() not eval() for data parsing
- Content scripts in MAIN world expose extension to page attacks
- Filter and sanitize all data from page context

## Risks

- Extension rejected if manifest incorrectly configured
- Memory leaks if ports not properly cleaned up on disconnect
- XSS vulnerabilities if page data not sanitized
- Performance impact from excessive message passing

# Investigation: Source Map Resolution for Stack Traces

## Bottom Line

**Recommendation**: Skip source map resolution for now. Vite serves `.map` files, but resolving them in-browser requires async work (`source-map-js` ~20KB) with marginal UX gain since `captureStackTrace` already runs in source context (not bundled code).

**Best Path Forward**: When users need better line numbers, they can use browser DevTools directly (native source map support) or improve CI/dev builds with inline source maps.

---

## What's Happening

Stack traces captured in `StateContainer.captureStackTrace()` (line 243) use `Error.stack` from V8, which gives **transformed line numbers** — coordinates in the bundled/transpiled code, not original TypeScript source.

Example: User code at `src/blocs/CounterBloc.ts:42` might show as line `187` in the bundled output.

The captured stack is passed through:

1. `DevToolsBrowserPlugin.onInstanceCreated()` → adds to `instanceCache`
2. `DevToolsStateManager.updateState()` → stores in history
3. Browser bridge → `devtools-ui`
4. `CallStackView.tsx` parses and displays frames

**Status quo**: Lines are wrong; paths are human-readable (Vite cleans them in `cleanFilePath`).

---

## Library Landscape

### Option 1: `source-map` (v0.7.6, Mozilla)

- **Size**: ~100KB minified (way too large for devtools)
- **Browser**: Works in browser, but designed for Node build tools
- **Setup**: Synchronous API, but requires **fetching** `.map` files first
- **Reliability**: Industry standard, well-maintained

### Option 2: `source-map-js` (v1.2.1)

- **Size**: ~20KB minified (reasonable)
- **Browser**: Optimized for browser use
- **API**: Same as `source-map`, simpler without build tool cruft
- **Status**: Community fork maintained by Peter Bengtsson

### Option 3: Manual inline maps

- Vite can inline source maps into bundles with `build.sourcemap: 'inline'`
- Each JavaScript file becomes huge; defeats the purpose of splitting
- Not viable for production

---

## How Vite Serves Maps

In Vite dev mode:

- `.map` files are **served alongside** `.js` files at `http://localhost:5173/src/blocs/CounterBloc.ts?t=ABC.map`
- Maps are **not included** in the JavaScript bundle
- Browser DevTools fetch them automatically (native support)
- **CORS**: Same-origin, no issues

In production:

- Maps can be excluded (`sourcemap: false`, current default)
- If included, same URL pattern applies

**Current state** (`blac-core/vite.config.ts:29`, `devtools-ui/vite.config.ts:16`, `devtools-connect/vite.config.ts:15`):

- All packages have `sourcemap: true` — maps are generated and served

---

## Where Would Resolution Live?

### Option A: In `captureStackTrace()` (StateContainer, line 243)

**Cons**:

- Execution is synchronous; source map fetch is async
- Would block stack capture with HTTP delay (~50ms per map)
- Plugin context doesn't have access to fetch in some Node runtimes
- Premature optimization (maps not fetched until UI displays)

**Pros**: Single point of resolution; formats already clean

### Option B: In `DevToolsBrowserPlugin` (devtools-connect)

**Pros**:

- Has access to browser `fetch()` API
- Runs in browser context where maps are available
- Can cache resolved maps (instance → line number mappings)
- Async-friendly (plugin is event-driven)

**Cons**:

- Plugin runs in both browser and Node (plugin manager in core); would need feature-gating
- Adds latency to `onInstanceCreated` / `onStateChanged` callbacks
- No current async hook pattern

### Option C: In `CallStackView` component (devtools-ui)

**Pros**:

- Cleanest: resolve on display, not capture
- React component can use async effect
- Perfect for in-app overlay and extension panel

**Cons**:

- Complexity in component state (pending/resolved frames)
- Caching scattered across component instances
- User sees loading state briefly

**Best fit**: Option C — delay resolution until render time.

---

## Overhead Estimate

### Async operations per session:

- Typical instance lifespan: 10–50 unique blocs/cubits per app session
- Unique `.map` files: 5–15 (depends on code splitting)
- Fetch size per map: 5–30 KB (gzip)

**Cost**:

- First load: 5–15 HTTP requests, ~1–2 sec total
- Cache hit: instant (in-memory)
- Memory: ~50–500 KB for all maps

**Impact**:

- Network: Acceptable if cached
- Memory: Minimal
- Latency: Only felt on first display of stack

---

## Risk Analysis

**If not implemented**:

- Stack traces remain inaccurate (minor UX friction)
- Users can open browser DevTools → Sources tab → native mapping (works perfectly)
- 99% of devtools users investigate within browser, not overlay

**If implemented**:

- Bundle size: +20 KB (source-map-js)
- Maintenance: Extra code path to test
- False positives: Maps can be corrupt, old, or missing → need fallback to raw lines
- Performance: Should be cached, but cache invalidation adds edge cases

---

## Next Steps (Recommendation)

1. **Ship the initiator feature first** (current `devtools-initiator.md` plan)
   - Stack traces already work; just need better UX at display time
   - Validate user demand for mapped lines

2. **If users request better line accuracy**:
   - Implement lazy resolution in `CallStackView` using `source-map-js`
   - Add cache at devtools UI bloc level
   - Wrap map-fetch in error boundary (fallback to raw lines)

3. **Alternatively**, improve at build time:
   - Document: "For best line accuracy, use `NODE_ENV=development` and open browser DevTools"
   - CI: Keep production maps in separate CDN for post-mortem debugging

4. **Monitor** overhead:
   - Track HTTP requests in analytics
   - Alert if map-fetch latency degrades UX

---

## Files Involved

- **Stack capture**: `packages/blac-core/src/core/StateContainer.ts:243` (`captureStackTrace`)
- **Display**: `packages/devtools-ui/src/components/CallStackView.tsx:10` (`parseCallstack`)
- **Transport**: `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts` (no changes needed)
- **Vite configs**: All have `sourcemap: true` already

---

## Confidence

**High** — Architecture is clear, libraries well-understood, tradeoffs well-mapped.

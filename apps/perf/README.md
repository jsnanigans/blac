# State management benchmarks

Browser benchmarks comparing Blac with Zustand, Redux Toolkit and React Context.

```bash
pnpm --filter perf bench   # production build + preview, http://localhost:3001/
pnpm --filter perf dev     # dev server, for working on the app only
```

Use `bench` for numbers. The dev build runs React's and Blac's dev-only
checks, which slows each library by a different amount; the dashboard shows a
warning when it is running one. Run in Chrome, with no other heavy tabs. For a
GC between samples, start Chrome with `--js-flags=--expose-gc`.

`/demo` runs the list operations by hand on any implementation. `/debug` holds
one-off instrumentation and is not a benchmark.

## Suites

**List** — js-framework-benchmark operations on a 1,000-row table: create,
replace, update every 10th row, update 1 row, select, swap, remove, create
10,000, append 1,000, clear. Each library runs twice:

- **sub rows**: each row reads its item (`data[i]`) and the selection from the
  store itself.
- **prop rows**: the parent reads everything and passes primitives to memoised
  rows.

Compare within an architecture, never across. Every implementation renders the
same markup (`shared/list.tsx`) and does the same list transforms.

**Re-render** — consumers reading different slices of a store, one update per
sample. Reports renders per update against the optimum, and time.

**Pure state** — store operations without React. Each op builds its own stores
and data in an untimed `setup`, so only the op body is timed.

## How timing works

- **List and re-render:** each benchmark mounts in its own React root, so
  dashboard updates never re-render it. A sample runs as follows:
  1. Apply the op's setup.
  2. Let the page paint.
  3. Time from the trigger until every microtask has run. Store notifications,
     React's sync render, commit and passive effects all happen within that
     window.
- **Style, layout and paint are excluded.** They depend only on the resulting
  DOM, which is the same for every library, and waiting for a frame adds up to
  16ms of vsync phase to each sample.
- **"React render"** is the summed Profiler `actualDuration` for those commits.
  The production build aliases `react-dom/client` to `react-dom/profiling` so
  the Profiler keeps working.
- **React DevTools is disabled.** The extension measures every committed host
  node, which forces a layout per commit. `index.html` opts out of it; add
  `?devtools` to the URL to keep it.
- **Late commits are flagged.** If React commits after a timed window closes,
  the console warns `[perf] … committed after the timed window`.
- **Blac flushes on a manual schedule in pure-state ops.** Its containers use a
  `ManualScheduler`, and an op that needs notifications delivered calls
  `pump()`. That is the same flush the default microtask scheduler runs, but
  synchronous, so the timed loop holds no `await`. Zustand and Redux notify
  synchronously on every update.
- **Coalescing is measured on purpose.** In `batch rapid updates` and
  `same-tick burst`, Blac delivers one notification for 1,000 same-tick
  updates, while the others deliver 1,000. Every other notification op flushes
  after each update.

## Reading the numbers

- **The timer resolves to 5µs.** COOP/COEP headers make the page
  cross-origin isolated; without them the clamp is 100µs, and the report header
  says which applied. A pure-state op that finishes within 50µs is repeated
  until a sample spans about 1ms (at most 1,000 calls), and the report shows
  the count, e.g. `×200`. So every op must cost the same when run again on its
  handle.
- **Each cell is the median after outlier removal, ± its coefficient of
  variation.** Ratios compare against the best cell in the row. The report ends
  with every row where Blac is more than 1.25× the best.
- **Most pure-state op bodies loop 1,000 times,** so per-update cost is roughly
  the median divided by 1,000. `1 of 1,000 row subscribers` makes 100 updates
  against 1,000 subscribers.
- **Retained memory is Chrome-only.** It uses
  `performance.measureUserAgentSpecificMemory()` over 10k minimal instances,
  median of 5 readings.
- **Registry-lifecycle ops are Blac-only.** The other libraries have no
  acquire, release or refcounting, so these are reported without ratios.

## Pure-state op history

The suite keeps one op per aspect. Before adding one, check it is not already
covered; before re-adding a removed one, read why it went:

| Removed                                            | Why                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `create 10k`                                       | Same path as `create 1k`, just bigger                               |
| `getter track multiple`                            | Identical to `getter track simple`: a second plain accessor is free |
| `getter/proxy change detection miss`               | At the 5µs timer floor                                              |
| `proxy change detection hit`                       | Same emit loop as `getter track simple`                             |
| `proxy track deep nested (5 levels)`               | Floor-level plain property access                                   |
| `acquire shared instance`                          | `acquire/release cycle` covers the registry path                    |
| `selector notification skip`                       | `redundant patch` covers no-op filtering                            |
| `cross-store propagation`                          | `multi-store coordination` is the superset                          |
| `proxy cache reuse`                                | Byte-identical to `read 20 fields (baseline)`                       |
| `derived state computation`, `proxy track 1 field` | Same patch-then-read loop as `getter track simple`                  |

## Adding a library

1. Add the implementations:
   - `src/libraries/<name>/list.tsx`: sub-row and prop-row components that call
     `onReady(api: ListAPI)`.
   - `rerender.ts`: a `RerenderLibrary` that returns hooks per consumer shape.
   - `pure-state.ts`: a `PureStateLibrary` with the ops in `shared/pure.ts`.
2. Register them in `src/libraries/registry.ts`.
3. Make each op do the same work as the other libraries' versions, written in
   that library's idiomatic style. If no equivalent exists, leave the op out.

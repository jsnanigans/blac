# When to use dirtytalk

## The fit signature

Reach for it when **all** of these hold:

1. **One shared mutable source**, many observers.
2. Observers have **partial, *differing* interest** — each reads a different
   slice, not the whole thing.
3. You want to **notify the minimal set** of observers per change.
4. Mutations are frequent enough (or observers numerous enough) that the
   "did my slice change?" check is a real cost.

The payoff scales with consumer count. The README is explicit: with few
consumers the absolute cost is similar to per-consumer diffing; the win is
*proportional to N* when many consumers share one container.

## When it's overkill

The code itself tells you when there's no benefit:

- **≤1 consumer.** `emit` short-circuits to `ALL_PATHS` and skips diffing
  entirely (`container.ts:129`). Nothing to optimize.
- **Everyone reads everything.** No selective interest to exploit — a plain
  subscribe/notify loop is simpler.
- **Plain React Context + `useMemo` already works** at your scale. Don't add a
  reactive engine to dodge a re-render you could solve with memoization.

## Real-world shapes

| Shape | `Region` | Notes |
| ----- | -------- | ----- |
| Selective-rerender state store (this repo: **blac**) | `PathSet` | Like Zustand-with-selectors / valtio, but path tracking is *automatic* from render reads — no selector to declare. |
| Canvas / WebGPU / TUI renderer (**insomni**) | damage rects | Repaint only damaged regions, coalesced to one RAF flush. |
| Form library | field-dirtiness set | Re-validate / re-render only touched fields. |
| Spreadsheet / dependency recalc | cell-range region | A write marks a cell; only dependents whose interest range intersects recompute. |
| Live dashboard / collab editing | document region | A remote edit marks a region; only widgets viewing it refresh. |
| Game ECS / sim | component-mask bitmask | Systems declare interest as a component bitmask; only matching systems run. |

In every case the unifying pattern is: **one source, many observers with
partial differing interest, minimal notify.**

## Decision shortcut

- One observer, or all-want-everything → use a plain callback / `Signal`.
- Many observers, distinct slices, objects/arrays → `@dirtytalk/structural`.
- Many observers, distinct slices, *non-object* region (rects, masks, ranges)
  → `@dirtytalk/engine` + your own `Space`.

# blac feedback — issue reports for the blac team

Eight issue reports written from real-world usage of `@blac/core@2.0.18` /
`@blac/react@2.0.18` across two production React apps in a single monorepo
(a patient-facing mobile/web app and an internal admin tool — roughly 400+
Cubits combined). Most were found while investigating one specific refactor
(removing a "pass a Cubit instance as a plain param" antipattern in favor of
`this.depend(...)`), which surfaced a broader pattern: an in-repo compat
shim (`blac-compat`) exists to bridge unmigrated v0/v1-era code onto v2, and
several v2 primitives — while solid on their own — have rough edges around
discoverability, naming, and lifecycle integration.

Each report below is self-contained and reframes any near-closed gap against
what v2 already ships: problem statement, evidence (quoting the actual
shipped `dist`/`.d.ts`/README source, not guesses), a minimal example, and a
concrete proposed API. None require access to the private codebase they were
found in — all examples are reconstructed with generic class names.

| # | Title | Impact |
|---|-------|--------|
| 1 | [Ship a typed cross-cutting event bus](./01-fold-compat-fixes-upstream.md) | Medium — the compat shim's other three "gaps" are already shipped or a v1-era non-issue; the one real gap is a typed event bus |
| 2 | [`depend()` has no reactive `.onChange` with owner-scoped auto-cleanup](./02-non-render-change-subscription-api.md) | Medium — `watch()`/`onSystemEvent()` already ship; they're just not wired through the dependency handle or auto-disposed |
| 3 | [Surface the shipped testing utilities](./03-registry-test-utilities.md) | Low-medium — `@blac/core/testing`/`@blac/react/testing` already ship the reset/mock story; it's undiscoverable, not missing |
| 4 | [`depend()` ergonomics + missing cycle detection](./04-depend-ergonomics-cycle-detection.md) | Medium-high — boilerplate for the common case, and a silent stack-overflow failure mode |
| 5 | [Keyed-instance identity is undocumented and fragile](./05-keyed-instance-identity.md) | Medium — the README documents an `instanceKey` param that was never shipped; without it, identity is an accident of args-shape hashing |
| 6 | [No composite/predicate-based disposal](./06-composite-predicate-disposal.md) | Medium — forces `keepAlive` overuse and bespoke disposal machinery for scoped/composite-keyed instances |
| 7 | [`Deps` lane vs `depend()` — overlapping naming, no guidance](./07-deps-lane-vs-depend-guidance.md) | Medium — two unrelated mechanisms share the word "dep(s)" with no contrasting docs |
| 8 | [Render-tracking ergonomics](./08-render-tracking-ergonomics.md) | Medium-high — default `useBloc` value is unstable-by-reference (dep-array trap); its fix (`select`) has its own re-key footgun |

## Versions referenced

- `@blac/core@2.0.18`
- `@blac/react@2.0.18`

All file:line references in these reports point at the shipped `dist/*.js` +
`.d.ts` files inside those packages (no local/forked source was involved —
these are the exact published artifacts).

# Migration: `instanceId` → `args`-only instance identity

Remove the `instanceId` option and every public **explicit string-key** argument across
the blac APIs. Instance identity is derived **entirely from `args`** via a class's
`static key(args)` (or a structural hash of `args`, or the default sentinel when there are
no args).

The registry still keys its internal `Map` by a string — we are **not** removing that. We
are removing the public ability to *supply* an arbitrary key. The internal resolved-key
tier stays as an `@internal` mechanism used by `useBloc`, `compat`, `watch`, and `depend`.

---

## Locked decisions (from planning Q&A)

| Topic | Decision |
| --- | --- |
| Per-mount private instances | **Synthetic args.** `useBloc(Bloc, { args: { _id: useId() } })`. No new `isolate` API. |
| Scope of removal | **Maximal.** Public functional API + `watch` go args-only. String key becomes internal-only. |
| `BlocProvider` | **Convert to args-based scoping:** `<BlocProvider bloc={X} args={…}>`. |
| `blac-compat` | **Freeze public v1 `id`**, rework internals to map `id` → key via the internal tier. |

**Reconciliation note:** "maximal scope" and "freeze compat" are reconciled as: the
*public* surface (incl. `watch`) is args-only; the *registry class methods* retain a
`string` key parameter as the **internal tier**; `compat`'s public `id` stays and is
implemented on top of that internal tier.

---

## Target API (what every downstream task migrates to)

```ts
// React ---------------------------------------------------------------------
useBloc(Bloc, { args?, select?, onMount?, onUnmount? })   // instanceId REMOVED
useBloc(Bloc, { args: { _id: useId() } })                 // per-mount private instance

<BlocProvider bloc={Bloc} args={{ … }}>…</BlocProvider>   // descendant useBloc(Bloc) inherits args

// Registry (public functional API — args-only) ------------------------------
acquire(Bloc, { args?, refId? })
borrow(Bloc, { args? })            // BorrowTarget = { args? }  (string form REMOVED)
borrowSafe(Bloc, { args? })
ensure(Bloc, { args? })
release(Bloc, { args?, refId?, forceDispose? })
hasInstance(Bloc, { args? })
getRefCount(Bloc, { args? })
getRefIds(Bloc, { args? })
resolveInstanceKey(Bloc, args?): string     // explicit-key param DROPPED

// Cross-bloc & observation --------------------------------------------------
this.depend(Type, args?)                     // protected; derives key from args
watch(Bloc, cb, { args? })                   // instance(Bloc, id) → instance(Bloc, args?)

// Internal tier (KEEP string key; @internal) --------------------------------
getRegistry().acquire(Type, resolvedKey, { refId, args })
getRegistry().release(Type, resolvedKey, …)
getRegistry().resolveKey(Type, /* no explicit key */ undefined, args)
// …borrow/borrowSafe/ensure/hasInstance/getRefCount/getRefIds keep string key internally
```

### Key resolution after the change (`StateContainerRegistry.resolveKey`)
```
static key(args)  →  structuralKey(args)  →  DEFAULT_STRUCTURAL_KEY ('default')
```
The leading `if (instanceKey !== undefined) return instanceKey;` branch stays for the
**internal** callers only; no public function passes a non-undefined `instanceKey`.

### KEEP (do not remove)
- `StateContainer.instanceId` **instance property** (`${ClassName}:${resolvedKey}`) — read by
  PluginManager, DevTools, `watch`.
- `StateContainerConfig.instanceId` internal config field (carries the resolved key into the instance).
- `resolveInstanceKey` (public) — now `(Bloc, args?) => string`; the canonical way to compute a key.

### REMOVE (dead code, surfaced during audit)
- `BLAC_STATIC_PROPS.ISOLATED`, `isIsolatedClass()` and their stale JSDoc (never wired in).
- Stale `autoInstance` / `static isolated` mentions in comments/docs.

---

## Phase / dependency graph

```
Phase 0  Prep & working-tree hygiene  (serial, orchestrator/human)
   │
Phase 1  blac-core API + internal tier + dead-code removal + core tests   ← BLOCKS ALL
   │
   ├─ Phase 2  blac-react (useBloc, BlocProvider, react tests, react test-utils)
   ├─ Phase 3  blac-compat (freeze v1 id, rewire to internal tier, compat tests)   ∥ Phase 2
   │
   ├─ Phase 4  Apps & consumers (depends on 1 + 2)
   │     4a examples (parallel by folder)   4b apps/perf   4c devtools-ui/extension
   │
   └─ Phase 5  Docs rewrite (depends on 1 + 2 API lock; runs ∥ Phase 4, disjoint files)
   │
Phase 6  Full verify + cleanup + changeset  (serial, last)
```

**Parallel groups** (file-disjoint, safe to run together):
- After Phase 1: **Phase 2 ∥ Phase 3**.
- Phase 4a example folders: **counter ∥ form ∥ registry ∥ db-persist ∥ input-pattern ∥ messenger**.
- Phase 4b ∥ 4c ∥ (4a tasks).
- Phase 5 doc groups: **primary-react-docs ∥ primary-guide-docs ∥ secondary-docs**.

---

## How to run a task with an agent

Each task file (`phase-N-*.md`) contains one or more **self-contained briefs**. Hand a brief
verbatim to a subagent. Every brief is a full **check → implement → verify → test → commit**
cycle. **No git worktrees** — agents edit the shared tree on the migration branch.

Launch parallel tasks **in one message** (multiple agent calls). Parallel tasks are
file-disjoint; each agent must `git add -- <only its listed paths>` so concurrent commits
don't capture each other's work. (Git's index lock is brief; disjoint staging makes
interleaved commits safe.)

### Model / effort legend
| Model | When |
| --- | --- |
| **Opus** | Foundational, type-heavy, high-risk design. (Phase 1.) |
| **Sonnet** | Most implementation, multi-file refactors, docs prose. |
| **Haiku** | Mechanical, low-ambiguity call-site swaps. (perf, devtools, simple example folders.) |

Effort = reasoning effort knob: **low / medium / high**. Each brief states `Model:` and `Effort:`.

---

## Conventions every agent MUST follow

- **Branch:** all work on `feat/instanceid-to-args` (created in Phase 0). Never commit on `main`/`v1`.
- **Commit format:** `[<ticket>] <type>(<scope>): <subject>` — infer `<ticket>` from the branch
  if present; the migration branch has none, so **omit the `[ticket]` bracket** and use a plain
  conventional commit, e.g. `refactor(core): derive instance key from args only`.
  Subject ≤ 50 chars, imperative. No `Co-Authored-By`. Body wrapped at 72 only if non-obvious.
- **No git side-effects** beyond `git add` + `git commit`. No push/pull/merge/rebase/**stash**.
- **No `--no-verify`.** Never skip hooks.
- **Pre-commit verify (run, in order, scoped to the task's package):**
  1. `pnpm --filter <pkg> typecheck`
  2. `pnpm --filter <pkg> lint`  (oxlint)
  3. `pnpm --filter <pkg> test` (vitest; test files import from `vite-plus/test`)
  4. `vp run format:check` (or `pnpm --filter <pkg> format:check`) — oxfmt; run **before** commit.
- **Targeted validation only:** run the *task's package* tests, not the whole repo. Phase 6 runs the full sweep.
- One commit per task (or per cohesive sub-step). Leave the tree green.

---

## Out of scope / tracked separately
- **Messenger "delivered" bug**: this migration does *not* fix it (keys already matched —
  see investigation). The temporary `[WS DIAG]` logs in
  `apps/examples/src/messenger/services/WebSocketMock.ts` are **removed in Phase 4a (messenger)**.
- **In-flight devtools fixes** (devtools-ui components, panel, comm, plugin gate/flushHandle,
  the devtools `vite`/`tsconfig` aliases): unrelated session work — land them on a **separate
  branch/commit before** creating the migration branch (Phase 0). Do **not** fold them into this migration.
- The `borrow.ts` `BorrowTarget`/args support already added this session **is** part of this
  migration — keep it, Phase 1 finalizes it (drops the `string` and `instanceId` branches).

See `todo.md` for the live checklist.

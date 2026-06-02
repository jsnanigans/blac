# Phase 4 — Apps & consumers (after Phases 1 + 2)

All tasks here are **file-disjoint and parallel-safe**. Each migrates a folder to the args model.
**Shared rule for the no-`static key` blocs:** to key by data you must give the bloc an `Args`
type + `static key`, then pass `{ args }` at every call site. For purely "named singleton" cases
(one fixed instance) prefer a `static key` returning a constant, or just `{ args: { id: '<name>' } }`.

Run after Phase 2 lands. Launch the `4a.*` / `4b` / `4c` briefs together (one message).

---

## Task 4a.1 — examples/01-counter **(Haiku / low)** ∥

- Files: `CounterView.tsx:11`, `CounterStats.tsx:10`, `CounterBloc.ts`.
- `CounterBloc` has no `static key`; instances are `"counter-1"/"counter-2"`/default.
- Implement: add `type CounterArgs = { id?: string }` + `static key = (a) => a?.id ?? 'default'`
  to `CounterBloc`; change call sites `{ instanceId: instanceKey }` → `{ args: { id: instanceKey } }`
  (when `instanceKey` undefined, omit args or pass `{}` → default).
- Verify (scoped): `pnpm --filter @blac/examples typecheck && pnpm --filter @blac/examples lint`
  (+ `test` if this folder has tests) `&& format:check`.
- Commit: `refactor(examples): migrate counter to args identity`.

## Task 4a.2 — examples/04-form **(Haiku / low)** ∥

- Files: `FormFields.tsx:6`, `FormProgress.tsx:7`, `FormSummary.tsx:7`, `FormDemo.tsx:40-41`, `FormCubit.ts`.
- `FormCubit` keyed by `"form-a"/"form-b"`. Add `FormArgs = { id: string }` + `static key = (a)=>a.id`.
- Swap `{ instanceId }` → `{ args: { id } }` (keep `select` where present).
- Verify scoped + commit: `refactor(examples): migrate form to args identity`.

## Task 4a.3 — examples/07-registry **(Haiku / low)** ∥

- Files: `RegistryDemo.tsx:38,81,266,278`, `SharedCounterCubit.ts`.
- Keys `"alpha"/"beta"/String(id)`. Add `static key` + args; swap call sites.
- Verify scoped + commit: `refactor(examples): migrate registry demo to args identity`.

## Task 4a.4 — examples/06-db-persist **(Haiku / medium)** ∥

- Files: `DbPersistDemo.tsx:15,18`, `PersistedDraftCubit.ts`.
- `DRAFT_INSTANCE_ID='demo-draft'` used in both `useBloc({ instanceId })` AND `ensure(Bloc, id)`.
- Add `static key` returning the constant (or `Args={id}`); migrate `useBloc` → `{ args }` and
  `ensure(Bloc, id)` → `ensure(Bloc, { args })`. Check the persistence key still resolves (the
  persist plugin may derive its storage key from `instanceId` property — verify it's unchanged).
- Verify scoped + commit: `refactor(examples): migrate db-persist to args identity`.

## Task 4a.5 — examples/10-input-pattern (per-mount) **(Sonnet / medium)** ∥

- Files: `CanvasView.tsx:22`, `MultiSourceCanvas.tsx:22,63`, `CanvasCubit.ts`, `UserCard.tsx` (already args — verify).
- **CanvasView per-mount**: `const instanceId = useId()` → `const _id = useId();` then
  `useBloc(CanvasCubit, { args: { _id } })` (synthetic-args convention). `CanvasCubit` should accept
  `Args = { _id?: string }` and **ignore** it in init; add `static key = (a) => a?._id ?? 'default'`.
  Preserve any owner-id usage that previously reused `instanceId` (re-derive from `_id`).
- `MultiSourceCanvas` `MULTI_INSTANCE_ID` → `{ args: { _id: MULTI_INSTANCE_ID } }`.
- Verify scoped + commit: `refactor(examples): migrate input-pattern to args; per-mount via synthetic args`.

## Task 4a.6 — examples/messenger **(Sonnet / medium)** ∥

- Files: `blocs/UserCubit.ts`, `components/Sidebar.tsx:24`, `components/UserAvatar.tsx:24`,
  `components/MessageItem.tsx:20`, `blocs/ChannelBloc.ts:31,37`,
  `services/WebSocketMock.ts:149,168,224,282,314` (+ remove the `[WS DIAG]` block added this session).
- **UserCubit**: add `type UserArgs = { userId: string }` + `static key = (a) => a.userId`; make it
  `Cubit<UserState, UserArgs>`. Then migrate:
  - `useBloc(UserCubit, { instanceId: userId, onMount })` → `useBloc(UserCubit, { args: { userId }, onMount })`
    (the `onMount: bloc.setUserId(userId)` can likely be dropped if init derives from args — verify).
  - `acquire(UserCubit, userId)` → `acquire(UserCubit, { args: { userId } })`.
  - `borrowSafe(UserCubit, userId)` → `borrowSafe(UserCubit, { args: { userId } })`.
- **ChannelBloc** already has `static key`; migrate `borrowSafe`/`acquire` call sites to `{ args }`.
- **WebSocketMock**:
  - `borrowSafe(ChannelBloc, channelId)` (×3) → `borrowSafe(ChannelBloc, { args: { channelId } })`.
  - Line 282 `borrowSafe(ChannelBloc, channel.instanceId)` → derive channelId from state:
    `borrowSafe(ChannelBloc, { args: { channelId: channel.state.channel!.id } })`.
  - `borrowSafe(UserCubit, userId)` → `{ args: { userId } }`.
  - **Remove the temporary `[WS DIAG]` `console.warn` block + the `getAll` import if now unused.**
- Verify scoped + commit: `refactor(examples): migrate messenger to args identity; drop WS diag`.

---

## Task 4b.1 — apps/perf benchmarks **(Haiku / low)** ∥

- Files: `apps/perf/src/libraries/blac/pure-state.ts:424,425,432,433`,
  `FrameworkBenchmark.tsx`, `JSFrameworkBenchmark.tsx` (the `borrow(DemoBloc)` no-key calls are fine).
- `acquire(CounterBloc, key,…)` / `release(CounterBloc, \`bench-${i}\`,…)`use programmatic string
keys. Give the benchmark`CounterBloc`a`static key = (a)=>a.id`+`Args={id}`and pass`{ args }`(and`{ args, refId }`for acquire /`{ args, refId }` for release). Keep benchmark semantics.
- Verify scoped (`pnpm --filter <perf-pkg> typecheck`) + commit: `refactor(perf): args identity in blac benchmark`.

## Task 4c.1 — devtools-ui + devtools-extension **(Haiku / low)** ∥

- Files: `packages/devtools-ui/src/DraggableOverlay.tsx:135,136,267,268`,
  `apps/devtools-extension/src/panel/index.tsx:20,21`.
- These call `acquire(Bloc, undefined, refId)` / `release(Bloc, undefined, false, refId)` (default
  instance). Migrate to the args-options form: `acquire(Bloc, { refId })` / `release(Bloc, { refId })`.
- **Coordination note:** the devtools session work lives on `fix/devtools-realtime-sync` (Phase 0).
  Apply this small migration on `feat/instanceid-to-args`; if it conflicts with that branch later,
  resolve at integration. Touch ONLY the `acquire/release` calls here.
- Verify scoped + commit: `refactor(devtools): args-form acquire/release`.

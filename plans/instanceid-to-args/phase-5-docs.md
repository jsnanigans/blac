# Phase 5 — Docs rewrite (after Phase 1+2 API lock · ∥ Phase 4)

Docs live in `apps/docs/**` — **disjoint from all code**, so these run concurrently with Phase 4.
They only need the **final API shape** (Phases 1 + 2 landed). Three parallel groups, file-disjoint.

**Shared doc rules**
- Every code sample uses the new API (`{ args }`, args-based `BlocProvider`, per-mount via
  `{ args: { _id: useId() } }`). No `instanceId`, no explicit string keys, no `isolated`/`autoInstance`.
- Twoslash blocks must typecheck against the new types (the docs build is the typecheck — see Phase 6).
- Keep a short "Migrating from `instanceId`" callout where it helps (esp. `migration-from-v1.md`),
  but everywhere else present args as the one model.
- Verify per task: `pnpm --filter @blac/docs build` (twoslash typecheck) **scoped to changed pages
  if possible**; at minimum ensure the changed pages compile. Then `format:check`. Commit.

---

## Task 5.1 — Primary React docs  **(Sonnet / medium)** ∥
- `apps/docs/react/use-bloc.md` — remove the `### instanceId` section + the Options `instanceId`
  row; rewrite "Identity and keying" around `args` + `static key`; rewrite the "State leaks between
  mounts" troubleshooting to the synthetic-args per-mount pattern; fix the migration table.
- `apps/docs/react/getting-started.md` — rewrite "Instance modes at a glance" (args / args+static key
  / per-mount synthetic args / default).
- Commit: `docs(react): document args-only identity (drop instanceId)`.

## Task 5.2 — Primary guide docs  **(Sonnet / medium)** ∥
- `apps/docs/guide/inputs.md` — "Per-component private instances" → synthetic args; rewrite the
  identity precedence table/decision matrix to the args model.
- `apps/docs/guide/best-practices.md` — replace "args vs deps vs instanceId" rule with "args vs deps";
  fix the "reaching for instanceId" anti-pattern; per-component section → synthetic args.
- `apps/docs/guide/patterns.md` — "Named instances" + "Per-component private instances" → args.
- `apps/docs/guide/troubleshooting.md` — instance-identity section, cheat-sheet table, remove the
  `autoInstance` box, SSR note.
- `apps/docs/core/instance-management.md` — "Named instances" + "Args-derived identity" become the
  single model; drop the explicit-key precedence note.
- Commit: `docs(guide): rewrite identity guidance for args model`.

## Task 5.3 — Secondary docs  **(Sonnet / medium)** ∥
- `apps/docs/guide/glossary.md` (instanceId/autoInstance/BlocProvider entries),
  `apps/docs/guide/concepts.md`, `apps/docs/guide/mental-model.md`,
  `apps/docs/guide/migration-from-v1.md` (keep a v1→args note; the `id → instanceId` section becomes
  `id → args`), `apps/docs/testing/react.md` (named instances / `instanceKey`→`args`),
  `apps/docs/testing/core.md` (`withBlocState`/`registerOverride` signatures → args),
  `apps/docs/core/cubit.md`, `apps/docs/core/watch.md` (`instance(Bloc, args)`),
  `apps/docs/core/bloc-communication.md` (`depend(Type, args)`),
  `apps/docs/plugins/persistence.md` (dynamic-key example still valid via `instanceId` *property* +
  `args` — clarify property vs option), `apps/docs/guide/coming-from-flutter-bloc.md`,
  `apps/docs/guide/coming-from-redux.md`, `apps/docs/guide/changelog.md`,
  `apps/docs/guide/versioning.md`, `apps/docs/guide/introduction.md`.
- `apps/docs/core/types.md` `### instanceId()` — this is the branded-type helper; **keep**, just
  confirm wording doesn't imply a useBloc option.
- Commit: `docs: update secondary pages for args identity`.

### Done when
- No doc references `instanceId` as a `useBloc`/`BlocProvider` option or shows an explicit string key
  (except the explicit v1→args migration note and the `instanceId` *property*/branded-type helper).
- `pnpm --filter @blac/docs build` passes (twoslash typecheck green).

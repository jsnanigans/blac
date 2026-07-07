export const meta = {
  name: 'dirtytalk-perf-stability',
  description: 'Close P4 (diff/ancestor perf), P5 (refcount skeleton), T9 (doc-only), E3 (DirtyChannel.dispose + container forward) in dirtytalk structural/engine',
  phases: [{ title: 'Implement S+X' }, { title: 'Implement F' }, { title: 'Verify' }],
}

const FOOTER = `

--- ORCHESTRATION RULES (mandatory) ---
- Do NOT commit. Do NOT run tests, typecheck, lint, or build. Do NOT pass --no-verify anywhere.
- Extend existing tests; do not rewrite them. Test files MUST import from 'vite-plus/test'.
- Stay strictly inside the listed files and tasks. No opportunistic refactors, no formatting churn, no adjacent fixes.
- Reporting: your FINAL RESPONSE is the return value (not a human message). Return a concise structured summary:
  files changed (paths), what changed per task (task id -> what/where with line refs), and done-check status per task.`

const UNIT_S_BRIEF = `You are implementing Phase 1 (Unit S) of plans/dirtytalk-perf-stability — structural emit-path perf (P4, P5) + T9 doc note. All edits are in package @dirtytalk/structural. Run tasks S1..S5 sequentially (they share path-interner.ts / diff.ts / container.ts).

Current confirmed state: diff.ts:27-37 has getAt doing path.split('.') per call; diffAlongSkeleton (diff.ts:55-75) calls interner.lookup(id) + getAt(prev/next, pathStr) per skeleton id per emit. path-interner.ts has no lookupSegments/ancestorIds/ancestorTargetId. container.ts:290-343 _refineAncestorMarks decodes ancestor ids to string prefixes and does a startsWith scan over the whole skeleton (:298-334). container.ts:233-239 registerConsumerPaths and :241-243 unregisterConsumer both call :263-267 _recomputeSkeleton, which re-unions ALL consumers from scratch via pathSetUnion every call. path-interner.ts:96-98 already has \`get size(): number { return this._paths.length; }\` — this is the T9 minimal fix, already shipped; do not treat it as a task to build, only add a doc line.

S1 (P4a): Add \`lookupSegments(id): readonly string[]\` to PathInterner — memoize path.split('.') per id in a parallel array (this._segments[id]), computed via the existing lookup(id) (reuses sentinel decoding). Add getAtSegments(state, segments) to diff.ts (same body as getAt minus the split). Rewrite getAt to delegate: getAtSegments(state, path === '' ? [] : path.split('.')). Rewrite diffAlongSkeleton's loop (diff.ts:66-73) to use interner.lookupSegments(id) + getAtSegments instead of interner.lookup(id) + getAt.
Done-check: diffAlongSkeleton produces identical results to before on existing fixtures; no path.split call remains in its hot loop; getAt's public behavior (empty-path, missing-intermediate) is unchanged.

S2 (P4b): Add to PathInterner: (1) change internAncestor(path) to also call this.intern(path) first (idempotent, real path is already interned by every current call site) and record this._ancestorTarget[ancestorId] = realId in a parallel array; expose ancestorTargetId(id): PathId | undefined. (2) add ancestorIds(id): readonly PathId[] using lookupSegments(id) — for each shrinking prefix (segments.slice(0,k).join('.'), k from length-1 down to 1) look up this._map.get(prefix) as a PLAIN READ (never force-intern); collect existing ids; memoize per id in a parallel array. Do NOT auto-intern missing intermediate prefixes — must not change .size for any existing path. In container.ts's _refineAncestorMarks (:290-343): replace the prefixes:string[] collection + startsWith scan (:298-334) with: build targetIds = new Set<PathId>() from interner.ancestorTargetId(id) for each ancestor-watch id in roughSet; for each skelId in the skeleton, descends = interner.ancestorIds(skelId).some(a => targetIds.has(a)); on a match read via getAtSegments(prev/next, interner.lookupSegments(skelId)) instead of getAt(prev/next, skelPath).
Done-check: same marks as before on every existing _refineAncestorMarks/patch() test case (array-replace, class-instance-replace, mixed plain+atomic patch); zero startsWith calls remain in _refineAncestorMarks; interner.size unchanged for every existing fixture — spot-check the exact asserted counts in diff.test.ts:214,238, path-interner.test.ts:45,76-77, container.test.ts:460 still pass.

S3 (P5): Replace _recomputeSkeleton (:263-267) with incremental refcounting. Add private readonly _pathRefCounts = new Map<PathId, number>(), private _allPathsConsumers = 0, and a live private readonly _skeletonSet = new Set<PathId>() backing _skeleton. Add private _applyRefDelta(prev: PathSet | undefined, next: PathSet | undefined): void that decrements every id in prev (deleting from _skeletonSet when count hits 0; decrementing _allPathsConsumers if prev === ALL_PATHS) then increments every id in next (adding to _skeletonSet on the 0->1 transition; incrementing _allPathsConsumers if next === ALL_PATHS), then sets this._skeleton = this._allPathsConsumers > 0 ? ALL_PATHS : this._skeletonSet. Rewrite registerConsumerPaths (:233-239) to call this._applyRefDelta(prev, paths) after the existing pathSetEquals fast-path skip. Rewrite unregisterConsumer (:241-243) to call this._applyRefDelta(prev, undefined) only when a consumer actually existed. Remove _recomputeSkeleton/dead pathSetUnion usage if nothing else references them (check with rg first).
Done-check: for any sequence of register/unregister calls, the resulting _skeleton is set-equal (pathSetEquals) to a from-scratch union of all currently-registered consumers' paths — verified by a property test (S5) with randomized sequences including duplicate paths across consumers, re-registration with changed paths, and an ALL_PATHS-interest consumer mixed with concrete-path consumers.

S4 (T9 doc-only): Add a one-line JSDoc addition to PathInterner.get size() (:96-98) cross-referencing it as the leak/growth diagnostic surface (e.g. "Exposed for devtools/leak diagnostics — see review-889 T9: per-class interners are append-only and shared across instances; watch this for state shapes with unbounded dynamic keys."). No behavior change.
Done-check: doc comment present; no functional diff to the getter.

S5 (Tests): Extend diff.test.ts (segment-cache correctness: repeated diffAlongSkeleton calls on the same interner give identical results; getAt behavior unchanged for empty-path/missing-intermediate), path-interner.test.ts (lookupSegments memoization returns ===-stable arrays on repeat calls for the same id; ancestorIds/ancestorTargetId correctness; .size unchanged by the new lookups), and container.test.ts (P4b: _refineAncestorMarks identical marks pre/post for array-replace + mixed patches; P5: the mandatory property test from S3's done-check). import from 'vite-plus/test'.
Done-check: new cases exist for P4a/P4b/P5/T9.

Permitted files: packages/dirtytalk-structural/src/path-interner.ts, diff.ts, container.ts, diff.test.ts, path-interner.test.ts, container.test.ts. Do NOT touch tracker.ts/index.ts/react-hook.ts.${FOOTER}`

const UNIT_X_BRIEF = `You are implementing Phase 2 (Unit X) of plans/dirtytalk-perf-stability — engine DirtyChannel teardown (E3). All edits are in package @dirtytalk/engine. Run tasks X1..X2 sequentially.

Current confirmed state: dirty-channel.ts has no dispose(), no #disposed field. mark() is at :50-63, subscribe() at :65-77, #flush() at :79-150, constructor at :38-48. Scheduler interface has optional cancel?(): void; MicrotaskScheduler and RAFScheduler implement it, ManualScheduler and SyncScheduler do not (do NOT add cancel() to those — out of scope, dispose() must tolerate its absence via optional chaining).

X1 (E3): Add #disposed = false; field to DirtyChannel. Add dispose(): void — if already #disposed, return (idempotent); else set #disposed = true, then if #scheduled call this.#scheduler.cancel?.() and set #scheduled = false, then this.#accumulated = this.#space.empty() and this.#subscribers.clear(). Guard mark() (:50-63): if #disposed, return immediately before any accumulate/schedule (prevents a post-dispose mark() from re-requesting the scheduler and resurrecting the channel). Guard #flush() (:79-150): return immediately if #disposed (defensive against a scheduler without cancel(), e.g. ManualScheduler/SyncScheduler, invoking a stale #boundFlush after dispose). Guard subscribe() (:65-77): if #disposed, return a no-op unsubscribe function without registering the entry.
Done-check: dispose() calls scheduler.cancel() when the scheduler has one and a flush was pending; dispose() with nothing pending doesn't call cancel; mark()/subscribe() after dispose() are no-ops (no throw, no scheduler interaction, no new subscriber recorded); dispose() called twice is safe; pre-dispose behavior is byte-identical to current.

X2 (Tests): Extend dirty-channel.test.ts: (a) with a spy scheduler (request/cancel mocked), mark() then dispose() calls cancel() once; (b) dispose() with nothing pending doesn't call cancel; (c) after dispose(), mark() is a no-op (spy scheduler's request not called again) and a subscribe() call's callback never fires; (d) dispose() called twice doesn't throw or double-invoke cancel; (e) confirm pre-dispose flush/error/AggregateError behavior (existing suite) stays green — do not weaken existing assertions. import from 'vite-plus/test'.
Done-check: new cases exist for all five points above.

Permitted files: packages/dirtytalk-engine/src/dirty-channel.ts, dirty-channel.test.ts. Do NOT touch scheduler.ts, space.ts, index.ts, primitives.ts.${FOOTER}`

const UNIT_F_BRIEF = `You are implementing Phase 3 (Unit F) of plans/dirtytalk-perf-stability — structural container teardown forward. All edits are in packages/dirtytalk-structural/src/container.ts (+ its test). Run F1..F2 sequentially. Phase 1 (P4/P5 refcount work) and Phase 2 (engine DirtyChannel.dispose()) have already landed in source — rely on both.

Current confirmed state: StructuralContainer has a public \`channel\` getter around container.ts:123-125. No dispose/teardown/destroy method exists anywhere in the class. DirtyChannel now has a dispose() method (Phase 2, dirty-channel.ts).

F1 (Forward): Add dispose(): void to StructuralContainer, placed near the channel getter (:123-125). Body: this._channel.dispose();. Do NOT touch _consumerPaths/_skeleton clearing — out of scope. Add a one-line class-docstring note (near :61-70) that dispose() exists for embedders that need to tear down a container's channel.
Done-check: StructuralContainer.dispose() exists and calls this._channel.dispose(); no behavior change to emit/patch/registerConsumerPaths when dispose() is never called.

F2 (Tests): Extend container.test.ts: container.dispose() forwards to the underlying channel — construct with a scheduler whose cancel is a spy, mark dirty so a flush is pending, call container.dispose(), assert cancel was invoked (proves the forward actually reaches the channel's teardown, not a same-named no-op); calling container.dispose() twice is safe. import from 'vite-plus/test'.
Done-check: new dispose-forward case exists.

Permitted files: packages/dirtytalk-structural/src/container.ts, container.test.ts. Do NOT touch diff.ts, path-interner.ts, tracker.ts, index.ts.${FOOTER}`

const VERDICT = {
  type: 'object',
  required: ['id', 'holds', 'issues'],
  properties: {
    id: { type: 'string' },
    holds: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

phase('Implement S+X')
const [s, x] = await parallel([
  () => agent(UNIT_S_BRIEF, {
    agentType: 'quick-build', model: 'opus', effort: 'high',
    label: 'perf:S-structural', phase: 'Implement S+X',
  }),
  () => agent(UNIT_X_BRIEF, {
    agentType: 'quick-build', effort: 'high',
    label: 'feat:X-engine-dispose', phase: 'Implement S+X',
  }),
])

phase('Implement F')
const f = await agent(UNIT_F_BRIEF, {
  agentType: 'quick-build', effort: 'high',
  label: 'feat:F-container-forward', phase: 'Implement F',
})

phase('Verify')
const CLUSTERS = [
  {
    id: 'structural',
    files: 'packages/dirtytalk-structural/src/{diff,path-interner,container}.ts + diff.test.ts, path-interner.test.ts, container.test.ts',
    phaseFiles: 'phase-1-structural-perf.md, phase-3-structural-forward.md',
    findings: 'P4 (segment-cache in lookupSegments/getAtSegments, integer ancestorIds/ancestorTargetId lookup replacing startsWith scan, identical marks + identical interner.size), P5 (refcount skeleton via _pathRefCounts/_allPathsConsumers, identical to a from-scratch union), T9 (doc-only, no functional change), F (container.dispose() forwards to channel.dispose(), additive)',
  },
  {
    id: 'engine',
    files: 'packages/dirtytalk-engine/src/dirty-channel.ts + dirty-channel.test.ts',
    phaseFiles: 'phase-2-engine-dispose.md',
    findings: 'E3 (dispose() cancels pending flush via scheduler.cancel?.(), clears subscribers/accumulated, guards mark()/#flush()/subscribe() post-dispose, idempotent, pre-dispose behavior unchanged)',
  },
]
const verdicts = await parallel(CLUSTERS.map(c => () =>
  agent(
    `Read the working-tree diff (git diff) for ${c.files} in /Users/brendanmullins/Projects/blac. ` +
    `Adversarially prove that the ${c.id} findings either are correctly and completely fixed, or find where ` +
    `they aren't. Findings: ${c.findings}. Open plans/dirtytalk-perf-stability/${c.phaseFiles}, take each task's ` +
    `done-check, and check the diff actually meets it. Be skeptical — for structural specifically: does the ` +
    `refcount skeleton (_pathRefCounts/_allPathsConsumers) ever diverge from a from-scratch union across register/ ` +
    `unregister sequences (double-decrement, negative counts, an ALL_PATHS consumer mixed with concrete-path ` +
    `consumers)? Does the new ancestorIds/ancestorTargetId lookup ever auto-intern a path that changes ` +
    `interner.size counts asserted in existing tests (diff.test.ts:214,238, path-interner.test.ts:45,76-77, ` +
    `container.test.ts:460)? Does _refineAncestorMarks produce different marks than the old startsWith scan on ` +
    `any array-patch shape? Does container.dispose() actually reach channel.dispose() (not a same-named stub)? ` +
    `For engine: can mark() after dispose() resurrect a scheduled flush? Does dispose() tolerate schedulers ` +
    `without cancel() (ManualScheduler/SyncScheduler) without throwing? Is pre-dispose flush/error/AggregateError ` +
    `behavior byte-identical to before? Do NOT run tests. Return {id:"${c.id}", holds: (true if fix is correct & ` +
    `complete), issues: [concrete problems found]}.`,
    { agentType: 'investigator', effort: 'high', label: `verify:${c.id}`, phase: 'Verify', schema: VERDICT }
  )))

return { s, x, f, verdicts }

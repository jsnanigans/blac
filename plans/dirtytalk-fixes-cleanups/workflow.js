export const meta = {
  name: 'dirtytalk-fixes-cleanups',
  description: 'Close T2,T3,T4,T5,P1,E2,E1b + de-barrel cleanups in dirtytalk structural/engine',
  phases: [{ title: 'Implement' }, { title: 'Verify' }],
}

const FOOTER = `

--- ORCHESTRATION RULES (mandatory) ---
- Do NOT commit. Do NOT run tests, typecheck, lint, or build. Do NOT pass --no-verify anywhere.
- Extend existing tests; do not rewrite them. Test files MUST import from 'vite-plus/test'.
- Stay strictly inside the listed files and tasks. No opportunistic refactors, no formatting churn, no adjacent fixes.
- Reporting: your FINAL RESPONSE is the return value (not a human message). Return a concise structured summary:
  files changed (paths), what changed per task (task id -> what/where with line refs), and done-check status per task.`

const UNIT_A_BRIEF = `You are implementing Phase 1 (Unit A) of plans/dirtytalk-fixes-cleanups — structural tracker correctness + structural cleanup. All edits are in package @dirtytalk/structural. Run tasks A1..A6 sequentially (they share tracker.ts / index.ts).

Current confirmed state: tracker.ts:99 has \`const proxyByTarget = new WeakMap<object, unknown>();\`; cache read at :102; \`proxyByTarget.set(target, proxy)\` at :226. No descriptor check, no ownKeys/has trap, no raw export. pathsFromPatch exported from index.ts:16.

A1 (T2): Key the per-render proxy cache by (target, prefix), not target alone. Replace \`proxyByTarget: WeakMap<object,unknown>\` (tracker.ts:99) with a \`WeakMap<object, Map<string, unknown>>\` (target -> prefix -> proxy). Same (target,prefix) returns the identical proxy (preserve value.user===value.user); the same object read via two different paths gets two distinct proxies, each recording its own prefix. Update the comment at tracker.ts:61.
Done-check: an object reachable at two paths records both leaf paths; same-path repeat read is ===-identical.

A2 (T3): Before recursing into a nested value (around tracker.ts:217-221), read \`Object.getOwnPropertyDescriptor(t, key)\`; if \`desc && !desc.configurable && !desc.writable\`, return the RAW value (the path was already recorded above as a coarse leaf) instead of \`wrap(...)\`.
Done-check: reading a nested property of an Object.freeze'd state no longer throws the Proxy [[Get]] TypeError; the frozen object's path is still recorded.

A3 (T4): Add an \`ownKeys\` trap that pins the object's own \`prefix\` path (coarse, like the existing pinArrayPath) so Object.keys/for..in/spread over the object wakes on add/remove; add a \`has\` trap that records the queried child path. Skip pinning when prefix==='' (root). Existing array length/iteration behavior must stay unchanged.
Done-check: Object.keys(state.dict) records the \`dict\` path (non-empty set); \`'k' in state.dict\` records \`dict.k\`.

A4 (T5): Add a per-call module-scope \`const proxyToTarget = new WeakMap<object,object>();\` and register every proxy->target in wrap (tracker.ts:225-226). Export \`raw<T>(v: T): T\` from the package barrel (index.ts): returns the underlying target for a tracked proxy, else returns v unchanged. Document the two hazards (identity-=== callbacks; derived-array escape) in the trackRender docstring and README.md.
Done-check: raw(proxy) === underlyingTarget; raw(nonProxy) === nonProxy; raw exported from index.ts; docstring lists both hazards.

A5 (Cleanup): Remove \`pathsFromPatch\` from the index.ts export list (index.ts:16); mark its declaration \`@internal\` in diff.ts. In package.json: remove the dead \`typesVersions.core\` mapping (no ./core export exists); resolve the \`files:["LICENSE"]\` entry by adding an MIT LICENSE file to the package dir (author is already in package.json — use it).
Done-check: pathsFromPatch absent from barrel, @internal in diff.ts; typesVersions.core gone; a LICENSE file exists in the package dir.

A6 (Tests): Extend tracker.test.ts with cases: aliased-subtree records correct path (A1); frozen-state read doesn't throw + path recorded (A2); Object.keys/in enumeration wakes (A3); raw() unwraps proxies and passes non-proxies through (A4). import from 'vite-plus/test'.
Done-check: new cases exist for T2/T3/T4/T5.

Permitted files: packages/dirtytalk-structural/src/tracker.ts, index.ts, diff.ts, package.json, LICENSE (new), tracker.test.ts. Do NOT touch container.ts (owned by Phase 3).${FOOTER}`

const UNIT_C_BRIEF = `You are implementing Phase 2 (Unit C) of plans/dirtytalk-fixes-cleanups — engine error hardening + engine cleanup. All edits are in package @dirtytalk/engine. Run tasks C1..C4 sequentially.

Current confirmed state: dirty-channel.ts has NO onError. scheduler.ts uses \`#pending: Set<() => void>\` (E1 slot->Set already done — do NOT undo it; only ADD per-fn isolation to the drains). index.ts:1-2 exports Observable (type) and Signal.

C1 (E2): Add an optional 3rd ctor arg \`options?: { onError?: (err: unknown) => void }\` to DirtyChannel (dirty-channel.ts:36). In #flush: when onError is set, route each collected error to it and do NOT rethrow; when unset, preserve the exact current behavior (single throw / AggregateError at :128-134). This applies to BOTH the interest-thunk catch (:101) and the callback catch (:111).
Done-check: with onError set, a throwing callback calls onError(err) and flush does not throw; with onError unset, existing rethrow behavior is byte-identical.

C2 (E1b): In ManualScheduler.pump (:34), MicrotaskScheduler.#drain (:64), and RAFScheduler.#drain (:118), wrap each \`fn()\` in try/catch, collect throws, and after the loop rethrow the single error or an AggregateError (mirror the pattern at dirty-channel.ts:128-134). A throwing flush must not prevent remaining pending flushes from running.
Done-check: two pending fns where the first throws — the second still runs; the throw surfaces after the loop.

C3 (Cleanup): Remove the \`Signal\` + \`Observable\` exports from index.ts:1-2 (leave primitives.ts source intact). Scrub the "insomni" codename in space.ts's doc comment -> neutral phrasing (e.g. "a canvas renderer"). In engine package.json: resolve the \`files:["LICENSE"]\` entry by adding an MIT LICENSE file.
Done-check: Signal/Observable absent from index.ts; no "insomni" in space.ts; engine LICENSE file exists.

C4 (Tests): Extend dirty-channel.test.ts (onError routes errors + suppresses rethrow; unset preserves rethrow) and scheduler.test.ts (per-fn isolation: first-of-two throws, second still runs). import from 'vite-plus/test'.
Done-check: new cases exist for E2 + E1b.

Permitted files: packages/dirtytalk-engine/src/dirty-channel.ts, scheduler.ts, index.ts, space.ts, package.json, LICENSE (new), dirty-channel.test.ts, scheduler.test.ts.${FOOTER}`

const UNIT_B_BRIEF = `You are implementing Phase 3 (Unit B) of plans/dirtytalk-fixes-cleanups — structural container P1 emit + onError forward. All edits are in packages/dirtytalk-structural/src/container.ts (+ its test). Run B1..B3 sequentially. Phase 2 (engine) has already added the DirtyChannel \`options.onError\` ctor arg — rely on it.

Current confirmed state: emit shortcut at container.ts:141 (\`if (this._consumerPaths.size <= 1) { ... dirty = ALL_PATHS; }\`); T1 root-sentinel branch around :156-167 (\`dirty = new Set<PathId>([this.interner.rootId()])\`). DirtyChannel is constructed around container.ts:89.

B1 (P1): Change the emit branch (container.ts:141): use ALL_PATHS ONLY when \`_consumerPaths.size === 0\`. For size >= 1, run diffAlongSkeleton and KEEP the empty-diff -> rootId() root-sentinel branch (:156-167) so off-skeleton changes still wake ALL_PATHS subscribers (blac bridge, plugins, watch) while registered leaf consumers stay asleep. Update the :142-144 comment (and the :61 class docstring line about single-consumer short-circuit if it now misstates behavior).
Done-check: a single auto-track consumer + emit changing an untracked field -> the consumer's leaf interest does not intersect (stays asleep) but the root-sentinel wakes an ALL_PATHS subscriber; a change to the consumer's tracked field still wakes it; zero-consumer emit still uses ALL_PATHS.

B2 (E2 forward): Add \`onError?: (err: unknown) => void\` to StructuralContainerOptions; pass \`{ onError }\` as the 3rd arg to \`new DirtyChannel(...)\` at its construction site (container.ts:~89). No behavior change when unset.
Done-check: StructuralContainerOptions.onError exists and reaches the channel ctor; unset -> identical current behavior.

B3 (Tests): Extend container.test.ts: single-consumer precise wake (untracked change -> consumer asleep, ALL_PATHS subscriber wakes; tracked change -> consumer wakes); onError option forwarded (a throwing subscriber routes to the container's onError instead of throwing). import from 'vite-plus/test'.
Done-check: new P1 + onError-forward cases exist.

Permitted files: packages/dirtytalk-structural/src/container.ts, container.test.ts. Do NOT touch tracker.ts/index.ts (owned by Phase 1).${FOOTER}`

const VERDICT = {
  type: 'object',
  required: ['id', 'holds', 'issues'],
  properties: {
    id: { type: 'string' },
    holds: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

phase('Implement')
const impl = await parallel([
  () => agent(UNIT_A_BRIEF, {
    agentType: 'quick-build', model: 'opus', effort: 'high',
    label: 'fix:A-tracker', phase: 'Implement',
  }),
  async () => {
    // C then B — B forwards the onError option C adds.
    const c = await agent(UNIT_C_BRIEF, {
      agentType: 'quick-build', effort: 'high',
      label: 'fix:C-engine', phase: 'Implement',
    })
    const b = await agent(UNIT_B_BRIEF, {
      agentType: 'quick-build', effort: 'high',
      label: 'fix:B-container', phase: 'Implement',
    })
    return [c, b]
  },
])

phase('Verify')
const CLUSTERS = [
  { id: 'A', files: 'packages/dirtytalk-structural/src/{tracker,index,diff}.ts + LICENSE + tracker.test.ts', phaseFile: 'phase-1-structural-tracker.md', findings: 'T2 (aliased-subtree proxy path), T3 (frozen-leaf read crash), T4 (key enumeration wakes), T5 (raw() unwrap + hazards), plus pathsFromPatch de-barrel + packaging nits' },
  { id: 'C', files: 'packages/dirtytalk-engine/src/{dirty-channel,scheduler,index,space}.ts + LICENSE + *.test.ts', phaseFile: 'phase-2-engine-hardening.md', findings: 'E2 (DirtyChannel onError seam, default rethrow byte-identical), E1b (per-fn drain isolation in all 3 schedulers), plus Signal/Observable de-barrel + insomni scrub' },
  { id: 'B', files: 'packages/dirtytalk-structural/src/container.ts + container.test.ts', phaseFile: 'phase-3-structural-container.md', findings: 'P1 (ALL_PATHS only when size===0, root-sentinel preserved, tracked-field wake), E2 forward (StructuralContainerOptions.onError reaches ctor)' },
]
const verdicts = await parallel(CLUSTERS.map(c => () =>
  agent(
    `Read the working-tree diff (git diff) for ${c.files} in /Users/brendanmullins/Projects/blac. ` +
    `Adversarially prove that the Unit ${c.id} findings either STILL reproduce or that the fix is ` +
    `incorrect, incomplete, or regressive. The findings: ${c.findings}. ` +
    `Open plans/dirtytalk-fixes-cleanups/${c.phaseFile}, take each task's failure scenario / done-check, ` +
    `and check the diff actually closes it. Be skeptical — look for: preserved-behavior contracts broken ` +
    `(e.g. default rethrow no longer byte-identical, root-sentinel branch removed, per-index array tracking ` +
    `broken, proxy identity within a render lost), missing traps, or done-checks not actually met. ` +
    `Do NOT run tests. Return {id:"${c.id}", holds: (true if fix is correct & complete), issues: [concrete problems found]}.`,
    { agentType: 'investigator', effort: 'high', label: `verify:${c.id}`, phase: 'Verify', schema: VERDICT }
  )))

return { impl, verdicts }

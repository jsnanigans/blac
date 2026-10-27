---
title: 'Proposal: Mutation Concurrency'
description: Preview of ordered mutation slots, an exclusive option and per-item (keyed) mutations for @blac/async, replacing hand-written isSubmitting guards and loading-id sets.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

`resource` is latest-wins. `mutation` has no ordering at all. Reading `packages/blac-async/src/mutation.ts`, every call sets `loading`, awaits, then writes `success` or `error` to the slot, whatever else is running:

| Time | Call A (slow) | Call B (fast) | Slot status   |
| ---- | ------------- | ------------- | ------------- |
| 0    | starts        |               | `loading`     |
| 1    |               | starts        | `loading`     |
| 2    |               | finishes      | `success` (B) |
| 3    | finishes      |               | `success` (A) |

- At time 2 the slot says `success` while A is still in flight, so a submit button re-enables early.
- At time 3 the slot holds A's data, which is older than B's.
- A failing A at time 3 would overwrite B's `success` with `error`.

Forms avoid this today with a hand-written guard: an `if (this.state.isSubmitting) return;` at the top of the submit method, plus a `patch({ isSubmitting })` before and after the call. Every container with a submit repeats it.

A second gap: a mutation has **one** slot. Toggling row A and then row B shares one status, so a list cannot show a spinner on the row being saved. Containers hand-roll a `Set<string>` or `string[]` of loading ids, or prefix a loading key per item (`startLoading(\`select-${id}\`)`).

## Proposed behavior

Three changes, one of them API-free. They assume a mutation resolves its settled `AsyncState` ([async refinements](/proposals/async-refinements/#2-mutations-resolve-their-result)).

### 1. The slot follows the latest call (default, no API)

Each call takes a sequence number. Only the latest started call writes the slot. An older call that finishes later still:

- runs `invalidates` and `success`, because the request really happened,
- resolves its promise with its own settled state,
- reports its failure to the global `onError`,

but it does not write the slot. The slot is `loading` until the latest call settles.

This is a bug fix rather than a feature: today's behavior is a race, so I don't expect anyone to depend on it.

### 2. `exclusive: true` (opt-in)

```ts
mutation(this, 'submit', fn, { exclusive: true });
```

While a call is in flight, further calls are dropped and return the in-flight promise. Use it for submit buttons, where the second click should be ignored. Leave it off for calls with different inputs that must all run (toggling item A, then item B).

### 3. Keyed mutations (opt-in)

```ts
toggles = mutation(
  this,
  'toggles',
  (input: { id: string; on: boolean }) => api.setEnabled(input.id, input.on),
  { key: (input) => input.id },
);
```

With `key`, the slot is a `Record<string, AsyncState<R>>` instead of one `AsyncState<R>`. Each key has its own status, and ordering and `exclusive` apply per key: toggling A twice drops or orders the second A call, while B runs independently.

```tsx
const [{ toggles }, cubit] = useBloc(FeatureListCubit);

<Switch
  checked={item.enabled}
  loading={toggles[item.id]?.status === 'loading'}
  onChange={(on) => cubit.toggles({ id: item.id, on })}
/>;
```

Entries stay in the record after they settle, so a row can show its last error. Open question below on clearing them.

### Not proposed

- **Abort the previous call.** A POST already sent cannot be unsent, and `mutation` does not hand its function a signal today. Aborting would only hide the result.
- **A queue** (`concurrency: 'queue'`). No known use; add it when one appears.

## Use

```ts
class SettingsCubit extends Cubit<{ save: AsyncState<Settings> }> {
  constructor() {
    super({ save: idle() });
  }

  save = mutation(
    this,
    'save',
    (input: SettingsInput) => api.saveSettings(input),
    {
      exclusive: true,
      success: 'Saved',
    },
  );
}

// double click: one request, both calls get the same result
const [a, b] = await Promise.all([settings.save(input), settings.save(input)]);
```

```tsx
const [{ save }, settings] = useBloc(SettingsCubit);

<Button
  disabled={save.status === 'loading'}
  onClick={() => settings.save(input)}
>
  Save
</Button>;
```

## Before and after

### Cubit: a confirmation dialog

Adapted from a production dialog container and simplified.

```ts title="Before"
private finishTask = async (taskPath: string, status: TaskStatus, trackEvent: string): Promise<void> => {
  if (this.state.isSubmitting) {
    return;
  }

  const task = this.findTask(taskPath);
  if (!task || task.kind !== 'device-request') {
    reportError(new Error(`Unknown task path: ${taskPath}`));
    toast.error('error.generic.tryAgain');
    return;
  }

  if (status === 'skipped' && !task.userCanSkip) {
    reportError(new Error(`Task is not skippable: ${taskPath}`));
    toast.error('error.generic.tryAgain');
    return;
  }

  this.patch({ isSubmitting: true, isSkipConfirmationOpen: false });

  const updatedTask = await getBloc(TaskManager).updateTaskStatus(task, status);

  this.patch({ isSubmitting: false });

  if (!updatedTask) {
    toast.error('error.generic.tryAgain');
    return;
  }

  analytics.track(trackEvent, { type: 'complete', data: { taskPath, status } });
  popups.close();
};
```

```ts title="After"
private submit = mutation(
  this,
  'submit',
  async ({ taskPath, status }: { taskPath: string; status: TaskStatus }) => {
    const task = this.findTask(taskPath);
    if (!task || task.kind !== 'device-request') {
      throw new Error(`Unknown task path: ${taskPath}`);
    }
    if (status === 'skipped' && !task.userCanSkip) {
      throw new Error(`Task is not skippable: ${taskPath}`);
    }
    const updated = await getBloc(TaskManager).updateTaskStatus(task, status);
    if (!updated) throw new Error('Task update rejected');
    return updated;
  },
  { exclusive: true, onError: () => toast.error('error.generic.tryAgain') },
);

private finishTask = async (taskPath: string, status: TaskStatus, trackEvent: string) => {
  this.patch({ isSkipConfirmationOpen: false });
  const result = await this.submit({ taskPath, status });
  if (result.status !== 'success') return;
  analytics.track(trackEvent, { type: 'complete', data: { taskPath, status } });
  popups.close();
};
```

What goes away: the `isSubmitting` field and its two `patch` calls, the early-return guard, and three copies of the report-plus-toast pair. `state.isSubmitting` becomes `state.submit.status === 'loading'`.

Behavior differences to review:

- The "task update rejected" case now reaches the global `onError` (and so error reporting). Before, only the two validation failures did. If that is too noisy, the per-call `onError` can return `false` for it.
- `isSkipConfirmationOpen` is cleared before the guard, so a dropped second click also closes the confirmation. Before, the early return left it untouched.

### Test

```ts title="Before — a hand-written guard needs its own test"
it('ignores a second submit while one is in flight', async () => {
  const first = cubit.completeTask(path);
  await cubit.completeTask(path);
  await first;
  expect(updateTaskStatus).toHaveBeenCalledTimes(1);
});
```

```ts title="After — the library tests it, the cubit asserts the option"
expect(updateTaskStatus).toHaveBeenCalledTimes(1); // after two concurrent submit() calls
```

The "before" test is a typical shape, not copied from a real suite.

## Library change

- `mutation.ts`: a per-mutation (or per-key) counter and in-flight promise, about 10 lines, plus the keyed slot, about 20 lines.
- Types: a keyed overload whose slot key must hold `Record<string, AsyncState<R>>`.
- Tests: out-of-order completion, an older failure not overwriting a newer success, `exclusive` returning the same promise, `exclusive` releasing after a failure, and keys staying independent.
- Docs: one paragraph in `guide/async-resources.md`.

Effort: about 2–3 hours for ordering and `exclusive`, plus about 2 hours for keyed mutations.

## Open questions

- **Is the slot rule too quiet?** An older call that fails after a newer one succeeded reports to `onError` only. Is a toast without a slot change enough?
- **`exclusive` default.** Opt-in keeps current behavior for multi-input calls. Defaulting to exclusive would match most forms but break toggle-style calls silently.
- **Clearing keyed entries.** Keep settled entries until the container is disposed, or drop `success` entries after they settle?
- **Signal for mutation functions.** Not proposed here. It would let `fn` stop on deactivation, but it changes the `fn(input, args)` signature.

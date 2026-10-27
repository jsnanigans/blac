---
title: 'Proposal: ask()'
description: Preview of ask() for @blac/async, an awaitable request that a container opens and the UI answers, replacing hand-wrapped dialog promises.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Framing

Dialogs and forms are **not goals of BlaC**. BlaC ships no dialog, no modal, no UI at all. `ask()` is a small state primitive: an app builds its own dialogs, popups and sheets on top of it, with whatever component library it already uses.

## Problem

Containers often need an answer from the user in the middle of a flow: confirm a delete, pick an option, enter an MFA code, grant a permission. Today the container cannot ask. It passes `onSuccess` / `closeDialog` callbacks down to a component, or opens a dialog imperatively and wraps `new Promise(resolve => …)` by hand.

In one production codebase, about:

- 91 imperative dialog constructions,
- 32 calls to a confirm helper, in 26 files,
- 25 `useState(false)` "is the dialog open" flags.

A second app, by the same team, has about 63 calls to an imperative popup function.

The hand-written promise has the same gaps each time: nothing resolves it when the host goes away, the open state lives outside any container (so tests mock the module), and the helper grows an option per use case.

## Proposed API

```ts
const confirm = ask<Payload, Answer>(host, 'confirm');
```

`ask` writes a slot to `state.confirm`:

```ts
type AskState<Payload> = { open: false } | { open: true; payload: Payload };
```

| Call                              | Effect                                                           |
| --------------------------------- | ---------------------------------------------------------------- |
| `await this.confirm.ask(payload)` | Opens the slot and resolves with the answer.                     |
| `cubit.confirm.answer(value)`     | Closes the slot and resolves the pending `ask`.                  |
| `cubit.confirm.dismiss()`         | Closes the slot and resolves the pending `ask` with `undefined`. |
| host deactivates                  | Same as `dismiss()`, so no flow is left hanging.                 |

- The result type is `Answer | undefined`, so a dismissed prompt cannot be mistaken for an answer.
- `answer` and `dismiss` on a closed slot do nothing.
- The initial state is `{ open: false }`, like `idle()` for `resource` and `mutation`.

No React host, no component, no portal. The slot is ordinary state, so any `useBloc` consumer can render from it.

## Use

```ts
class ProjectsCubit extends Cubit<{
  confirm: AskState<{ name: string }>;
  archive: AsyncState<void>;
}> {
  constructor() {
    super({ confirm: { open: false }, archive: idle() });
  }

  confirm = ask<{ name: string }, boolean>(this, 'confirm');

  private archive = mutation(
    this,
    'archive',
    (id: string) => api.archiveProject(id),
    { success: 'Project archived', invalidates: () => ['projects'] },
  );

  archiveProject = async (id: string, name: string) => {
    if (await this.confirm.ask({ name })) await this.archive(id);
  };
}
```

```tsx
function ConfirmArchive() {
  const [{ confirm }, cubit] = useBloc(ProjectsCubit);
  if (!confirm.open) return null;

  return (
    <AppDialog
      title={`Archive ${confirm.payload.name}?`}
      onOk={() => cubit.confirm.answer(true)}
      onCancel={cubit.confirm.dismiss}
    />
  );
}
```

`AppDialog` is the app's own component. A dismissed or answered-`false` prompt both skip the mutation.

## Before and after

### Container: a confirm helper

Adapted from a production container and simplified.

```tsx title="Before — an imperative helper, called from a hook"
export const confirmAndRun = ({
  dialogTitle,
  dialogMessage,
  key,
  action,
  successMessage,
  errorMessage,
}: ConfirmProps): Promise<boolean> =>
  new Promise((resolve) => {
    const { removeDialog, openDialog } = new Dialog({
      name: `Confirm: ${dialogTitle}`,
    });

    analytics.track('Opening confirm dialog', { key, dialogTitle });

    const onCancel = () => {
      removeDialog();
      resolve(false);
    };

    const onSubmit = async () => {
      try {
        loadingState.startLoading(key);
        await action();
        if (successMessage) toast.success(successMessage, { key });
        removeDialog();
        resolve(true);
      } catch (e) {
        const text =
          typeof errorMessage === 'function' ? errorMessage(e) : errorMessage;
        if (text) toast.error(text);
        onCancel();
      } finally {
        loadingState.stopLoading(key);
      }
    };

    openDialog(
      <ConfirmationDialog
        loadingKey={key}
        title={dialogTitle}
        message={dialogMessage}
        onOk={onSubmit}
        onCancel={onCancel}
      />,
    );
  });

// caller
await confirmAndRun({
  key: 'projects',
  dialogTitle: `Archive “${project.name}”?`,
  dialogMessage: 'Archived projects are hidden from everyone on the team.',
  errorMessage: 'Error while archiving project',
  successMessage: 'Project archived',
  action: async () => {
    await api.archiveProject(project.id);
    reloadProjects();
  },
});
```

```ts title="After — ask + mutation in the container, a dialog in the app"
archiveProject = async (id: string, name: string) => {
  if (await this.confirm.ask({ name })) await this.archive(id);
};
```

`archive` is the mutation from [Use](#use); `invalidates` replaces the manual `reloadProjects()`. What goes away: the module-level helper and its Promise plumbing, the loading key, and the success and error toast branches (the mutation's `success` and the global `onError` cover them).

The confirm helper becomes about three lines in the app, on top of `ask` and `mutation`. Apps keep any shared dialog component; it just reads the slot instead of being opened imperatively.

### Test

```ts title="Before — mock the module, assert on the mock"
vi.mock('src/lib/confirmAndRun', () => ({
  confirmAndRun: mockConfirm,
}));

mockConfirm.mockImplementation(async ({ action }) => {
  await action();
  return true;
});
```

```ts title="After — answer the slot, no rendering, no module mock"
const done = cubit.archiveProject('p1', 'Website');
expect(cubit.state.confirm).toEqual({
  open: true,
  payload: { name: 'Website' },
});

cubit.confirm.answer(true);
await done;
expect(api.archiveProject).toHaveBeenCalledWith('p1');
```

A second test calls `cubit.confirm.dismiss()` and asserts `api.archiveProject` was not called. The "before" test is a typical shape, not copied from a real suite.

## Differences to review

- **The dialog closes on answer.** The helper above keeps the dialog open, with a loading button, until the action finishes. With `ask`, the answer closes the slot at once and progress shows in `state.archive.status`, for example on the page's button. An app that needs a busy dialog can show the mutation's `loading` status inside the dialog, and answer after the work settles.
- **Richer answers.** `Answer` is any type. A "don't ask again" checkbox is `answer({ ok: true, dontAskAgain })`, and the app-side check that skips the prompt stays in the app.
- **Breadcrumbs.** The `analytics.track` call on open moves to a lifecycle hook, see [lifecycle hooks](/proposals/lifecycle-hooks/), or to the dialog component.
- **One slot per prompt.** Two different prompts in one container are two `ask` fields, each with its own slot.

## Library change

- `ask.ts` in `@blac/async`: the slot, one pending resolver, and a dismiss on deactivation (via `onActivated`).
- Types: `AskState<Payload>`, exported next to `AsyncState`.
- Tests: ask/answer, dismiss resolving `undefined`, deactivation resolving a pending ask, and the open-slot behavior chosen below.
- Docs: a short section in `guide/async-resources.md` with the dialog sketch above.

Effort: about 2 hours. No React code and no UI in the library.

## Open questions

- **`ask` while a prompt is already open.** Options:
  - Dismiss the previous one (it resolves `undefined`) and open the new one. Simple, nothing throws, and the latest prompt wins like `resource`. This is my default.
  - Reject the new call. Loud, but flows must handle a rejection.
  - Queue. Needs a slot shape with a list and has no known use.
- **Initial state.** Is `{ open: false }` written by hand in the constructor fine, or should `ask` fill it in when the key is missing?
- **Dismiss and the answer type.** `Answer | undefined` makes every call site handle `undefined`. Is that the right default, or should `ask` take a `dismissValue` (for example `false` for confirms)?

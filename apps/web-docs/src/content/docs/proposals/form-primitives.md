---
title: 'Proposal: Form Primitives'
description: Preview of one new option, configureAsync normalizeError, and four existing primitives that together enhance a schema-driven form component without a form package.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet, except the primitives marked as existing. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Framing

Forms are **not a goal of BlaC**. There is no form package, no field component and no UI in the library. An app that already has a schema-driven form component keeps it. BlaC offers a few small primitives that remove the plumbing around that component, and each of them is useful outside forms.

## Problem

In one production codebase, a schema-driven form component renders the fields and validates against a schema, while a container around it loads the initial values and submits. Every container repeats the same plumbing:

- A `formReady` / `initialFormValues` / `setFormReady` triple, hand-written in about 13 files, to hold the form back until its data has loaded.
- An `isSubmitting` flag, a double-submit guard and a toast-or-report template around every submit.
- No path from a server validation error (a 400 naming fields) to the form's field errors. The error is only toasted.
- Hand-written debounce for async checks such as "email taken", and a bespoke draft service for unsent input.

## Primitives

| Primitive                                                                                                                                                                | What it replaces in form containers                                                                      | Reuse elsewhere                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Initial values from a `resource`: the form renders once `state.invoice.status` is `success` (existing)                                                                   | The `formReady` / `initialFormValues` / `setFormReady` triple, in about 13 files                         | Any view gated on loaded data                                                   |
| `mutation` for submit (existing, resolves its [settled state](/guide/async-resources/#mutation); [concurrency](/proposals/mutation-concurrency/) proposed)               | `isSubmitting`, double-submit guards, the toast/report template                                          | Every write                                                                     |
| `configureAsync({ normalizeError })` (new): one app function turns a raw error into `{ message?, fields?: Record<path, string>, status? }`, stored as the slot's `error` | Missing today: 400s are only toasted. The form reads `fields` from the submit slot into its field errors | `onError` can use `status` to skip 404s, pick toasts and filter error reporting |
| `debounced(host, fn, ms)` from [activation timers](/proposals/activation-timers/)                                                                                        | Debounced async validation, for example "email taken"                                                    | Search, autosave                                                                |
| The web-storage persist plugin on a slice (existing, see [Persistence](/plugins/persistence/))                                                                           | The bespoke draft service, where its shape fits                                                          | Any draft or preferences state                                                  |

Only `normalizeError` is new library code. The rest is a way of using what exists or what other proposals add.

## Proposed API: `normalizeError`

```ts
type NormalizedError = {
  message?: string;
  fields?: Record<string, string>; // field path -> message
  status?: number;
};

configureAsync({
  normalizeError: (error): NormalizedError =>
    error instanceof ApiError
      ? {
          message: error.body?.message,
          status: error.status,
          fields:
            error.status === 400
              ? toFieldMap(error.body?.violations)
              : undefined,
        }
      : { message: error instanceof Error ? error.message : undefined },
});
```

- Runs once per failed `resource` or `mutation` call, in the failure path before the slot is written.
- The slot becomes `{ status: 'error', error: NormalizedError }`. Without `normalizeError`, `error` stays the raw value, as today.
- `onError` still receives the raw error, and its context gains the normalized one:

```ts
configureAsync({
  onError: (raw, ctx) => {
    if (ctx.normalized.status === 404) return; // expected, not reported
    reportError(raw);
  },
});
```

## Use

```ts
class EditInvoiceCubit extends Cubit<
  { invoice: AsyncState<Invoice>; save: AsyncState<Invoice> },
  { id: string }
> {
  constructor() {
    super({ invoice: idle(), save: idle() });
  }

  invoice = resource(
    this,
    'invoice',
    (signal, { id }) => api.getInvoice(id, { signal }),
    { auto: true },
  );

  save = mutation(
    this,
    'save',
    (input: InvoiceInput, { id }) => api.updateInvoice(id, input),
    {
      success: 'Invoice saved',
      invalidates: () => ['invoices'],
    },
  );
}
```

```tsx
function EditInvoice({ id }: { id: string }) {
  const [{ invoice, save }, cubit] = useBloc(EditInvoiceCubit, {
    args: { id },
  });
  if (invoice.status !== 'success') return <Spinner />;

  return (
    <SchemaForm
      schema={invoiceSchema}
      initialValues={toFormValues(invoice.data)}
      onSubmit={(values, controls) => bindSubmit(controls, cubit.save)(values)}
      disabled={save.status === 'loading'}
    />
  );
}
```

`SchemaForm` stands for the app's existing schema-driven form component. Nothing about it changes except what it is wired to.

## App-side adapter

Lives in the app, not in BlaC, because only the app knows its form component's controls. Illustrative:

```ts
export const bindSubmit =
  <I, T>(controls: FormControls, save: (input: I) => Promise<AsyncState<T>>) =>
  async (values: I) => {
    controls.setDisabled(true);
    const result = await save(values);
    controls.setDisabled(false);

    if (result.status === 'error') {
      for (const [path, message] of Object.entries(result.error.fields ?? {})) {
        controls.setError(path, message);
      }
    }
    return result;
  };
```

It maps `fields` errors onto the form's own `setError`, and disables the form while the call is `loading`. It is the only form-specific code, about ten lines.

## Before and after

### Container: load, submit, report

Adapted from a production container and simplified.

```ts title="Before"
class EditInvoiceCubit extends Cubit<{
  loading: boolean;
  currencies: Currency[];
  formReady: boolean;
  initialFormValues?: InvoiceFormValues;
}> {
  constructor(private props: Props) {
    super({ loading: false, currencies: [], formReady: false });
  }

  setFormReady = (formReady: boolean) => this.patch({ formReady });
  setInitialFormValues = (initialFormValues: InvoiceFormValues) =>
    this.patch({ initialFormValues });

  init = async () => {
    try {
      await this.fetchCurrencies();
      this.setInitialFormValues(toFormValues(this.props.invoice));
      this.setFormReady(true);
    } catch (e) {
      reportError(e);
    }
  };

  onSubmit = async (values: InvoiceFormValues) => {
    this.patch({ loading: true });
    try {
      await api.updateInvoice(this.props.invoice.id, toRequest(values));
      toast.success('Invoice saved');
      getBloc(InvoicesCubit).reload();
      this.props.onSuccess();
    } catch (e) {
      toast.error(errorMessage(e)); // a 400 naming fields is only toasted
    } finally {
      this.patch({ loading: false });
    }
  };
}
```

```ts title="After"
class EditInvoiceCubit extends Cubit<
  {
    invoice: AsyncState<Invoice>;
    currencies: AsyncState<Currency[]>;
    save: AsyncState<Invoice>;
  },
  { id: string }
> {
  // `invoice` and `save` as in Use
  currencies = resource(
    this,
    'currencies',
    (signal) => api.listCurrencies(signal),
    {
      auto: true,
      staleTime: Infinity,
    },
  );
}
```

```tsx title="After — the component closes itself on success"
onSubmit={async (values, controls) => {
  const r = await bindSubmit(controls, cubit.save)(toRequest(values));
  if (r.status === 'success') onSuccess();
}}
```

What goes away: `loading`, `formReady`, `initialFormValues`, both setters, `init`, the `try`/`catch`/`finally`, the toast and the manual reload (`invalidates` does it). The `onSuccess` callback stays in the component that owns the dialog, instead of being passed into the container. `state.formReady` becomes `state.invoice.status === 'success'`, and `state.loading` becomes `state.save.status === 'loading'`.

Behavior differences to review:

- A failed load now shows in `state.invoice` (`error`), not only in an error report. The component decides what to render for it.
- A 400 with `fields` now reaches the form's field errors through `bindSubmit`. Before it was only a toast. Whether the toast still shows is up to the app's `onError`, which can skip errors that have `fields`.
- Reporting is controlled by `onError`. A 404 can be skipped there by `status`.

### Test

```ts title="Before"
await cubit.init();
expect(cubit.state.formReady).toBe(true);
expect(cubit.state.initialFormValues).toEqual(expected);
```

```ts title="After"
await waitForState(cubit, (s) => s.invoice.status === 'success');
```

A submit test for field errors stubs `api.updateInvoice` to reject with the app's 400 error and asserts `cubit.state.save.error.fields`. The "before" test is a typical shape, not copied from a real suite.

## Out of scope

- A form package in BlaC. Field components, schema handling and validation stay in the app's form component.
- Replacing the app's form component. It is enhanced, not retired. Dropping a form library the app no longer needs is possible, but not a goal of this proposal.

## Library change

- `config.ts`: a `normalizeError` option, applied in `mutation.ts` and `resource.ts` where the failure slot is written, and exposed as `ctx.normalized` to `onError`.
- Types: `NormalizedError` and how it reaches `AsyncState` (see the second open question).
- Tests: the slot holds the normalized error, `onError` gets the raw one, and no `normalizeError` leaves today's behavior.
- Docs: one section in `guide/async-resources.md`.

Effort: `normalizeError` about 2 hours. The adapter and the form component wiring are app work.

## Open questions

- **Global only, or per call too?** A global function covers one error shape for the whole app. A per-call `normalizeError` would help for an endpoint with its own error body, at the cost of a second place to look.
- **Typing the normalized error.** Either module augmentation of one app-wide type (the app declares `NormalizedError` once, `AsyncState` picks it up), or a generic on `AsyncState<T, E = NormalizedError>`. Augmentation is simpler at use sites, a generic is more explicit and works per call.
- **`ctx.normalized` name.** `onError(raw, ctx)` gains a field. Is `normalized` clear enough, or should the normalized error be a third argument?

---
title: 'Proposal: Typed Step Machine'
description: A docs recipe for multi-step flows as a discriminated-union slot with one transition method, and a possible machine() helper if the recipe repeats.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/core` or `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

Wizards, checkouts and onboarding flows are everywhere, and each one is a hand-written state machine without the machine. In one production codebase there are about 26 step or stage enums and about 103 direct `patch({ step })` writes. Reading one of them:

- **Nothing blocks illegal transitions.** Any method can write any step, so `patch({ step: 'done' })` from the form is legal.
- **Guards are ad hoc.** Each handler opens with `if (this.state.step !== 'review') return;`, and the set of legal moves exists only as the union of those ifs.
- **Step logic is mixed with timers.** Polling, timeouts and "already redirected" flags live next to the step, and the dispose hook has to remember to stop each one.
- **Step data is optional fields.** `orderId?: string` is only meaningful in one step, and every reader checks it.
- **Class-per-status states.** About 11 flows model status as a class hierarchy checked with `instanceof`, which is the same machine with more code.

BlaC state is plain data, so a discriminated union is a natural fit. What is missing is a documented shape for it.

## Proposed: a recipe, no API

Two parts:

1. A discriminated-union `step` slot. Data that belongs to a step lives on that step's variant.
2. A pure function `next(step, event)` that returns the next step, or `undefined` for an illegal move, and one cubit method `transition(event)` that applies it.

The function is the whole transition table. It is testable without a cubit, and `can(event)` for the UI is one line. Effects that belong to a step (polling, timeouts) start in `transition` and are aborted by the next one.

### The recipe

```ts
type Step =
  | { name: 'form' }
  | { name: 'review'; draft: Order }
  | { name: 'processing'; draft: Order; orderId: string }
  | { name: 'done'; orderId: string }
  | { name: 'failed'; draft: Order; reason: string };

type StepEvent =
  | { type: 'submit'; draft: Order }
  | { type: 'confirm'; orderId: string }
  | { type: 'edit' }
  | { type: 'settled'; orderId: string }
  | { type: 'fail'; reason: string }
  | { type: 'retry' };

function next(step: Step, event: StepEvent): Step | undefined {
  switch (step.name) {
    case 'form':
      if (event.type === 'submit')
        return { name: 'review', draft: event.draft };
      return;
    case 'review':
      if (event.type === 'edit') return { name: 'form' };
      if (event.type === 'confirm')
        return {
          name: 'processing',
          draft: step.draft,
          orderId: event.orderId,
        };
      return;
    case 'processing':
      if (event.type === 'settled')
        return { name: 'done', orderId: step.orderId };
      if (event.type === 'fail')
        return { name: 'failed', draft: step.draft, reason: event.reason };
      return;
    case 'failed':
      if (event.type === 'retry') return { name: 'review', draft: step.draft };
      return;
    case 'done':
      return;
  }
}

class CheckoutCubit extends Cubit<{ step: Step }> {
  private effect?: AbortController;

  constructor() {
    super({ step: { name: 'form' } });
    this.onSystemEvent('dispose', () => this.effect?.abort());
  }

  can = (event: StepEvent) => next(this.state.step, event) !== undefined;

  transition = (event: StepEvent) => {
    const step = next(this.state.step, event);
    if (!step) return false;
    this.effect?.abort();
    this.patch({ step });
    if (step.name === 'processing')
      void this.poll(step.orderId, this.newEffect());
    return true;
  };

  private newEffect = () => (this.effect = new AbortController()).signal;

  private poll = async (orderId: string, signal: AbortSignal) => {
    try {
      while (!(await api.getOrder(orderId, signal)).settled) {
        await sleep(2000, signal);
      }
      this.transition({ type: 'settled', orderId });
    } catch (e) {
      if (!signal.aborted) this.transition({ type: 'fail', reason: String(e) });
    }
  };
}
```

In the UI, a switch on `step.name` narrows the variant, so `step.orderId` is typed only where it exists:

```tsx
const [{ step }, checkout] = useBloc(CheckoutCubit);

if (step.name === 'processing') return <Spinner order={step.orderId} />;
<Button disabled={!checkout.can({ type: 'edit' })} />;
```

What the recipe gives: illegal moves return `false` instead of corrupting state, the transition table is one function, step data is not optional, and each step's effect is aborted when the step changes. What it costs: about 15 lines of plumbing per flow (`can`, `transition`, the effect handling), which is what the helper below would absorb.

## Before and after

### Cubit: a checkout flow

Adapted from a production flow container and simplified.

```ts title="Before"
export enum CheckoutStep {
  Cart = 'cart',
  Payment = 'payment',
  Review = 'review',
  WaitingForConfirmation = 'waitingForConfirmation',
  Done = 'done',
}

export class CheckoutCubit extends Cubit<CheckoutState> {
  private pollTimer?: ReturnType<typeof setInterval>;
  private waitingTimeout?: ReturnType<typeof setTimeout>;
  private hasRedirected = false;

  constructor() {
    super({ activeStep: CheckoutStep.Cart, orderId: undefined, error: null });
  }

  get steps() {
    return [
      { key: CheckoutStep.Cart, isAvailable: () => true },
      { key: CheckoutStep.Payment, isAvailable: () => !this.hasSavedCard() },
      { key: CheckoutStep.Review, isAvailable: () => true },
      { key: CheckoutStep.WaitingForConfirmation, isAvailable: () => true },
    ];
  }

  nextStep = () => {
    const available = this.steps.filter((s) => s.isAvailable());
    const idx = available.findIndex((s) => s.key === this.state.activeStep);
    const next = available[idx + 1];
    if (next) this.patch({ activeStep: next.key });
  };

  handlePaymentSaved = () => {
    if (this.state.activeStep !== CheckoutStep.Payment) return;
    this.nextStep();
  };

  placeOrder = async () => {
    if (this.state.activeStep !== CheckoutStep.Review) return;
    const { orderId } = await api.placeOrder(this.state.cart);
    this.patch({ orderId, activeStep: CheckoutStep.WaitingForConfirmation });
    this.startPolling(orderId);
  };

  private checkConfirmation = (order: Order) => {
    if (
      this.state.activeStep !== CheckoutStep.WaitingForConfirmation ||
      this.hasRedirected
    ) {
      return;
    }
    if (order.settled) {
      this.hasRedirected = true;
      this.clearWaitingTimeout();
      this.stopPolling();
      this.patch({ activeStep: CheckoutStep.Done });
    }
  };

  // startPolling, stopPolling, clearWaitingTimeout: setInterval/setTimeout bookkeeping

  _dispose() {
    this.clearWaitingTimeout();
    this.stopPolling();
    super._dispose();
  }
}
```

```ts title="After — recipe"
class CheckoutCubit extends Cubit<{ step: Step }> {
  // can, transition, newEffect, poll and the dispose hook: as in the recipe above

  placeOrder = async (draft: Order) => {
    const { orderId } = await api.placeOrder(draft);
    this.transition({ type: 'confirm', orderId });
  };
}
```

What goes away: the step enum plus its `steps` availability table, the `activeStep !==` guard at the top of every handler, the `orderId` optional field, the `hasRedirected` flag, and the three timer fields with their cleanup. The guard `if (activeStep !== Review) return` becomes the absence of a `confirm` case outside `review`.

Behavior differences to review:

- The "skip payment when a card is saved" rule leaves the `steps` availability table. The caller picks the event (or the table takes context). Flows with many availability rules (the original has seven steps) fit the recipe less well and are the case to pilot.
- A dropped transition returns `false` and does nothing. Decide whether illegal events should also report in development.
- `back` and `prev` navigation needs explicit events. The original's index arithmetic over available steps does not carry over.

### Test

```ts title="Before — drive the flow through handlers and poke state"
cubit.patch({ activeStep: CheckoutStep.Done });
cubit.handlePaymentSaved(); // guard must ignore it
expect(cubit.state.activeStep).toBe(CheckoutStep.Done);
```

```ts title="After — the table is a pure function"
expect(
  next({ name: 'form' }, { type: 'settled', orderId: 'o1' }),
).toBeUndefined();
expect(next(review, { type: 'confirm', orderId: 'o1' })).toMatchObject({
  name: 'processing',
});
```

Illegal transitions become one-line table tests. Effects are tested through the cubit with fake timers or an API mock, as today.

## Later: a `machine()` helper

Only if a pilot shows the recipe's plumbing repeating across flows.

```ts
class CheckoutCubit extends Cubit<{ flow: Step }> {
  flow = machine(this, 'flow', {
    initial: { name: 'form' },
    states: {
      form: { on: { submit: (_, { draft }) => ({ name: 'review', draft }) } },
      review: {
        on: {
          edit: 'form',
          confirm: (s, { orderId }) => ({
            name: 'processing',
            draft: s.draft,
            orderId,
          }),
        },
      },
      processing: {
        on: { settled: 'done', fail: 'failed' },
        enter: (signal, step) => pollUntilSettled(step.orderId, signal),
      },
      failed: { on: { retry: 'review' } },
      done: {},
    },
  });
}

checkout.flow.send({ type: 'edit' });
checkout.flow.can({ type: 'edit' }); // for the UI
```

- **Slot.** `flow` is a plain state slot holding the current variant, so `useBloc` tracking and `withBlocState` seeding work as usual.
- **`send(event)` and `can(event)`.** Same semantics as `transition` and `can` in the recipe. Illegal events return `false`.
- **`enter(signal, step)`.** Runs when a state is entered. The signal aborts when the state is left or the host deactivates, so timers from [Activation timers](/proposals/activation-timers/) (`every`, `after`) clean up per state with no bookkeeping.
- **Typing.** `states` keys must match the union's `name`, and `on` targets are checked against it.
- **Not proposed.** Nested or parallel states, history, and a visualizer. A flow that needs them is a candidate for a real statechart library.

## Library change

- Recipe: one docs page or a section in the guide, plus the sample above in `examples`. No code.
- Helper (later): `machine.ts` in `@blac/async` or `@blac/core`, built on `onActivated` for the per-state signal. About 60 lines and type tests.

Effort: recipe about 2 hours, helper about 1 day.

## Open questions

- **Recipe or helper first?** The recipe avoids new API but repeats about 15 lines per flow. Is that enough repetition to justify the helper after the first pilot flow, or after three?
- **Where do availability rules go?** Skippable steps are the weakest fit for a pure `next`. Either callers choose the event (`skipPayment`), or `next` receives context.
- **Illegal events.** Silent `false`, a dev-mode warning, or a thrown error?
- **Home package.** `@blac/core` (no async dependency) or `@blac/async` (for `enter` effects that load data)?
- **Class-per-status states.** Should the guide recommend migrating those to the union form, or leave them alone?

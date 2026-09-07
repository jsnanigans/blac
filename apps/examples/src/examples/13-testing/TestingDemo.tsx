import { useMemo } from 'react';
import { StateContainerRegistry } from '@blac/core';
import { RegistryProvider, useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card, Button, Badge, RenderCounter } from '../../shared/components';
import { CheckoutCubit } from './CheckoutCubit';

function CheckoutPanel({ label }: { label: string }) {
  const [state, checkout] = useBloc(CheckoutCubit);

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name={label} />
        <div className="flex-between">
          <h3>{label}</h3>
          <Badge variant={state.status === 'placed' ? 'success' : 'default'}>
            {state.status}
          </Badge>
        </div>

        <div className="counter-display">{state.items}</div>

        <div className="counter-controls">
          <Button onClick={checkout.addItem}>+ Item</Button>
          <Button onClick={checkout.removeItem}>− Item</Button>
          <Button
            variant="primary"
            onClick={() => void checkout.placeOrder()}
            disabled={!checkout.canSubmit}
          >
            Place order
          </Button>
        </div>

        {state.error && <p className="text-xs text-muted">{state.error}</p>}
      </div>
    </Card>
  );
}

function IsolatedCheckout() {
  // A registry of its own: this subtree shares nothing with the page above it.
  // The same trick isolates tests, SSR requests, and micro-frontends.
  const registry = useMemo(() => new StateContainerRegistry(), []);

  return (
    <RegistryProvider registry={registry}>
      <CheckoutPanel label="Isolated (own registry)" />
    </RegistryProvider>
  );
}

export function TestingDemo() {
  return (
    <ExampleLayout
      title="Testing"
      description="Blocs are plain classes, so they test without React. The helpers in @blac/core/testing stub an instance, pin its state, and swap a method; RegistryProvider scopes a whole subtree to its own registry — the same isolation each test gets."
      features={[
        'blacTestSetup() swaps the registry per test so instances never leak',
        'createCubitStub() builds a real instance with pinned state and mocked methods',
        'withBlocState() / withBlocMethod() patch the instance ensure() will hand out',
        'RegistryProvider scopes a subtree — used here to isolate two live panels',
      ]}
    >
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <CheckoutPanel label="Global registry" />
          <IsolatedCheckout />
        </div>

        <Card>
          <h4>Both panels use the same class</h4>
          <p className="text-small text-muted">
            Neither passes <code>args</code>, so both resolve to the{' '}
            <code>default</code> key — yet they never share state, because the
            right-hand subtree resolves against its own{' '}
            <code>StateContainerRegistry</code>. Add items on one side and the
            other stays put.
          </p>
        </Card>

        <Card>
          <h4>The same cubit under test</h4>
          <p className="text-small text-muted">
            <code>CheckoutCubit.test.ts</code> sits next to this file and covers
            the cases worth pinning: an empty cart cannot submit, a rejected
            payment lands in <code>failed</code>, and an overridden method is
            what <code>ensure()</code> hands back. No renderer, no DOM.
          </p>
          <pre className="code-block">
            <code>{`blacTestSetup();

it('blocks submitting an empty cart', () => {
  const cubit = withBlocState(CheckoutCubit, { items: 0 });
  expect(cubit.canSubmit).toBe(false);
});`}</code>
          </pre>
        </Card>
      </section>
    </ExampleLayout>
  );
}

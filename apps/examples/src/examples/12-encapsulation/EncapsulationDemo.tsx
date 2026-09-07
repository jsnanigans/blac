import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import {
  Card,
  Button,
  Alert,
  Badge,
  RenderCounter,
} from '../../shared/components';
import { AccountContainer } from './AccountContainer';
import { LooseAccountCubit } from './LooseAccountCubit';

function GuardedAccount() {
  const [state, account] = useBloc(AccountContainer);

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="GuardedAccount" />
        <div className="flex-between">
          <h3>StateContainer</h3>
          <Badge variant="success">Guarded</Badge>
        </div>

        <div className="counter-display">{account.balance}</div>

        <div className="counter-controls">
          <Button onClick={() => account.deposit(2_500)}>+ $25</Button>
          <Button onClick={() => account.withdraw(2_500)}>− $25</Button>
          <Button variant="ghost" onClick={() => account.withdraw(100_000)}>
            Overdraw $1000
          </Button>
        </div>

        {state.lastError && <Alert variant="danger">{state.lastError}</Alert>}

        <p className="text-xs text-muted">
          The overdraw is rejected by <code>withdraw()</code>. There is no way
          to bypass it — <code>patch</code> is protected.
        </p>
      </div>
    </Card>
  );
}

function LooseAccount() {
  const [state, account] = useBloc(LooseAccountCubit);

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="LooseAccount" />
        <div className="flex-between">
          <h3>Cubit</h3>
          <Badge variant="warning">Caller-driven</Badge>
        </div>

        <div className="counter-display">
          ${(state.balanceCents / 100).toFixed(2)}
        </div>

        <div className="counter-controls">
          <Button
            onClick={() =>
              account.patch({ balanceCents: state.balanceCents + 2_500 })
            }
          >
            + $25
          </Button>
          <Button
            onClick={() =>
              account.patch({ balanceCents: state.balanceCents - 2_500 })
            }
          >
            − $25
          </Button>
          <Button
            variant="ghost"
            onClick={() => account.patch({ balanceCents: -100_000 })}
          >
            Force −$1000
          </Button>
        </div>

        <p className="text-xs text-muted">
          Nothing stops the caller from writing a negative balance. That is the
          trade — and sometimes exactly what you want.
        </p>
      </div>
    </Card>
  );
}

export function EncapsulationDemo() {
  return (
    <ExampleLayout
      title="StateContainer vs Cubit"
      description="The same account modelled twice. StateContainer keeps mutation protected so invariants hold; Cubit publishes emit/patch/update so the caller owns transitions. Picking the right base class is the first design decision in a BlaC app."
      features={[
        'StateContainer keeps emit / patch / update protected',
        'Cubit re-declares all three as public',
        'Invariants (no negative balance) survive only in the guarded version',
        'Both expose computed getters the same way',
      ]}
    >
      <section className="stack-lg">
        <div className="grid grid-cols-2 gap-md">
          <GuardedAccount />
          <LooseAccount />
        </div>

        <Card>
          <h4>Which one should I extend?</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>StateContainer</strong> — the default. Business logic
              lives in the class and every transition goes through a method you
              wrote. If a rule must always hold, it belongs here.
            </p>
            <p>
              <strong>Cubit</strong> — when the caller legitimately owns the
              transition: test helpers, DevTools time-travel, benchmarks, or a
              container that really is a plain typed bag of state.
            </p>
            <p>
              Both share one implementation; <code>Cubit</code> only widens the
              visibility of three methods. Switching later is a one-word change.
            </p>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}

import { ExampleLayout } from '../../shared/ExampleLayout';
import { FxTicker } from './FxTicker';
import { CartEditor } from './CartEditor';
import { PromoPicker } from './PromoPicker';
import { Receipt } from './Receipt';

export function CrossBlocDemo() {
  return (
    <ExampleLayout
      title="Cross-Bloc Tracking"
      description="A live pricing engine. The receipt derives the final total from three independently-owned blocs — an FX market feed, the cart, and the membership tier — yet subscribes to only one. Cross-bloc .track() wires the reactivity for you."
      features={[
        'depend().track() inside a getter',
        'One useBloc, three live sources',
        'Transitive dep-getter tracking',
        'Conditional (dynamic) dependencies',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>The receipt subscribes to one bloc</h2>
          <p className="text-muted">
            <code>Receipt</code> calls <code>useBloc(CheckoutBloc)</code> and
            nothing else. Edit the cart, change your membership, or just watch
            the FX feed tick — the total stays correct because{' '}
            <code>checkout.receipt</code> reads each dependency through{' '}
            <code>this.&lt;handle&gt;.track()</code> during render. The render
            badge (top-right of each card) shows exactly which components woke.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <Receipt />
          <FxTicker />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <CartEditor />
          <PromoPicker />
        </div>
      </section>

      <section className="stack-md">
        <h2>Why this is powerful</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>No prop or context plumbing.</strong> The view never
            imports <code>FxRateBloc</code>, <code>CartBloc</code>, or{' '}
            <code>PromoBloc</code>. The dependency graph lives in the blocs, not
            the component tree — refactor the derivation without touching a
            single component.
          </p>
          <p>
            • <strong>Transitive getters.</strong> The receipt reads{' '}
            <code>cartBloc.subtotalEur</code>, a getter on the cart that reads
            the cart's own state. Tracking follows through, so adding a line
            item wakes a component that only knows about{' '}
            <code>CheckoutBloc</code>.
          </p>
          <p>
            • <strong>Path-scoped.</strong> The cart and membership panels hold
            still while the FX feed ticks — only components whose tracked slice
            actually changed re-render. Compare the badge counts as the rate
            updates.
          </p>
          <p>
            • <strong>Dynamic dependencies.</strong> Hit <em>Freeze FX</em>. The
            getter stops calling <code>fx.track()</code>, so the subscription is
            dropped on the next render and rate ticks no longer reach the
            receipt (its badge stops bumping). Resume to re-subscribe — the
            graph is rebuilt every render.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}

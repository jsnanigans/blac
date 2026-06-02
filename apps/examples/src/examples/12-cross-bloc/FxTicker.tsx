import { useBloc } from '@blac/react';
import { Card, Badge, RenderCounter } from '../../shared/components';
import { FxRateBloc } from './FxRateBloc';

/**
 * Owns the FX feed's lifecycle (start on mount, stop on unmount) and shows the
 * live rate. This is the ONLY component that subscribes to FxRateBloc — yet the
 * Receipt stays in sync with it through CheckoutBloc's `.track()`.
 */
export function FxTicker() {
  const [fx] = useBloc(FxRateBloc, {
    onMount: (bloc) => bloc.start(),
    onUnmount: (bloc) => bloc.stop(),
  });

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="FxTicker" />
        <div className="flex-between">
          <h3>FX feed · EUR→USD</h3>
          <Badge variant="success">live</Badge>
        </div>
        <div className="counter-display">{fx.usdPerEur.toFixed(4)}</div>
        <p className="text-xs text-muted">
          tick #{fx.ticks} · updates every 1.5s
        </p>
      </div>
    </Card>
  );
}

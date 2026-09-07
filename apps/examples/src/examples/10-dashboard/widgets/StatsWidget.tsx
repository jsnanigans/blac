import { useBloc } from '@blac/react';
import { StatsCubit } from '../StatsCubit';
import { Button, RenderCounter, StatCard } from '../../../shared/components';

export function StatsWidget() {
  const [state, bloc] = useBloc(StatsCubit);

  return (
    <div className="widget" style={{ position: 'relative' }}>
      <RenderCounter name="StatsWidget" />
      <h3>Dashboard Stats</h3>
      <div className="stats-grid">
        <StatCard label="Visitors" value={state.visitors.toLocaleString()} />
        <StatCard label="Revenue" value={bloc.formattedRevenue} />
        <StatCard label="Orders" value={state.orders.toLocaleString()} />
      </div>
      <p className="text-xs text-muted">
        <code>formattedRevenue</code> reaches ThemeCubit via{' '}
        <code>depend().track()</code> — toggle Mode and the currency prefix
        changes here, without this widget calling{' '}
        <code>useBloc(ThemeCubit)</code>
      </p>
      <Button
        variant="ghost"
        onClick={bloc.simulateUpdate}
        style={{ alignSelf: 'flex-start' }}
      >
        Simulate Update
      </Button>
    </div>
  );
}

import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';
import { Card, Button, Badge, RenderCounter } from '../../shared/components';

interface CounterViewProps {
  label: string;
  instanceKey?: string;
}

export function CounterView({ label, instanceKey }: CounterViewProps) {
  const [state, counter] = useBloc(CounterBloc, { instanceId: instanceKey });

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="CounterView" />
        <div className="flex-between">
          <h3>{label}</h3>
          <Badge variant={instanceKey ? 'primary' : 'default'}>
            {instanceKey ? 'Isolated' : 'Shared'}
          </Badge>
        </div>

        <div className="counter-display">{state.count}</div>

        <div className="counter-controls">
          <Button onClick={counter.decrement}>−</Button>
          <Button onClick={counter.increment} variant="primary">
            +
          </Button>
          <Button onClick={counter.reset} variant="ghost">
            Reset
          </Button>
        </div>

        <p className="text-xs text-muted">
          Instance: {instanceKey || 'default (shared)'}
        </p>
      </div>
    </Card>
  );
}

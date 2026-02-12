import { useBloc } from '@blac/react';
import { FormCubit } from './FormCubit';
import { RenderCounter } from '../../shared/components';

export function FormProgress({ instanceId }: { instanceId: string }) {
  const [, bloc] = useBloc(FormCubit, {
    instanceId,
    dependencies: (_state, b) => [b.completionPercent],
  });

  const percent = bloc.completionPercent;

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="FormProgress" />
      <div className="stack-xs">
        <div className="flex-between">
          <span className="text-small text-bold">Progress</span>
          <span className="text-small text-muted">{percent}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted">
          Only re-renders when the completion percentage changes, not on every
          keystroke.
        </p>
      </div>
    </div>
  );
}

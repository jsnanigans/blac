import React, { useRef, useEffect, useState } from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';
import { ComponentCard } from './ComponentCard';

export function UnoptimizedCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  // Tracks a property that changes on every state update
  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.state.lastUpdated],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="⚠️"
      title="Unoptimized"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[lastUpdated] - changes every time"
      variant="warning"
    >
      <div className="space-y-1">
        <div className="text-sm font-mono text-xs">
          {new Date(state.lastUpdated).toLocaleTimeString()}
        </div>
        <div className="text-xs text-red-600 font-semibold">
          ❌ Re-renders on EVERY state change
        </div>
      </div>
    </ComponentCard>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';
import { ComponentCard } from './ComponentCard';

export function AutomaticTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit);
  // No dependencies - proxy automatically tracks accessed properties

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="🤖"
      title="Automatic Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="state.user.firstName (auto-detected)"
    >
      <div className="text-2xl font-bold">{state.user.firstName}</div>
      <div className="text-sm text-gray-500 mt-2">
        Only re-renders when firstName is accessed and changed
      </div>
    </ComponentCard>
  );
}

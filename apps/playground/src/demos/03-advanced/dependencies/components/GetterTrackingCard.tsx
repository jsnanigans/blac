import React, { useRef, useEffect, useState } from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';
import { ComponentCard } from './ComponentCard';

export function GetterTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [, cubit] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.fullName, cubit.followerRatio],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="⚡"
      title="Getter Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[cubit.fullName, cubit.followerRatio]"
    >
      <div className="space-y-2">
        <div className="text-xl font-bold">{cubit.fullName}</div>
        <div className="text-sm text-gray-600">
          Follower Ratio: {cubit.followerRatio}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Re-renders only when COMPUTED values change
        </div>
      </div>
    </ComponentCard>
  );
}

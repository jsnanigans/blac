import React, { useRef, useEffect, useState } from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';
import { ComponentCard } from './ComponentCard';

export function BroadTrackingCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [cubit.state.stats],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="🔄"
      title="Broad Tracking"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[entire stats object]"
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-2xl font-bold">{state.stats.posts}</div>
          <div className="text-xs text-gray-600">Posts</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{state.stats.followers}</div>
          <div className="text-xs text-gray-600">Followers</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{state.stats.following}</div>
          <div className="text-xs text-gray-600">Following</div>
        </div>
      </div>
      <div className="text-xs text-orange-600 mt-2">
        ⚠️ Re-renders on ANY stats change
      </div>
    </ComponentCard>
  );
}

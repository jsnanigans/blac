import React, { useRef, useEffect, useState } from 'react';
import { useBloc } from '@blac/react';
import { ProfileCubit } from '../ProfileCubit';
import { ComponentCard } from './ComponentCard';

export function ManualDependenciesCard() {
  const renderCount = useRef(0);
  const [justRendered, setJustRendered] = useState(false);

  const [state] = useBloc(ProfileCubit, {
    dependencies: (cubit) => [
      cubit.state.user.email,
      cubit.state.settings.theme,
    ],
  });

  useEffect(() => {
    renderCount.current++;
    setJustRendered(true);
    const timer = setTimeout(() => setJustRendered(false), 600);
    return () => clearTimeout(timer);
  });

  return (
    <ComponentCard
      icon="📝"
      title="Manual Dependencies"
      renderCount={renderCount.current}
      justRendered={justRendered}
      trackedProperties="[email, theme]"
    >
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-semibold">Email:</span> {state.user.email}
        </div>
        <div className="text-sm">
          <span className="font-semibold">Theme:</span>{' '}
          <span
            className={`px-2 py-1 rounded ${
              state.settings.theme === 'light'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-800 text-white'
            }`}
          >
            {state.settings.theme}
          </span>
        </div>
      </div>
    </ComponentCard>
  );
}

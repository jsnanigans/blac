import React, {
  Profiler,
  useCallback,
  useImperativeHandle,
  useRef,
  forwardRef,
} from 'react';
import type { ProfilerMetric } from '../shared/types';

export interface ProfilerHandle {
  getMetrics: () => ProfilerMetric[];
  reset: () => void;
}

interface Props {
  id: string;
  children: React.ReactNode;
}

export const ProfilerWrapper = forwardRef<ProfilerHandle, Props>(
  ({ id, children }, ref) => {
    const metricsRef = useRef<ProfilerMetric[]>([]);

    const onRender = useCallback(
      (
        profilerId: string,
        phase: ProfilerMetric['phase'],
        actualDuration: number,
        baseDuration: number,
        startTime: number,
        commitTime: number,
      ) => {
        metricsRef.current.push({
          id: profilerId,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
        });
      },
      [],
    );

    useImperativeHandle(ref, () => ({
      getMetrics: () => metricsRef.current,
      reset: () => {
        metricsRef.current = [];
      },
    }));

    return (
      <Profiler id={id} onRender={onRender}>
        {children}
      </Profiler>
    );
  },
);

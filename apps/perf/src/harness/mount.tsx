import React, { Profiler, type ProfilerOnRenderCallback } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { drainMicrotasks } from './measure';

/** Sums React Profiler `actualDuration` over every commit since `reset`. */
export class RenderTimer {
  total = 0;
  commits = 0;

  onRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
    this.total += actualDuration;
    this.commits++;
  };

  reset(): void {
    this.total = 0;
    this.commits = 0;
  }
}

export interface Mounted<A> {
  api: A;
  timer: RenderTimer;
  unmount: () => Promise<void>;
}

/**
 * Renders a benchmark into its own React root, so dashboard updates (progress
 * text, results) never re-render or interleave with the measured tree.
 */
export async function mount<A>(
  host: HTMLElement,
  render: (onReady: (api: A) => void) => React.ReactNode,
): Promise<Mounted<A>> {
  const timer = new RenderTimer();
  const root = createRoot(host);
  let api: A | undefined;
  flushSync(() =>
    root.render(
      <Profiler id="bench" onRender={timer.onRender}>
        {render((a) => {
          api = a;
        })}
      </Profiler>,
    ),
  );
  await drainMicrotasks();
  if (api === undefined) {
    root.unmount();
    throw new Error('Benchmark did not call onReady after mounting');
  }
  return {
    api,
    timer,
    unmount: async () => {
      root.unmount();
      await drainMicrotasks();
    },
  };
}

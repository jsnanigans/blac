import { flushSync } from 'react-dom';

/**
 * Runs every queued microtask chain. Store notifications (Blac flushes on a
 * microtask) and React's sync-lane render, commit and passive effects all run
 * on microtasks, so nothing rendered by the trigger is left after this.
 */
export async function drainMicrotasks(): Promise<void> {
  for (let i = 0; i < 32; i++) await Promise.resolve();
}

/**
 * Milliseconds from the trigger to the committed DOM. Style, layout and paint
 * are left out: they depend only on the resulting DOM, which is the same for
 * every library, and waiting for the next frame would add up to a frame of
 * vsync phase to every sample.
 */
export async function measure(trigger: () => void): Promise<number> {
  const start = performance.now();
  // Makes a plain `setState` (React Context) render synchronously, like a
  // store update does.
  flushSync(trigger);
  await drainMicrotasks();
  return performance.now() - start;
}

/** Lets the browser paint and idle between samples. */
export async function settle(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0)),
  );
  // Present when Chrome runs with `--js-flags=--expose-gc`.
  globalThis.gc?.();
}

/** Yields so progress text can render between long synchronous runs. */
export const yieldToUI = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

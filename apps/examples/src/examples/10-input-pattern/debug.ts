/**
 * Tiny debug layer for the input-pattern example.
 *
 * Enable in the browser console with:  localStorage.setItem('ip-debug', '1')
 * (then reload). Disable with:          localStorage.removeItem('ip-debug')
 *
 * On by default in dev so the freeze investigation has a trail. Every logged
 * event also bumps a counter exposed on `window.__IP_DEBUG__` so you can inspect
 * rates from the console even if the UI is busy:
 *
 *     __IP_DEBUG__.counts            // { 'CanvasCubit.start': 3, ... }
 *     __IP_DEBUG__.reset()
 */
const enabled = (): boolean => {
  if (typeof localStorage === 'undefined') return true;
  const v = localStorage.getItem('ip-debug');
  return v === null ? true : v === '1';
};

interface DebugBag {
  counts: Record<string, number>;
  reset(): void;
}

const bag: DebugBag = {
  counts: {},
  reset() {
    bag.counts = {};
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { __IP_DEBUG__: DebugBag }).__IP_DEBUG__ = bag;
}

/** Log + count an event. Cheap no-op when disabled. */
export function dbg(event: string, detail?: unknown): void {
  bag.counts[event] = (bag.counts[event] ?? 0) + 1;
  if (!enabled()) return;
  console.debug(
    `[ip] ${event} #${bag.counts[event]}`,
    detail === undefined ? '' : detail,
  );
}

/** Read the current count for an event (for on-screen readouts). */
export function dbgCount(event: string): number {
  return bag.counts[event] ?? 0;
}

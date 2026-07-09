export interface DevStatsSnapshot {
  bodyExecs: number;
  patches: number;
}

let bodyExecs = 0;
let patches = 0;
let pulsesEnabled = true;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const devStats = {
  bumpBody(): void {
    bodyExecs++;
    notify();
  },
  bumpPatch(count = 1): void {
    patches += count;
    notify();
  },
  reset(): void {
    bodyExecs = 0;
    patches = 0;
    notify();
  },
  arePulsesOn(): boolean {
    return pulsesEnabled;
  },
  togglePulses(): void {
    pulsesEnabled = !pulsesEnabled;
    notify();
  },
  snapshot(): DevStatsSnapshot {
    return { bodyExecs, patches };
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

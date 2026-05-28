import type { Space } from './space';
import type { Scheduler } from './scheduler';

export class DirtyChannel<Region> {
  constructor(_space: Space<Region>, _scheduler: Scheduler) {
    throw new Error('DirtyChannel: not implemented (see plans/dirtytalk-engine/01-dirty-channel.md)');
  }

  mark(_r: Region): void { throw new Error('not implemented'); }

  subscribe(
    _interest: () => Region,
    _cb: (dirty: Region) => void,
  ): () => void {
    throw new Error('not implemented');
  }
}

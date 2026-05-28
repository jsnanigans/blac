import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';
import type { ConsumerId } from './types';
import type { Scheduler } from '@dirtytalk/engine';

export interface StructuralContainerOptions {
  scheduler?: Scheduler;
}

export abstract class StructuralContainer<S> {
  constructor(_initial: S, _options?: StructuralContainerOptions) {
    throw new Error('StructuralContainer: not implemented (Phase 3)');
  }

  get state(): S {
    throw new Error('StructuralContainer.state: not implemented (Phase 3)');
  }

  get interner(): PathInterner {
    throw new Error('StructuralContainer.interner: not implemented (Phase 3)');
  }

  emit(_next: S): void {
    throw new Error('StructuralContainer.emit: not implemented (Phase 3)');
  }
  patch(_partial: Partial<S>): void {
    throw new Error('StructuralContainer.patch: not implemented (Phase 3)');
  }
  update(_fn: (state: S) => S): void {
    throw new Error('StructuralContainer.update: not implemented (Phase 3)');
  }

  registerConsumerPaths(_id: ConsumerId, _paths: PathSet): void {
    throw new Error(
      'StructuralContainer.registerConsumerPaths: not implemented (Phase 3)',
    );
  }
  unregisterConsumer(_id: ConsumerId): void {
    throw new Error(
      'StructuralContainer.unregisterConsumer: not implemented (Phase 3)',
    );
  }
}

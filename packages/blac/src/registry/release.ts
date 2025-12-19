import { globalRegistry } from '../core/StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

export function release<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  forceDispose = false,
): void {
  globalRegistry.release(BlocClass, instanceKey, forceDispose);
}

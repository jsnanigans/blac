import { getRegistry } from './config';
import type { StateContainerConstructor } from '../types/utilities';

export function release<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  forceDispose = false,
  refId?: string,
): void {
  getRegistry().release(BlocClass, instanceKey, forceDispose, refId);
}

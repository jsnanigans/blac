import { globalRegistry } from '../core/StateContainerRegistry';
import type { StateContainerConstructor } from '../types/utilities';

export function clear<T extends StateContainerConstructor>(BlocClass: T): void {
  globalRegistry.clear(BlocClass);
}

export function clearAll(): void {
  globalRegistry.clearAll();
}

export function register<T extends StateContainerConstructor>(
  BlocClass: T,
): void {
  globalRegistry.register(BlocClass);
}

import { getRegistry } from './config';
import type { StateContainerConstructor } from '../types/utilities';

export function clear<T extends StateContainerConstructor>(BlocClass: T): void {
  getRegistry().clear(BlocClass);
}

export function clearAll(): void {
  getRegistry().clearAll();
}

export function register<T extends StateContainerConstructor>(
  BlocClass: T,
): void {
  getRegistry().register(BlocClass);
}

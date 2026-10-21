import { getRegistry } from './config';
import type { StateContainer } from '../core/StateContainer';
import type { StateContainerConstructor } from '../types/utilities';

export function clear<T extends StateContainerConstructor>(BlocClass: T): void {
  getRegistry().clear(BlocClass);
}

export function clearAll(): void {
  getRegistry().clearAll();
}

export function clearWhere(
  predicate: (instance: StateContainer<any, any, any>) => boolean,
): void {
  getRegistry().clearWhere(predicate);
}

/**
 * @public
 */
export function register<T extends StateContainerConstructor>(
  BlocClass: T,
): void {
  getRegistry().register(BlocClass);
}

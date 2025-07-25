import { BlocBase } from './BlocBase';
import { BlocConstructor } from './types';

/**
 * Manages shared instances of Blocs across the application
 */
export class BlocInstanceManager {
  private static instance: BlocInstanceManager;
  private instances = new Map<string, BlocBase<any>>();

  private constructor() {}

  static getInstance(): BlocInstanceManager {
    if (!BlocInstanceManager.instance) {
      BlocInstanceManager.instance = new BlocInstanceManager();
    }
    return BlocInstanceManager.instance;
  }

  get<T extends BlocBase<any>>(
    blocConstructor: BlocConstructor<T>,
    id: string,
  ): T | undefined {
    const key = this.generateKey(blocConstructor, id);
    return this.instances.get(key) as T | undefined;
  }

  set<T extends BlocBase<any>>(
    blocConstructor: BlocConstructor<T>,
    id: string,
    instance: T,
  ): void {
    const key = this.generateKey(blocConstructor, id);
    this.instances.set(key, instance);
  }

  delete<T extends BlocBase<any>>(
    blocConstructor: BlocConstructor<T>,
    id: string,
  ): boolean {
    const key = this.generateKey(blocConstructor, id);
    return this.instances.delete(key);
  }

  has<T extends BlocBase<any>>(
    blocConstructor: BlocConstructor<T>,
    id: string,
  ): boolean {
    const key = this.generateKey(blocConstructor, id);
    return this.instances.has(key);
  }

  clear(): void {
    this.instances.clear();
  }

  private generateKey<T extends BlocBase<any>>(
    blocConstructor: BlocConstructor<T>,
    id: string,
  ): string {
    return `${blocConstructor.name}:${id}`;
  }
}

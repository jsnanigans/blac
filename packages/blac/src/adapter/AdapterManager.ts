import { BlocBase } from '../BlocBase';
import { BlocConstructor } from '../types';
import { StateAdapter, StateAdapterOptions } from './StateAdapter';

/**
 * Manages shared StateAdapter instances
 */
export class AdapterManager {
  private static instance: AdapterManager;
  private adapters = new Map<string, StateAdapter<any>>();
  
  private constructor() {}
  
  static getInstance(): AdapterManager {
    if (!AdapterManager.instance) {
      AdapterManager.instance = new AdapterManager();
    }
    return AdapterManager.instance;
  }
  
  getOrCreateAdapter<TBloc extends BlocBase<any>>(
    options: StateAdapterOptions<TBloc>
  ): StateAdapter<TBloc> {
    const { blocConstructor, blocId, isolated } = options;
    
    // For isolated instances, always create a new adapter
    if (isolated || blocConstructor.isolated) {
      return new StateAdapter(options);
    }
    
    // For shared instances, use a consistent key
    const key = this.generateKey(blocConstructor, blocId);
    
    const existingAdapter = this.adapters.get(key);
    if (existingAdapter) {
      return existingAdapter as StateAdapter<TBloc>;
    }
    
    const newAdapter = new StateAdapter(options);
    this.adapters.set(key, newAdapter);
    
    return newAdapter;
  }
  
  removeAdapter<TBloc extends BlocBase<any>>(
    blocConstructor: BlocConstructor<TBloc>,
    blocId?: string
  ): boolean {
    const key = this.generateKey(blocConstructor, blocId);
    return this.adapters.delete(key);
  }
  
  private generateKey<TBloc extends BlocBase<any>>(
    blocConstructor: BlocConstructor<TBloc>,
    blocId?: string
  ): string {
    return `${blocConstructor.name}:${blocId || 'default'}`;
  }
  
  clear(): void {
    this.adapters.forEach(adapter => adapter.dispose());
    this.adapters.clear();
  }
}
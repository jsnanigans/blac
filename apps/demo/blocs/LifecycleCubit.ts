import { Cubit } from '@blac/core';

interface LifecycleState {
  status: string;
  data: string | null;
  mountTime: Date | null;
  unmountTime: Date | null;
}

export class LifecycleCubit extends Cubit<LifecycleState> {
  static isolated = true; // Typically, lifecycle actions are per-instance

  constructor() {
    super({
      status: 'Initial',
      data: null,
      mountTime: null,
      unmountTime: null,
    });
  }

  setMounted = () => {
    console.log('LifecycleCubit: Mounted');
    this.patch({
      status: 'Mounted',
      mountTime: new Date(),
    });
    // Simulate fetching data on mount
    setTimeout(() => {
      this.patch({ data: 'Data fetched on mount!' });
    }, 1000);
  };

  setUnmounted = () => {
    console.log('LifecycleCubit: Unmounted');
    this.patch({
      status: 'Unmounted',
      unmountTime: new Date(),
      data: 'Cleaned up data on unmount', // Example cleanup
    });
  };

  reset = () => {
    this.emit({
      status: 'Initial',
      data: null,
      mountTime: null,
      unmountTime: null,
    });
  }
} 
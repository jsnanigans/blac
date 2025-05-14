import { BlocBase } from './BlocBase';
import { BlacLifecycleEvent } from './Blac';

export interface BlacPlugin {
  name: string;

  onEvent<B extends BlacLifecycleEvent>(
    event: B,
    bloc: BlocBase<any>,
    params?: any,
  ): void;
}

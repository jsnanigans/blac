import { BlacLifecycleEvent } from './Blac';
import { BlocBase } from './BlocBase';

export interface BlacPlugin {
  name: string;

  onEvent(
    event: BlacLifecycleEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bloc: BlocBase<any>,
    params?: unknown,
  ): void;
}

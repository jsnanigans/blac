import { Cubit, Blac } from '@blac/core';

interface CounterState {
  count: number;
  instanceId: number;
}

let instanceCounter = 0;

export class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true; // Key feature for this demo

  constructor() {
    instanceCounter++;
    super({ count: 0, instanceId: instanceCounter });
    Blac.log(`KeepAliveCounterCubit instance ${this.state.instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
    Blac.log(
      `KeepAliveCounterCubit instance ${this.state.instanceId} incremented to ${this.state.count + 1}`,
    );
  };

  reset = () => {
    // Reset count but keep instanceId
    this.patch({ count: 0 });
    Blac.log(`KeepAliveCounterCubit instance ${this.state.instanceId} RESET.`);
  };

  // Linter has issues with onDispose override, so we'll skip it.
  // If it worked, it would look like this:
  // protected onDispose() {
  //   super.onDispose(); // Important to call super
  //   console.log(`KeepAliveCounterCubit instance ${this.state.instanceId} DISPOSED.`);
  // }
} 
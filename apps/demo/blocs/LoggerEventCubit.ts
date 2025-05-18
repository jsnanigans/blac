import { Cubit } from '@blac/core';

// Assuming BlacEvent and StateListener are available from @blac/core for the component-side usage
// For the Cubit itself, we'll keep it simple if imports are problematic for the linter.

interface LoggerEventState {
  message: string;
  count: number;
}

// This cubit is primarily for demonstrating event subscriptions.
// It could be shared or isolated depending on how it's used in the demo component.
// For simplicity in demonstrating .on(), we might use a shared instance.
export class LoggerEventCubit extends Cubit<LoggerEventState> {
  constructor() {
    super({
      message: 'Initial Message',
      count: 0,
    });
    // console.log(`LoggerEventCubit instance created.`); // Basic log if needed
  }

  updateMessage = (newMessage: string) => {
    // console.log('LoggerEventCubit: updateMessage called');
    this.patch({ message: newMessage });
  };

  incrementCount = () => {
    // console.log('LoggerEventCubit: incrementCount called');
    this.patch({ count: this.state.count + 1 });
  };

  // Optional: A method that doesn't change state, to observe if .on(BlacEvent.Action) would pick it up (it usually doesn't for Cubits)
  performSideEffectOnly = () => {
    // console.log(`LoggerEventCubit: performSideEffectOnly called. Current count: ${this.state.count}`);
  };

  // // Lifecycle hook example (if needed and works with linter)
  // protected onDispose() {
  //   super.onDispose();
  //   console.log('LoggerEventCubit disposed');
  // }
} 
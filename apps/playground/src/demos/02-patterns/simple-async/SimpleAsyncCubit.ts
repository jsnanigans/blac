import { Cubit } from '@blac/core';

export type AsyncState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: string };

export class SimpleAsyncCubit extends Cubit<AsyncState> {
  constructor() {
    super({ status: 'idle' });
  }

  fetchData = async (shouldFail: boolean = false): Promise<void> => {
    // Emit loading state
    this.emit({ status: 'loading' });

    try {
      // Simulate API call with 1.5 second delay
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) {
            reject(new Error('Network request failed'));
          } else {
            resolve();
          }
        }, 1500);
      });

      // Simulate successful data fetch
      const mockData = `Data fetched at ${new Date().toLocaleTimeString()}`;
      this.emit({ status: 'success', data: mockData });
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.emit({ status: 'error', error: errorMessage });
    }
  };

  retry = (): void => {
    // Simple retry - just calls fetchData again
    this.fetchData(false);
  };

  reset = (): void => {
    this.emit({ status: 'idle' });
  };
}
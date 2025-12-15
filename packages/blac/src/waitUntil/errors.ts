export class WaitUntilTimeoutError extends Error {
  constructor(timeout: number) {
    super(`waitUntil timed out after ${timeout}ms`);
    this.name = 'WaitUntilTimeoutError';
  }
}

export class WaitUntilAbortedError extends Error {
  constructor() {
    super('waitUntil was aborted');
    this.name = 'WaitUntilAbortedError';
  }
}

export class WaitUntilDisposedError extends Error {
  constructor(blocName: string) {
    super(`waitUntil failed: ${blocName} was disposed while waiting`);
    this.name = 'WaitUntilDisposedError';
  }
}

export interface Scheduler {
  request(flush: () => void): void;
  cancel?(): void;
}

const NOT_IMPLEMENTED = 'not implemented (see plans/dirtytalk-engine/01-schedulers.md)';

export class SyncScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
}

export class ManualScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  pump(): void { throw new Error(NOT_IMPLEMENTED); }
}

export class MicrotaskScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  cancel(): void { throw new Error(NOT_IMPLEMENTED); }
}

export class RAFScheduler implements Scheduler {
  request(_flush: () => void): void { throw new Error(NOT_IMPLEMENTED); }
  cancel(): void { throw new Error(NOT_IMPLEMENTED); }
}

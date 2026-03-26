import { StateContainer } from './StateContainer';
import { EMIT, UPDATE } from './symbols';

export abstract class Cubit<S extends object = any> extends StateContainer<S> {
  constructor(initialState: S) {
    super(initialState);
  }

  public emit(newState: S): void {
    this[EMIT](newState);
  }

  public update(updater: (current: S) => S): void {
    this[UPDATE](updater);
  }

  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    const current = this.state;
    let hasChanges = false;
    for (const key in partial) {
      if (!Object.is((current as any)[key], (partial as any)[key])) {
        hasChanges = true;
        break;
      }
    }
    if (hasChanges) {
      this.update((c) => ({ ...c, ...partial }) as S);
    }
  }) as S extends object ? (partial: Partial<S>) => void : never;
}

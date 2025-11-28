import { StateContainer } from './StateContainer';

export abstract class Cubit<S, P = undefined> extends StateContainer<S, P> {
  constructor(initialState: S) {
    super(initialState);
  }

  public emit(newState: S): void {
    super['emit'](newState);
  }

  public update(updater: (current: S) => S): void {
    super['update'](updater);
  }

  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    this.update((current) => ({ ...current, ...partial }) as S);
  }) as S extends object ? (partial: Partial<S>) => void : never;
}

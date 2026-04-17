import { StateContainer } from './StateContainer';
import { EMIT } from './symbols';

export abstract class Cubit<S extends object = any> extends StateContainer<S> {
  constructor(initialState: S) {
    super(initialState);
  }

  public emit(newState: S): void {
    this[EMIT](newState);
  }

  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    for (const key of Object.keys(partial as object)) {
      if (!Object.is((this.state as any)[key], (partial as any)[key])) {
        this[EMIT]({ ...this.state, ...partial } as S);
        return;
      }
    }
  }) as S extends object ? (partial: Partial<S>) => void : never;
}

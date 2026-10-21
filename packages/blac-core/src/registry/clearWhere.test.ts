import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { Cubit } from '../core/Cubit';
import { blac } from '../decorators';
import { acquire, clearAll, clearWhere, getAll, hasInstance } from './index';
import { getRegistry } from './config';

class UserCubit extends Cubit<{ n: number }, { userId: string }> {
  static key = (a: { userId: string }) => a.userId;
  constructor() {
    super({ n: 0 });
  }
}

@blac({ keepAlive: true })
class KeepAliveUserCubit extends Cubit<{ n: number }, { userId: string }> {
  static key = (a: { userId: string }) => a.userId;
  constructor() {
    super({ n: 0 });
  }
}

describe('clearWhere', () => {
  beforeEach(() => clearAll());

  it('disposes only instances matching the predicate, owned or not', () => {
    acquire(UserCubit, { args: { userId: 'a' } });
    acquire(UserCubit, { args: { userId: 'b' } });

    clearWhere((i) => i.args?.userId === 'a');

    expect(hasInstance(UserCubit, { args: { userId: 'a' } })).toBe(false);
    expect(hasInstance(UserCubit, { args: { userId: 'b' } })).toBe(true);
  });

  it('disposes keepAlive instances across classes', () => {
    acquire(UserCubit, { args: { userId: 'a' } });
    const kept = acquire(KeepAliveUserCubit, { args: { userId: 'a' } });

    clearWhere((i) => i.args?.userId === 'a');

    expect(kept.$blac.disposed).toBe(true);
    expect(getAll(UserCubit)).toHaveLength(0);
    expect(getAll(KeepAliveUserCubit)).toHaveLength(0);
  });

  it('resets everything with () => true while keeping registered types', () => {
    acquire(UserCubit, { args: { userId: 'a' } });
    acquire(KeepAliveUserCubit, { args: { userId: 'b' } });

    clearWhere(() => true);

    expect(getAll(UserCubit)).toHaveLength(0);
    expect(getAll(KeepAliveUserCubit)).toHaveLength(0);
    expect(getRegistry().getTypes()).toEqual(
      expect.arrayContaining([UserCubit, KeepAliveUserCubit]),
    );
  });
});

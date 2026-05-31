import { acquire, clearAll } from '../registry';
import { Cubit } from './Cubit';

class Loader extends Cubit<{ id: string | null }, { id: string }> {
  constructor() {
    super({ id: null });
  }
  initialized = 0;
  // Constant key: all args map to one instance, so distinct args resolve to
  // the same entry — the args-based equivalent of the old shared explicit key.
  static key = () => 'loader';
  protected init(args: { id: string }) {
    this.initialized++;
    this.emit({ id: args.id });
  }
}

afterEach(() => clearAll());

it('calls init once with args, before first read, and seeds state', () => {
  const a = acquire(Loader, { args: { id: 'abc' }, refId: 'r1' });
  expect(a.state.id).toBe('abc');
  expect(a.initialized).toBe(1);
});

it('does not re-init when the same key is acquired again', () => {
  const a = acquire(Loader, { args: { id: 'x' }, refId: 'r1' });
  const b = acquire(Loader, { args: { id: 'y' }, refId: 'r2' });
  expect(a).toBe(b);
  expect(b.initialized).toBe(1); // not re-run
});

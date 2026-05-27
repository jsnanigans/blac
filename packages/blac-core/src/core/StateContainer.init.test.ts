import { acquire, clearAll } from '../registry';
import { Cubit } from './Cubit';

class Loader extends Cubit<{ id: string | null }, { id: string }> {
  constructor() { super({ id: null }); }
  initialized = 0;
  protected init(args: { id: string }) { this.initialized++; this.emit({ id: args.id }); }
}

afterEach(() => clearAll());

it('calls init once with args, before first read, and seeds state', () => {
  const a = acquire(Loader, 'k1', 'r1', { id: 'abc' });
  expect(a.state.id).toBe('abc');
  expect(a.initialized).toBe(1);
});

it('does not re-init when the same key is acquired again', () => {
  const a = acquire(Loader, 'k2', 'r1', { id: 'x' });
  const b = acquire(Loader, 'k2', 'r2', { id: 'y' });
  expect(a).toBe(b);
  expect(b.initialized).toBe(1);   // not re-run
});

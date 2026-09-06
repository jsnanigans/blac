import { StructuralContainer, type DeepPartial } from './container';

// Test-only helper: republishes the protected mutators as public so empty
// test subclasses can be mutated externally, the same shape a real
// container-owning class would take.
export class TestContainer<S extends object> extends StructuralContainer<S> {
  override emit(next: S): void {
    super.emit(next);
  }
  override patch(partial: DeepPartial<S>): void {
    super.patch(partial);
  }
  override update(fn: (state: S) => S): void {
    super.update(fn);
  }
}

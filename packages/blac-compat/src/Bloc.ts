import { BlocBase } from './BlocBase';
import type { BlacEvent } from './BlacEvent';

/**
 * v1 event-driven `Bloc<E, S>` stub. No app code currently extends this; the
 * shim ships a stub that throws on `add()` so any new usage during the
 * migration window surfaces a clear error pointing at v2 `Cubit`.
 *
 * If you reach this error, migrate the class to extend `Cubit<S>` and replace
 * `this.add(event)` with direct state transitions / explicit methods.
 */
export abstract class Bloc<
  _E extends BlacEvent = BlacEvent,
  S extends object = object,
> extends BlocBase<S> {
  add(_event: _E): void {
    throw new Error(
      '[@9amhealth/blac-compat] `Bloc.add()` is not implemented. ' +
        'Event-driven `Bloc<E, S>` is unused in app code; migrate the class ' +
        'to extend `Cubit<S>` and replace event handling with explicit methods.',
    );
  }
}

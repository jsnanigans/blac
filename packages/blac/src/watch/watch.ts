import { ensure } from '../registry';
import type {
  StateContainerConstructor,
  ExtractState,
} from '../types/utilities';
import { BLAC_DEFAULTS } from '../constants';

const STOP = Symbol('watch.STOP');

const BLOC_REF_MARKER = Symbol('BlocRef');

export interface BlocRef<T extends StateContainerConstructor> {
  [BLOC_REF_MARKER]: true;
  blocClass: T;
  instanceId: string;
}

export function instance<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceId: string,
): BlocRef<T> {
  return {
    [BLOC_REF_MARKER]: true,
    blocClass: BlocClass,
    instanceId,
  };
}

function isBlocRef(input: unknown): input is BlocRef<StateContainerConstructor> {
  return (
    typeof input === 'object' &&
    input !== null &&
    BLOC_REF_MARKER in input
  );
}

type BlocInput = StateContainerConstructor | BlocRef<StateContainerConstructor>;

type ExtractStateFromInput<T> = T extends BlocRef<infer C>
  ? ExtractState<C>
  : T extends StateContainerConstructor
    ? ExtractState<T>
    : never;

type ExtractStates<T extends readonly BlocInput[]> = {
  [K in keyof T]: ExtractStateFromInput<T[K]>;
};

export interface WatchFn {
  <T extends readonly BlocInput[]>(
    blocs: T,
    callback: (states: ExtractStates<T>) => void | typeof STOP,
  ): () => void;

  STOP: typeof STOP;
}

const watchImpl = <T extends readonly BlocInput[]>(
  blocs: T,
  callback: (states: ExtractStates<T>) => void | typeof STOP,
): () => void => {
  const instances = blocs.map((input) => {
    if (isBlocRef(input)) {
      return ensure(input.blocClass, input.instanceId);
    }
    return ensure(input, BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY);
  });

  const getStates = (): ExtractStates<T> =>
    instances.map((inst) => inst.state) as ExtractStates<T>;

  let disposed = false;
  const unsubscribes: (() => void)[] = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    unsubscribes.forEach((unsub) => unsub());
  };

  const runCallback = () => {
    if (disposed) return;
    if (callback(getStates()) === STOP) {
      cleanup();
    }
  };

  for (const inst of instances) {
    unsubscribes.push(inst.subscribe(runCallback));
  }

  runCallback();

  return cleanup;
};

export const watch: WatchFn = Object.assign(watchImpl, { STOP });

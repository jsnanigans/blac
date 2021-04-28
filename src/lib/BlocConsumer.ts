import BlocBase from "./BlocBase";
import { BlocClass, ValueType } from "./types";

export interface ReactBlocOptions {
  /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
  debug?: boolean;
}

export type BlocObserverScope = "local" | "global" | "all";
type BlocObserver = [
  BlocClass<any>,
  (bloc: any, state: any) => unknown,
  BlocObserverScope
];

export class BlocConsumer {
  observer: null | ((bloc: BlocBase<any>, value: any) => void) = null;
  debug: boolean;
  readonly blocListGlobal: BlocBase<any>[];
  protected _blocMapLocal: Record<string, BlocBase<any>> = {};
  private blocObservers: BlocObserver[] = [];

  constructor(blocs: BlocBase<any>[], options: ReactBlocOptions = {}) {
    this.blocListGlobal = blocs;
    this.debug = options.debug || false;

    for (const b of blocs) {
      b.consumer = this;
      b.subscribe((v: any) => this.notify(b, v));
      b.onRegister?.(this);
    }
  }

  notify(bloc: BlocBase<any>, state: ValueType<any>): void {
    if (this.observer) {
      this.observer(bloc, state);
    }

    for (const [blocClass, callback, scope] of this.blocObservers) {
      const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
      const matchesScope =
        scope === "all" ||
        (isGlobal && scope === "global") ||
        (!isGlobal && scope === "local");
      if (matchesScope && bloc instanceof blocClass) {
        callback(bloc, state);
      }
    }
  }

  public addBlocObserver<T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    callback: (bloc: T, state: ValueType<T>) => unknown,
    scope: BlocObserverScope = "all"
  ) {
    this.blocObservers.push([blocClass, callback, scope]);
  }

  public addLocalBloc(key: string, bloc: BlocBase<any>) {
    this._blocMapLocal[key] = bloc;
    bloc.subscribe((v: any) => this.notify(bloc, v));
  }

  public removeLocalBloc(key: string) {
    const bloc = this._blocMapLocal[key];
    bloc.complete();
    delete this._blocMapLocal[key];
  }
}

import BlocBase from "./BlocBase";
import { BlocClass, ChangeEvent } from "./types";
import BlocObserver from "./BlocObserver";

export interface ReactBlocOptions {
  /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
  debug?: boolean;
}

export type BlocObserverScope = "local" | "global" | "all";
type BlocObserverList = [
  BlocClass<any>,
  (bloc: any, event: ChangeEvent<any>) => unknown,
  BlocObserverScope
];

export class BlocConsumer {
  observer: null | BlocObserver = null;
  debug: boolean;
  readonly blocListGlobal: BlocBase<any>[];
  protected _blocMapLocal: Record<string, BlocBase<any>> = {};
  private blocObservers: BlocObserverList[] = [];

  constructor(blocs: BlocBase<any>[], options: ReactBlocOptions = {}) {
    this.blocListGlobal = blocs;
    this.debug = options.debug || false;

    for (const b of blocs) {
      b.consumer = this;
      // b.subscribe((v: any) => this.notifyChange(b, v));
      b.onRegister?.(this);
    }
  }

  notifyChange(bloc: BlocBase<any>, state: any): void {
    if (this.observer?.addChange) {
      this.observer.addChange(bloc, state);
    }

    for (const [blocClass, callback, scope] of this.blocObservers) {
      const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
      const matchesScope =
        scope === "all" ||
        (isGlobal && scope === "global") ||
        (!isGlobal && scope === "local");
      if (matchesScope && bloc instanceof blocClass) {
        callback(bloc, {
          nextState: state,
          currentState: bloc.state
        });
      }
    }
  }

  notifyTransition(bloc: BlocBase<any>, state: any, event: any): void {
    if (this.observer?.addTransition) {
      this.observer.addTransition(bloc, state, event);
    }
  }

  public addBlocObserver<T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    callback: (bloc: T, event: ChangeEvent<T>) => unknown,
    scope: BlocObserverScope = "all"
  ) {
    this.blocObservers.push([blocClass, callback, scope]);
  }

  public addLocalBloc(key: string, bloc: BlocBase<any>) {
    this._blocMapLocal[key] = bloc;
    bloc.consumer = this;
  }

  public removeLocalBloc(key: string) {
    const bloc = this._blocMapLocal[key];
    bloc.complete();
    delete this._blocMapLocal[key];
  }
}

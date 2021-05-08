import BlocBase from "./BlocBase";
import { BlocClass, ChangeEvent, ValueType } from "./types";
import BlocObserver from "./BlocObserver";

export interface ReactBlocOptions {
  /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
  debug?: boolean;
}

export type BlocObserverScope = "local" | "global" | "all";
type BlocChangeObserverList = [
  BlocClass<any>,
  (bloc: any, event: ChangeEvent<any>) => unknown,
  BlocObserverScope
];

type BlocValueChangeObserverList = [
  BlocClass<any>,
  (bloc: any) => unknown,
  BlocObserverScope
];

export class BlocConsumer {
  observer: BlocObserver;
  public mocksEnabled = false;
  protected _blocMapLocal: Record<string, BlocBase<any>> = {};
  private blocListGlobal: BlocBase<any>[];
  private blocChangeObservers: BlocChangeObserverList[] = [];
  private blocValueChangeObservers: BlocValueChangeObserverList[] = [];
  private mockBlocs: BlocBase<any>[] = [];

  constructor(blocs: BlocBase<any>[]) {
    this.blocListGlobal = blocs;
    this.observer = new BlocObserver();

    for (const b of blocs) {
      b.consumer = this;
      b.onRegister?.(this);
    }
  }

  notifyChange(bloc: BlocBase<any>, state: any): void {
    this.observer.addChange(bloc, state);

    for (const [blocClass, callback, scope] of this.blocChangeObservers) {
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

  notifyValueChange(bloc: BlocBase<any>): void {
    for (const [blocClass, callback, scope] of this.blocValueChangeObservers) {
      const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
      const matchesScope =
        scope === "all" ||
        (isGlobal && scope === "global") ||
        (!isGlobal && scope === "local");
      if (matchesScope && bloc instanceof blocClass) {
        callback(bloc);
      }
    }
  }

  notifyTransition(bloc: BlocBase<any>, state: any, event: any): void {
    this.observer.addTransition(bloc, state, event);
  }

  public addBlocChangeObserver<T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    callback: (bloc: T, event: ChangeEvent<ValueType<T>>) => unknown,
    scope: BlocObserverScope = "all"
  ) {
    this.blocChangeObservers.push([blocClass, callback, scope]);
  }

  public addBlocValueChangeObserver<T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    callback: (bloc: T) => unknown,
    scope: BlocObserverScope = "all"
  ) {
    this.blocValueChangeObservers.push([blocClass, callback, scope]);
  }

  public addLocalBloc(key: string, bloc: BlocBase<any>) {
    this._blocMapLocal[key] = bloc;
    bloc.consumer = this;
    bloc.onRegister?.(this);
  }

  public removeLocalBloc(key: string) {
    const bloc = this._blocMapLocal[key];
    bloc.complete();
    delete this._blocMapLocal[key];
  }

  // TODO: Add direct unit tests for mocks
  public addBlocMock(bloc: BlocBase<any>): void {
    if (this.mocksEnabled) {
      this.mockBlocs = [bloc, ...this.mockBlocs];
    }
  }

  public resetMocks(): void {
    this.mockBlocs = [];
  }

  public getGlobalBloc(blocClass: BlocClass<any>): undefined | BlocBase<any> {
    return this.blocListGlobal.find(c => c instanceof blocClass)
  }

  protected getBlocInstance<T>(global: BlocBase<any>[], blocClass: BlocClass<T>): BlocBase<T> | undefined {
    if (this.mocksEnabled) {
      const mockedBloc = this.mockBlocs.find((c) => c instanceof blocClass)
      if (mockedBloc) {
        return mockedBloc
      }
    }


    return global.find((c) => c instanceof blocClass);
  }
}

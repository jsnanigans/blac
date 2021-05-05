import BlocBase from "./BlocBase";
import { BlocClass, ChangeEvent, ValueType } from "./types";
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
  observer: BlocObserver;
  debug: boolean;
  public mocksEnabled = false;
  protected _blocMapLocal: Record<string, BlocBase<any>> = {};
  private blocListGlobal: BlocBase<any>[];
  private blocObservers: BlocObserverList[] = [];
  private mockBlocs: BlocBase<any>[] = [];

  constructor(blocs: BlocBase<any>[], options: ReactBlocOptions = {}) {
    this.blocListGlobal = blocs;
    this.debug = options.debug || false;
    this.observer = new BlocObserver();

    for (const b of blocs) {
      b.consumer = this;
      // b.subscribe((v: any) => this.notifyChange(b, v));
      b.onRegister?.(this);
    }
  }

  notifyChange(bloc: BlocBase<any>, state: any): void {
    this.observer.addChange(bloc, state);

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
    this.observer.addTransition(bloc, state, event);
  }

  public addBlocObserver<T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    callback: (bloc: T, event: ChangeEvent<ValueType<T>>) => unknown,
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

import Cubit from "../lib/Cubit";
import { BlocClass } from "../lib/types";
import { BlocObserverScope } from "../lib/BlocConsumer";
import Bloc from "../lib/Bloc";

export class Test1 extends Cubit<number> {
  constructor(options: { register?: () => void } = {}) {
    super(1);

    if (options.register) {
      this.onRegister = options.register;
    }
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

export class Listener extends Cubit<number> {
  constructor(
    notify: (bloc: any, state: any) => void,
    listenFor: BlocClass<any>,
    scope?: BlocObserverScope
  ) {
    super(1);

    this.onRegister = (consumer) => {
      consumer.addBlocObserver(
        listenFor,
        (bloc, state) => {
          notify(bloc, state);
        },
        scope
      );
    };
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}


export enum AuthEvent {
  authenticated = "authenticated",
  unauthenticated = "unauthenticated",
}

export class TestBloc extends Bloc<AuthEvent, boolean> {
  constructor() {
    super(false);

    this.mapEventToState = (event) => {
      switch (event) {
        case AuthEvent.unauthenticated:
          return false;
        case AuthEvent.authenticated:
          return true;
      }
    };
  }
}
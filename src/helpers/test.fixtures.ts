import Cubit from "../lib/Cubit";
import { BlocClass } from "../lib/types";
import { BlocObserverScope } from "../lib/BlocConsumer";
import Bloc from "../lib/Bloc";

export class Test1 extends Cubit<number> {
  constructor(options: { register?: () => void } = {}) {
    super(1);

    if (options.register) {
      this.addRegisterListener(options.register);
    }
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

export class ChangeListener extends Cubit<number> {
  constructor(
    notify: (bloc: any, state: any) => void,
    listenFor: BlocClass<any>,
    scope?: BlocObserverScope
  ) {
    super(1);

    this.addRegisterListener((consumer) => {
      consumer.addBlocChangeObserver(
        listenFor,
        (bloc, state) => {
          notify(bloc, state);
        },
        scope
      );
    });
  }
}

export class ValueChangeListener extends Cubit<number> {
  constructor(
    notify: (state: any) => void,
    listenFor: BlocClass<any>,
    scope?: BlocObserverScope
  ) {
    super(1);

    this.addRegisterListener((consumer) => {
      consumer.addBlocValueChangeObserver(
        listenFor,
        (state) => {
          notify(state);
        },
        scope
      );
    });
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
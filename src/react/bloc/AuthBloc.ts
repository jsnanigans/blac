import Bloc from "../../lib/Bloc";
import CounterCubit from "./CounterCubit";

export enum AuthEvent {
  unknown = "unknown",
  authenticated = "authenticated",
  unauthenticated = "unauthenticated",
}

export default class AuthBloc extends Bloc<AuthEvent, boolean> {
  constructor() {
    super(false, {
      persistKey: "auth"
    });

    this.mapEventToState = (event) => {
      switch (event) {
        case AuthEvent.unknown:
          return false;
        case AuthEvent.unauthenticated:
          return false;
        case AuthEvent.authenticated:
          return true;
      }
    };

    this.addRegisterListener((consumer) => {
      consumer.addBlocChangeObserver<CounterCubit>(CounterCubit, (bloc, state) => {
        if (state.nextState === 10) {
          this.add(AuthEvent.unknown);
        }
      });
    });
  }
}

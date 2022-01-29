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
   
    this.on(AuthEvent.unknown, (_, emit) => {
      emit(false);
    })
    this.on(AuthEvent.unauthenticated, (_, emit) => {
      emit(false);
    })
    this.on(AuthEvent.authenticated, (_, emit) => {
      emit(true);
    })

    this.addRegisterListener((consumer) => {
      consumer.addBlocChangeObserver<CounterCubit>(CounterCubit, (bloc, state) => {
        if (state.nextState === 10) {
          this.add(AuthEvent.unknown);
        }
      });
    });
  }
}
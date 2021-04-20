import Bloc from "../../lib/bloc";

export enum AuthEvent {
    unknown = 'unknown',
    authenticated = 'authenticated',
    unauthenticated = 'unauthenticated',
}

export default class AuthBloc extends Bloc<AuthEvent, boolean> {
    constructor() {
        super(false, {
            persistKey: 'auth'
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
        }

        this.onChange = console.log;
        this.onTransition = console.log;
    }
}
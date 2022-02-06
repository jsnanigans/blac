import Bloc from "../../lib/Bloc";
export declare enum AuthEvent {
    unknown = "unknown",
    authenticated = "authenticated",
    unauthenticated = "unauthenticated"
}
export default class AuthBloc extends Bloc<AuthEvent, boolean> {
    constructor();
}

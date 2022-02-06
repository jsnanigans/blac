var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import Bloc from "../../lib/Bloc";
import CounterCubit from "./CounterCubit";
export var AuthEvent;
(function (AuthEvent) {
    AuthEvent["unknown"] = "unknown";
    AuthEvent["authenticated"] = "authenticated";
    AuthEvent["unauthenticated"] = "unauthenticated";
})(AuthEvent || (AuthEvent = {}));
var AuthBloc = /** @class */ (function (_super) {
    __extends(AuthBloc, _super);
    function AuthBloc() {
        var _this = _super.call(this, false, {
            persistKey: "auth"
        }) || this;
        _this.on(AuthEvent.unknown, function (_, emit) {
            emit(false);
        });
        _this.on(AuthEvent.unauthenticated, function (_, emit) {
            emit(false);
        });
        _this.on(AuthEvent.authenticated, function (_, emit) {
            emit(true);
        });
        _this.addRegisterListener(function (consumer) {
            consumer.addBlocChangeObserver(CounterCubit, function (bloc, state) {
                if (state.nextState === 10) {
                    _this.add(AuthEvent.unknown);
                }
            });
        });
        return _this;
    }
    return AuthBloc;
}(Bloc));
export default AuthBloc;

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
import Cubit from "../lib/Cubit";
import Bloc from "../lib/Bloc";
var Test1 = /** @class */ (function (_super) {
    __extends(Test1, _super);
    function Test1(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, 1) || this;
        _this.increment = function () {
            _this.emit(_this.state + 1);
        };
        if (options.register) {
            _this.addRegisterListener(options.register);
        }
        return _this;
    }
    return Test1;
}(Cubit));
export { Test1 };
var ChangeListener = /** @class */ (function (_super) {
    __extends(ChangeListener, _super);
    function ChangeListener(notify, listenFor, scope) {
        var _this = _super.call(this, 1) || this;
        _this.addRegisterListener(function (consumer) {
            consumer.addBlocChangeObserver(listenFor, function (bloc, state) {
                notify(bloc, state);
            }, scope);
        });
        return _this;
    }
    return ChangeListener;
}(Cubit));
export { ChangeListener };
var ValueChangeListener = /** @class */ (function (_super) {
    __extends(ValueChangeListener, _super);
    function ValueChangeListener(notify, listenFor, scope) {
        var _this = _super.call(this, 1) || this;
        _this.increment = function () {
            _this.emit(_this.state + 1);
        };
        _this.addRegisterListener(function (consumer) {
            consumer.addBlocValueChangeObserver(listenFor, function (state) {
                notify(state);
            }, scope);
        });
        return _this;
    }
    return ValueChangeListener;
}(Cubit));
export { ValueChangeListener };
export var AuthEvent;
(function (AuthEvent) {
    AuthEvent["authenticated"] = "authenticated";
    AuthEvent["unauthenticated"] = "unauthenticated";
})(AuthEvent || (AuthEvent = {}));
var TestBloc = /** @class */ (function (_super) {
    __extends(TestBloc, _super);
    function TestBloc() {
        var _this = _super.call(this, false) || this;
        _this.on(AuthEvent.unauthenticated, function (_, emit) {
            emit(false);
        });
        _this.on(AuthEvent.authenticated, function (_, emit) {
            emit(true);
        });
        return _this;
    }
    return TestBloc;
}(Bloc));
export { TestBloc };

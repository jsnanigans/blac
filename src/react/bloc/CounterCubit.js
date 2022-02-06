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
import Cubit from "../../lib/Cubit";
var CounterCubit = /** @class */ (function (_super) {
    __extends(CounterCubit, _super);
    function CounterCubit(init) {
        if (init === void 0) { init = 0; }
        var _this = _super.call(this, init) || this;
        _this.increment = function () {
            _this.emit(_this.state + 1);
        };
        _this.decrement = function () {
            _this.emit(_this.state - 1);
        };
        return _this;
    }
    return CounterCubit;
}(Cubit));
export default CounterCubit;
var CounterCubitTimer = /** @class */ (function (_super) {
    __extends(CounterCubitTimer, _super);
    function CounterCubitTimer(t) {
        if (t === void 0) { t = 1000; }
        var _this = _super.call(this, 0) || this;
        _this.increment = function () {
            _this.emit(_this.state + 1);
        };
        var i = setInterval(function () {
            _this.increment();
        }, t);
        _this.addRemoveListener(function () { return clearInterval(i); });
        return _this;
    }
    return CounterCubitTimer;
}(Cubit));
export { CounterCubitTimer };
var CounterCubitTimerLocal = /** @class */ (function (_super) {
    __extends(CounterCubitTimerLocal, _super);
    function CounterCubitTimerLocal(timer) {
        return _super.call(this, timer) || this;
    }
    return CounterCubitTimerLocal;
}(CounterCubitTimer));
export { CounterCubitTimerLocal };

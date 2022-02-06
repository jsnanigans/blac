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
import StreamAbstraction from "./StreamAbstraction";
import createId from "./createId";
var BlocBase = /** @class */ (function (_super) {
    __extends(BlocBase, _super);
    function BlocBase(initialValue, blocOptions) {
        if (blocOptions === void 0) { blocOptions = {}; }
        var _this = _super.call(this, initialValue, blocOptions) || this;
        _this.id = createId();
        _this.createdAt = new Date();
        _this.meta = {
            scope: 'unknown'
        };
        _this.changeListeners = [];
        _this.registerListeners = [];
        _this.valueChangeListeners = [];
        _this.consumer = null;
        // listeners
        _this.removeChangeListener = function (index) {
            _this.changeListeners.splice(index, 1);
        };
        _this.addChangeListener = function (method) {
            var index = _this.changeListeners.length;
            _this.changeListeners.push(method);
            return function () { return _this.removeChangeListener(index); };
        };
        _this.removeValueChangeListener = function (index) {
            _this.valueChangeListeners.splice(index, 1);
        };
        _this.addValueChangeListener = function (method) {
            var index = _this.valueChangeListeners.length;
            _this.valueChangeListeners.push(method);
            return function () { return _this.removeValueChangeListener(index); };
        };
        _this.removeRegisterListener = function (index) {
            _this.registerListeners.splice(index, 1);
        };
        _this.addRegisterListener = function (method) {
            var index = _this.registerListeners.length;
            _this.registerListeners.push(method);
            return function () { return _this.removeRegisterListener(index); };
        };
        _this.notifyChange = function (state) {
            var _a;
            (_a = _this.consumer) === null || _a === void 0 ? void 0 : _a.notifyChange(_this, state);
            _this.changeListeners.forEach(function (fn) { return fn({
                currentState: _this.state,
                nextState: state,
            }, _this); });
        };
        _this.notifyValueChange = function () {
            var _a;
            (_a = _this.consumer) === null || _a === void 0 ? void 0 : _a.notifyValueChange(_this);
            _this.valueChangeListeners.forEach(function (fn) { return fn(_this.state, _this); });
        };
        return _this;
    }
    return BlocBase;
}(StreamAbstraction));
export default BlocBase;

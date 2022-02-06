var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { cubitDefaultOptions, LOCAL_STORAGE_PREFIX } from "./constants";
import createId from "./createId";
var BehaviorSubject = /** @class */ (function () {
    function BehaviorSubject(initialValue) {
        this.isClosed = false;
        this.observers = [];
        this.value = initialValue;
    }
    BehaviorSubject.prototype.getValue = function () {
        return this.value;
    };
    BehaviorSubject.prototype.subscribe = function (observer) {
        var _this = this;
        var id = createId();
        this.observers.push({ observer: observer, id: id });
        this.triggerObservers();
        return {
            unsubscribe: function () { return _this.removeObserver(id); }
        };
    };
    BehaviorSubject.prototype.complete = function () {
        this.observers = [];
        this.isClosed = true;
    };
    BehaviorSubject.prototype.next = function (value) {
        this.value = value;
        this.triggerObservers();
    };
    BehaviorSubject.prototype.triggerObservers = function () {
        var _this = this;
        this.observers.forEach(function (_a) {
            var observer = _a.observer;
            observer.next(_this.value);
        });
    };
    BehaviorSubject.prototype.removeObserver = function (removeId) {
        this.observers = this.observers.filter(function (_a) {
            var id = _a.id;
            return id !== removeId;
        });
    };
    return BehaviorSubject;
}());
export { BehaviorSubject };
var StreamAbstraction = /** @class */ (function () {
    function StreamAbstraction(initialValue, blocOptions) {
        var _this = this;
        if (blocOptions === void 0) { blocOptions = {}; }
        this.isClosed = false;
        this.removeListeners = [];
        this.removeRemoveListener = function (index) {
            _this.removeListeners.splice(index, 1);
        };
        this.addRemoveListener = function (method) {
            var index = _this.removeListeners.length;
            _this.removeListeners.push(method);
            return function () { return _this.removeRemoveListener(index); };
        };
        this.subscribe = function (observer) { return _this._subject.subscribe({
            next: observer.next,
        }); };
        this.complete = function () {
            _this.isClosed = true;
            _this._subject.complete();
        };
        this.clearCache = function () {
            var key = _this._options.persistKey;
            if (key) {
                localStorage.removeItem("".concat(LOCAL_STORAGE_PREFIX).concat(key));
            }
        };
        this.next = function (value) {
            _this._subject.next(value);
            _this.updateCache();
        };
        this.getCachedValue = function () {
            var cachedValue = localStorage.getItem("".concat(LOCAL_STORAGE_PREFIX).concat(_this._options.persistKey));
            if (cachedValue) {
                try {
                    return _this.jsonToState(cachedValue);
                }
                catch (e) {
                    var error = new Error("Failed to parse JSON in localstorage for the key: \"".concat(LOCAL_STORAGE_PREFIX).concat(_this._options.persistKey, "\""));
                    console.error(error);
                    return error;
                }
            }
            return new Error("Key not found");
        };
        this.updateCache = function () {
            var _a = _this._options, persistData = _a.persistData, persistKey = _a.persistKey;
            if (persistData && persistKey) {
                localStorage.setItem("".concat(LOCAL_STORAGE_PREFIX).concat(persistKey), _this.stateToJson(_this.state));
            }
            else {
                _this.clearCache();
            }
        };
        var value = initialValue;
        var options = __assign(__assign({}, cubitDefaultOptions), blocOptions);
        this._options = options;
        if (options.persistKey && options.persistData) {
            var cachedValue = this.getCachedValue();
            if (!(cachedValue instanceof Error)) {
                value = cachedValue;
            }
        }
        this._subject = new BehaviorSubject(value);
    }
    Object.defineProperty(StreamAbstraction.prototype, "state", {
        get: function () {
            return this._subject.getValue();
        },
        enumerable: false,
        configurable: true
    });
    StreamAbstraction.prototype.jsonToState = function (state) {
        return JSON.parse(state).state;
    };
    StreamAbstraction.prototype.stateToJson = function (state) {
        return JSON.stringify({ state: state });
    };
    return StreamAbstraction;
}());
export default StreamAbstraction;

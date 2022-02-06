var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import BlocObserver from "./BlocObserver";
var BlocConsumer = /** @class */ (function () {
    function BlocConsumer(blocs, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.mocksEnabled = false;
        this.providerList = [];
        this.blocChangeObservers = [];
        this.blocValueChangeObservers = [];
        this.mockBlocs = [];
        this.blocListGlobal = blocs;
        this.observer = options.observer || new BlocObserver();
        var _loop_1 = function (b) {
            b.consumer = this_1;
            b.registerListeners.forEach(function (fn) { return fn(_this, b); });
            b.meta.scope = 'global';
            this_1.observer.addBlocAdded(b);
        };
        var this_1 = this;
        for (var _i = 0, blocs_1 = blocs; _i < blocs_1.length; _i++) {
            var b = blocs_1[_i];
            _loop_1(b);
        }
    }
    BlocConsumer.prototype.notifyChange = function (bloc, state) {
        if (bloc.isClosed) {
            return;
        }
        this.observer.addChange(bloc, state);
        for (var _i = 0, _a = this.blocChangeObservers; _i < _a.length; _i++) {
            var _b = _a[_i], blocClass = _b[0], callback = _b[1], scope = _b[2];
            var isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
            var matchesScope = scope === "all" ||
                (isGlobal && scope === "global") ||
                (!isGlobal && scope === "local");
            if (matchesScope && bloc instanceof blocClass) {
                callback(bloc, {
                    nextState: state,
                    currentState: bloc.state
                });
            }
        }
    };
    BlocConsumer.prototype.notifyValueChange = function (bloc) {
        if (bloc.isClosed) {
            return;
        }
        for (var _i = 0, _a = this.blocValueChangeObservers; _i < _a.length; _i++) {
            var _b = _a[_i], blocClass = _b[0], callback = _b[1], scope = _b[2];
            var isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
            var matchesScope = scope === "all" ||
                (isGlobal && scope === "global") ||
                (!isGlobal && scope === "local");
            if (matchesScope && bloc instanceof blocClass) {
                callback(bloc);
            }
        }
    };
    BlocConsumer.prototype.notifyTransition = function (bloc, state, event) {
        if (bloc.isClosed) {
            return;
        }
        this.observer.addTransition(bloc, state, event);
    };
    BlocConsumer.prototype.addBlocChangeObserver = function (blocClass, callback, scope) {
        if (scope === void 0) { scope = "all"; }
        this.blocChangeObservers.push([blocClass, callback, scope]);
    };
    BlocConsumer.prototype.addBlocValueChangeObserver = function (blocClass, callback, scope) {
        if (scope === void 0) { scope = "all"; }
        this.blocValueChangeObservers.push([blocClass, callback, scope]);
    };
    BlocConsumer.prototype.addLocalBloc = function (item) {
        var _this = this;
        this.providerList.push(item);
        item.bloc.consumer = this;
        item.bloc.registerListeners.forEach(function (fn) { return fn(_this, item.bloc); });
        item.bloc.meta.scope = 'local';
        this.observer.addBlocAdded(item.bloc);
    };
    BlocConsumer.prototype.removeLocalBloc = function (id, bloc) {
        var item = this.providerList.find(function (i) { return i.id === id && i.bloc === bloc; });
        if (item) {
            item.bloc.complete();
            item.bloc.removeListeners.forEach(function (fn) { return fn(); });
            this.observer.addBlocRemoved(item.bloc);
            this.providerList = this.providerList.filter(function (i) { return i !== item; });
        }
    };
    BlocConsumer.prototype.addBlocMock = function (bloc) {
        if (this.mocksEnabled) {
            this.mockBlocs = __spreadArray([bloc], this.mockBlocs, true);
        }
    };
    BlocConsumer.prototype.resetMocks = function () {
        this.mockBlocs = [];
    };
    BlocConsumer.prototype.getGlobalBloc = function (blocClass) {
        if (this.mocksEnabled) {
            var mockedBloc = this.mockBlocs.find(function (c) { return c instanceof blocClass; });
            if (mockedBloc) {
                return mockedBloc;
            }
        }
        return this.blocListGlobal.find(function (c) { return c instanceof blocClass; });
    };
    BlocConsumer.prototype.getLocalBlocForProvider = function (id, blocClass) {
        var _loop_2 = function (providerItem) {
            if (providerItem.id === id) {
                if (providerItem.bloc instanceof blocClass) {
                    return { value: providerItem.bloc };
                }
                var parent_1 = providerItem.parent;
                while (parent_1) {
                    var parentItem = this_2.providerList.find(function (i) { return i.id === parent_1; });
                    if ((parentItem === null || parentItem === void 0 ? void 0 : parentItem.bloc) instanceof blocClass) {
                        return { value: parentItem.bloc };
                    }
                    parent_1 = parentItem === null || parentItem === void 0 ? void 0 : parentItem.parent;
                }
            }
        };
        var this_2 = this;
        for (var _i = 0, _a = this.providerList; _i < _a.length; _i++) {
            var providerItem = _a[_i];
            var state_1 = _loop_2(providerItem);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return undefined;
    };
    BlocConsumer.prototype.getGlobalBlocInstance = function (global, blocClass) {
        if (this.mocksEnabled) {
            var mockedBloc = this.mockBlocs.find(function (c) { return c instanceof blocClass; });
            if (mockedBloc) {
                return mockedBloc;
            }
        }
        return global.find(function (c) { return c instanceof blocClass; });
    };
    return BlocConsumer;
}());
export { BlocConsumer };

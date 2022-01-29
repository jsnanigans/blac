'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var React = require('react');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

var LOCAL_STORAGE_PREFIX = "data.";
var cubitDefaultOptions = {
    persistKey: "",
    persistData: true,
};

var createId = function () {
    return '_' + Math.random().toString(36).substr(2, 9);
};

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
        var options = tslib.__assign(tslib.__assign({}, cubitDefaultOptions), blocOptions);
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

var BlocBase = /** @class */ (function (_super) {
    tslib.__extends(BlocBase, _super);
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

var Bloc = /** @class */ (function (_super) {
    tslib.__extends(Bloc, _super);
    function Bloc(initialState, options) {
        var _this = _super.call(this, initialState, options) || this;
        _this.onTransition = null;
        _this.mapEventToState = null;
        _this.add = function (event) {
            if (_this.mapEventToState) {
                var newState = _this.mapEventToState(event);
                _this.notifyChange(newState);
                _this.notifyTransition(newState, event);
                _this.next(newState);
                _this.notifyValueChange();
            }
            else {
                console.error("\"mapEventToState\" not implemented for \"".concat(_this.constructor.name, "\""));
            }
        };
        _this.notifyTransition = function (state, event) {
            var _a, _b;
            (_a = _this.consumer) === null || _a === void 0 ? void 0 : _a.notifyTransition(_this, state, event);
            (_b = _this.onTransition) === null || _b === void 0 ? void 0 : _b.call(_this, {
                currentState: _this.state,
                event: event,
                nextState: state,
            });
        };
        return _this;
    }
    return Bloc;
}(BlocBase));

var Cubit = /** @class */ (function (_super) {
    tslib.__extends(Cubit, _super);
    function Cubit() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.emit = function (value) {
            _this.notifyChange(value);
            _this.next(value);
            _this.notifyValueChange();
        };
        return _this;
    }
    return Cubit;
}(BlocBase));

var BlocObserver = /** @class */ (function () {
    function BlocObserver(methods) {
        var _this = this;
        if (methods === void 0) { methods = {}; }
        // trigger events
        this.addChange = function (bloc, state) {
            _this.onChange(bloc, _this.createChangeEvent(bloc, state));
        };
        this.addTransition = function (bloc, state, event) {
            _this.onTransition(bloc, _this.createTransitionEvent(bloc, state, event));
        };
        this.addBlocAdded = function (bloc) {
            _this.onBlocAdded(bloc);
        };
        this.addBlocRemoved = function (bloc) {
            _this.onBlocRemoved(bloc);
        };
        // consume
        this.defaultAction = function () { };
        this.onBlocAdded = this.defaultAction;
        this.onBlocRemoved = this.defaultAction;
        this.onChange = methods.onChange ? methods.onChange : this.defaultAction;
        this.onTransition = methods.onTransition ? methods.onTransition : this.defaultAction;
    }
    BlocObserver.prototype.createTransitionEvent = function (bloc, state, event) {
        return {
            currentState: bloc.state,
            event: event,
            nextState: state,
        };
    };
    BlocObserver.prototype.createChangeEvent = function (bloc, state) {
        return {
            currentState: bloc.state,
            nextState: state,
        };
    };
    return BlocObserver;
}());

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
            this.mockBlocs = tslib.__spreadArray([bloc], this.mockBlocs, true);
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

var defaultBlocHookOptions = {
    subscribe: true
};
var BlocRuntimeError = /** @class */ (function () {
    function BlocRuntimeError(message) {
        this.error = new Error(message);
    }
    return BlocRuntimeError;
}());
var NoValue = /** @class */ (function () {
    function NoValue() {
    }
    return NoValue;
}());
var BlocReact = /** @class */ (function (_super) {
    tslib.__extends(BlocReact, _super);
    function BlocReact(blocs, options) {
        var _this = _super.call(this, blocs, options) || this;
        _this.providerCount = 0;
        _this._contextLocalProviderKey = React__default["default"].createContext('none');
        _this.useBloc = function (blocClass, options) {
            if (options === void 0) { options = {}; }
            var mergedOptions = tslib.__assign(tslib.__assign({}, defaultBlocHookOptions), options);
            var blocInstance = React.useMemo(function () { return options.create ? options.create() : undefined; }, []);
            if (!blocInstance) {
                var localProviderKey_1 = React.useContext(_this._contextLocalProviderKey);
                var localBlocInstance_1 = React.useMemo(function () { return _this.getLocalBlocForProvider(localProviderKey_1, blocClass); }, []);
                blocInstance = React.useMemo(function () { return localBlocInstance_1 || _this.getGlobalBlocInstance(_this._blocsGlobal, blocClass); }, []);
            }
            var subscribe = mergedOptions.subscribe, _a = mergedOptions.shouldUpdate, shouldUpdate = _a === void 0 ? true : _a;
            if (!blocInstance) {
                var name_1 = blocClass.prototype.constructor.name;
                var error = new BlocRuntimeError("\"".concat(name_1, "\" \n      no bloc with this name was found in the global context.\n      \n      # Solutions:\n      \n      1. Wrap your code in a BlocProvider.\n      \n      2. Add \"").concat(name_1, "\" to the \"BlocReact\" constructor:\n        const state = new BlocReact(\n          [\n            ...\n            new ").concat(name_1, "(),\n          ]\n        )\n      "));
                console.error(error.error);
                return [
                    NoValue,
                    {},
                    {
                        error: error,
                        complete: true
                    }
                ];
            }
            var _b = React.useState(blocInstance.state), data = _b[0], setData = _b[1];
            var updateData = React.useCallback(function (nextState) {
                if (shouldUpdate === true || shouldUpdate({ nextState: nextState, currentState: data })) {
                    setData(nextState);
                }
            }, []);
            React.useEffect(function () {
                if (subscribe) {
                    var subscription_1 = blocInstance === null || blocInstance === void 0 ? void 0 : blocInstance.subscribe({
                        next: updateData
                    });
                    return function () {
                        subscription_1 === null || subscription_1 === void 0 ? void 0 : subscription_1.unsubscribe();
                    };
                }
            }, []);
            return [
                data,
                blocInstance
            ];
        };
        _this.withBlocProvider = function (bloc) { return function (Component) {
            var BlocProvider = _this.BlocProvider;
            return /** @class */ (function (_super) {
                tslib.__extends(WithBlocProvider, _super);
                function WithBlocProvider() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                WithBlocProvider.prototype.render = function () {
                    return (React__default["default"].createElement(BlocProvider, { bloc: bloc },
                        React__default["default"].createElement(Component, tslib.__assign({}, this.props))));
                };
                return WithBlocProvider;
            }(React__default["default"].Component));
        }; };
        _this._blocsGlobal = blocs;
        _this.BlocProvider = _this.BlocProvider.bind(_this);
        _this.BlocBuilder = _this.BlocBuilder.bind(_this);
        return _this;
    }
    // Components
    BlocReact.prototype.BlocBuilder = function (props) {
        var hook = this.useBloc(props.blocClass, {
            shouldUpdate: props.shouldUpdate
        });
        return props.builder(hook);
    };
    BlocReact.prototype.BlocProvider = function (props) {
        var _this = this;
        var id = React.useMemo(function () { return createId(); }, []);
        var localProviderKey = React.useContext(this._contextLocalProviderKey);
        var bloc = React.useMemo(function () {
            var newBloc = typeof props.bloc === "function" ? props.bloc(id) : props.bloc;
            if (newBloc) {
                _this.addLocalBloc({
                    bloc: newBloc,
                    id: id,
                    parent: localProviderKey
                });
            }
            else {
                console.error("BLoC is undefined");
            }
            return newBloc;
        }, []);
        var context = React.useMemo(function () {
            return React__default["default"].createContext(bloc);
        }, [bloc]);
        React.useEffect(function () {
            return function () {
                _this.removeLocalBloc(id, bloc);
            };
        }, []);
        return (React__default["default"].createElement(this._contextLocalProviderKey.Provider, { value: id },
            React__default["default"].createElement(context.Provider, { value: bloc }, props.children)));
    };
    return BlocReact;
}(BlocConsumer));

exports.Bloc = Bloc;
exports.BlocObserver = BlocObserver;
exports.BlocReact = BlocReact;
exports.Cubit = Cubit;
//# sourceMappingURL=bloc-react.js.map

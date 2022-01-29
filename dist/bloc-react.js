'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

const LOCAL_STORAGE_PREFIX = "data.";
const cubitDefaultOptions = {
    persistKey: "",
    persistData: true,
};

const createId = () => {
    return '_' + Math.random().toString(36).substr(2, 9);
};

class BehaviorSubject {
    isClosed = false;
    prevValue;
    value;
    observers = [];
    constructor(initialValue) {
        this.value = initialValue;
    }
    getValue() {
        return this.value;
    }
    subscribe(observer) {
        const id = createId();
        this.observers.push({ observer, id });
        this.triggerObservers();
        return {
            unsubscribe: () => this.removeObserver(id)
        };
    }
    complete() {
        this.observers = [];
        this.isClosed = true;
    }
    next(value) {
        this.value = value;
        this.triggerObservers();
    }
    triggerObservers() {
        this.observers.forEach(({ observer }) => {
            observer.next(this.value);
        });
    }
    removeObserver(removeId) {
        this.observers = this.observers.filter(({ id }) => id !== removeId);
    }
}
class StreamAbstraction {
    isClosed = false;
    removeListeners = [];
    _options;
    _subject;
    constructor(initialValue, blocOptions = {}) {
        let value = initialValue;
        const options = { ...cubitDefaultOptions, ...blocOptions };
        this._options = options;
        if (options.persistKey && options.persistData) {
            const cachedValue = this.getCachedValue();
            if (!(cachedValue instanceof Error)) {
                value = cachedValue;
            }
        }
        this._subject = new BehaviorSubject(value);
    }
    get state() {
        return this._subject.getValue();
    }
    removeRemoveListener = (index) => {
        this.removeListeners.splice(index, 1);
    };
    addRemoveListener = (method) => {
        const index = this.removeListeners.length;
        this.removeListeners.push(method);
        return () => this.removeRemoveListener(index);
    };
    subscribe = (observer) => this._subject.subscribe({
        next: observer.next,
    });
    complete = () => {
        this.isClosed = true;
        this._subject.complete();
    };
    clearCache = () => {
        const key = this._options.persistKey;
        if (key) {
            localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
        }
    };
    jsonToState(state) {
        return JSON.parse(state).state;
    }
    stateToJson(state) {
        return JSON.stringify({ state });
    }
    next = (value) => {
        this._subject.next(value);
        this.updateCache();
    };
    getCachedValue = () => {
        const cachedValue = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${this._options.persistKey}`);
        if (cachedValue) {
            try {
                return this.jsonToState(cachedValue);
            }
            catch (e) {
                const error = new Error(`Failed to parse JSON in localstorage for the key: "${LOCAL_STORAGE_PREFIX}${this._options.persistKey}"`);
                console.error(error);
                return error;
            }
        }
        return new Error("Key not found");
    };
    updateCache = () => {
        const { persistData, persistKey } = this._options;
        if (persistData && persistKey) {
            localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${persistKey}`, this.stateToJson(this.state));
        }
        else {
            this.clearCache();
        }
    };
}

class BlocBase extends StreamAbstraction {
    id = createId();
    createdAt = new Date();
    meta = {
        scope: 'unknown'
    };
    changeListeners = [];
    registerListeners = [];
    valueChangeListeners = [];
    consumer = null;
    constructor(initialValue, blocOptions = {}) {
        super(initialValue, blocOptions);
    }
    // listeners
    removeChangeListener = (index) => {
        this.changeListeners.splice(index, 1);
    };
    addChangeListener = (method) => {
        const index = this.changeListeners.length;
        this.changeListeners.push(method);
        return () => this.removeChangeListener(index);
    };
    removeValueChangeListener = (index) => {
        this.valueChangeListeners.splice(index, 1);
    };
    addValueChangeListener = (method) => {
        const index = this.valueChangeListeners.length;
        this.valueChangeListeners.push(method);
        return () => this.removeValueChangeListener(index);
    };
    removeRegisterListener = (index) => {
        this.registerListeners.splice(index, 1);
    };
    addRegisterListener = (method) => {
        const index = this.registerListeners.length;
        this.registerListeners.push(method);
        return () => this.removeRegisterListener(index);
    };
    notifyChange = (state) => {
        this.consumer?.notifyChange(this, state);
        this.changeListeners.forEach(fn => fn({
            currentState: this.state,
            nextState: state,
        }, this));
    };
    notifyValueChange = () => {
        this.consumer?.notifyValueChange(this);
        this.valueChangeListeners.forEach(fn => fn(this.state, this));
    };
}

class Bloc extends BlocBase {
    onTransition = null;
    mapEventToState = null;
    constructor(initialState, options) {
        super(initialState, options);
    }
    add = (event) => {
        if (this.mapEventToState) {
            const newState = this.mapEventToState(event);
            this.notifyChange(newState);
            this.notifyTransition(newState, event);
            this.next(newState);
            this.notifyValueChange();
        }
        else {
            console.error(`"mapEventToState" not implemented for "${this.constructor.name}"`);
        }
    };
    notifyTransition = (state, event) => {
        this.consumer?.notifyTransition(this, state, event);
        this.onTransition?.({
            currentState: this.state,
            event,
            nextState: state,
        });
    };
}

class Cubit extends BlocBase {
    emit = (value) => {
        this.notifyChange(value);
        this.next(value);
        this.notifyValueChange();
    };
}

class BlocObserver {
    onChange;
    onTransition;
    constructor(methods = {}) {
        this.onChange = methods.onChange ? methods.onChange : this.defaultAction;
        this.onTransition = methods.onTransition ? methods.onTransition : this.defaultAction;
    }
    // trigger events
    addChange = (bloc, state) => {
        this.onChange(bloc, this.createChangeEvent(bloc, state));
    };
    addTransition = (bloc, state, event) => {
        this.onTransition(bloc, this.createTransitionEvent(bloc, state, event));
    };
    addBlocAdded = (bloc) => {
        this.onBlocAdded(bloc);
    };
    addBlocRemoved = (bloc) => {
        this.onBlocRemoved(bloc);
    };
    // consume
    defaultAction = () => { };
    onBlocAdded = this.defaultAction;
    onBlocRemoved = this.defaultAction;
    createTransitionEvent(bloc, state, event) {
        return {
            currentState: bloc.state,
            event,
            nextState: state,
        };
    }
    createChangeEvent(bloc, state) {
        return {
            currentState: bloc.state,
            nextState: state,
        };
    }
}

class BlocConsumer {
    observer;
    mocksEnabled = false;
    providerList = [];
    blocListGlobal;
    blocChangeObservers = [];
    blocValueChangeObservers = [];
    mockBlocs = [];
    constructor(blocs, options = {}) {
        this.blocListGlobal = blocs;
        this.observer = options.observer || new BlocObserver();
        for (const b of blocs) {
            b.consumer = this;
            b.registerListeners.forEach(fn => fn(this, b));
            b.meta.scope = 'global';
            this.observer.addBlocAdded(b);
        }
    }
    notifyChange(bloc, state) {
        if (bloc.isClosed) {
            return;
        }
        this.observer.addChange(bloc, state);
        for (const [blocClass, callback, scope] of this.blocChangeObservers) {
            const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
            const matchesScope = scope === "all" ||
                (isGlobal && scope === "global") ||
                (!isGlobal && scope === "local");
            if (matchesScope && bloc instanceof blocClass) {
                callback(bloc, {
                    nextState: state,
                    currentState: bloc.state
                });
            }
        }
    }
    notifyValueChange(bloc) {
        if (bloc.isClosed) {
            return;
        }
        for (const [blocClass, callback, scope] of this.blocValueChangeObservers) {
            const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
            const matchesScope = scope === "all" ||
                (isGlobal && scope === "global") ||
                (!isGlobal && scope === "local");
            if (matchesScope && bloc instanceof blocClass) {
                callback(bloc);
            }
        }
    }
    notifyTransition(bloc, state, event) {
        if (bloc.isClosed) {
            return;
        }
        this.observer.addTransition(bloc, state, event);
    }
    addBlocChangeObserver(blocClass, callback, scope = "all") {
        this.blocChangeObservers.push([blocClass, callback, scope]);
    }
    addBlocValueChangeObserver(blocClass, callback, scope = "all") {
        this.blocValueChangeObservers.push([blocClass, callback, scope]);
    }
    addLocalBloc(item) {
        this.providerList.push(item);
        item.bloc.consumer = this;
        item.bloc.registerListeners.forEach(fn => fn(this, item.bloc));
        item.bloc.meta.scope = 'local';
        this.observer.addBlocAdded(item.bloc);
    }
    removeLocalBloc(id, bloc) {
        const item = this.providerList.find(i => i.id === id && i.bloc === bloc);
        if (item) {
            item.bloc.complete();
            item.bloc.removeListeners.forEach(fn => fn());
            this.observer.addBlocRemoved(item.bloc);
            this.providerList = this.providerList.filter(i => i !== item);
        }
    }
    addBlocMock(bloc) {
        if (this.mocksEnabled) {
            this.mockBlocs = [bloc, ...this.mockBlocs];
        }
    }
    resetMocks() {
        this.mockBlocs = [];
    }
    getGlobalBloc(blocClass) {
        if (this.mocksEnabled) {
            const mockedBloc = this.mockBlocs.find((c) => c instanceof blocClass);
            if (mockedBloc) {
                return mockedBloc;
            }
        }
        return this.blocListGlobal.find(c => c instanceof blocClass);
    }
    getLocalBlocForProvider(id, blocClass) {
        for (const providerItem of this.providerList) {
            if (providerItem.id === id) {
                if (providerItem.bloc instanceof blocClass) {
                    return providerItem.bloc;
                }
                let parent = providerItem.parent;
                while (parent) {
                    const parentItem = this.providerList.find(i => i.id === parent);
                    if (parentItem?.bloc instanceof blocClass) {
                        return parentItem.bloc;
                    }
                    parent = parentItem?.parent;
                }
            }
        }
        return undefined;
    }
    getGlobalBlocInstance(global, blocClass) {
        if (this.mocksEnabled) {
            const mockedBloc = this.mockBlocs.find((c) => c instanceof blocClass);
            if (mockedBloc) {
                return mockedBloc;
            }
        }
        return global.find((c) => c instanceof blocClass);
    }
}

const defaultBlocHookOptions = {
    subscribe: true
};
class BlocRuntimeError {
    error;
    constructor(message) {
        this.error = new Error(message);
    }
}
class NoValue {
}
class BlocReact extends BlocConsumer {
    providerCount = 0;
    _blocsGlobal;
    _contextLocalProviderKey = React__default["default"].createContext('none');
    constructor(blocs, options) {
        super(blocs, options);
        this._blocsGlobal = blocs;
        this.BlocProvider = this.BlocProvider.bind(this);
        this.BlocBuilder = this.BlocBuilder.bind(this);
    }
    useBloc = (blocClass, options = {}) => {
        const mergedOptions = {
            ...defaultBlocHookOptions,
            ...options
        };
        let blocInstance = React.useMemo(() => options.create ? options.create() : undefined, []);
        if (!blocInstance) {
            const localProviderKey = React.useContext(this._contextLocalProviderKey);
            const localBlocInstance = React.useMemo(() => this.getLocalBlocForProvider(localProviderKey, blocClass), []);
            blocInstance = React.useMemo(() => localBlocInstance || this.getGlobalBlocInstance(this._blocsGlobal, blocClass), []);
        }
        const { subscribe, shouldUpdate = true } = mergedOptions;
        if (!blocInstance) {
            const name = blocClass.prototype.constructor.name;
            const error = new BlocRuntimeError(`"${name}" 
      no bloc with this name was found in the global context.
      
      # Solutions:
      
      1. Wrap your code in a BlocProvider.
      
      2. Add "${name}" to the "BlocReact" constructor:
        const state = new BlocReact(
          [
            ...
            new ${name}(),
          ]
        )
      `);
            console.error(error.error);
            return [
                NoValue,
                {},
                {
                    error,
                    complete: true
                }
            ];
        }
        const [data, setData] = React.useState(blocInstance.state);
        const updateData = React.useCallback((nextState) => {
            if (shouldUpdate === true || shouldUpdate({ nextState, currentState: data })) {
                setData(nextState);
            }
        }, []);
        React.useEffect(() => {
            if (subscribe) {
                const subscription = blocInstance?.subscribe({
                    next: updateData
                });
                return () => {
                    subscription?.unsubscribe();
                };
            }
        }, []);
        return [
            data,
            blocInstance
        ];
    };
    // Components
    BlocBuilder(props) {
        const hook = this.useBloc(props.blocClass, {
            shouldUpdate: props.shouldUpdate
        });
        return props.builder(hook);
    }
    ;
    BlocProvider(props) {
        const id = React.useMemo(() => createId(), []);
        const localProviderKey = React.useContext(this._contextLocalProviderKey);
        const bloc = React.useMemo(() => {
            const newBloc = typeof props.bloc === "function" ? props.bloc(id) : props.bloc;
            if (newBloc) {
                this.addLocalBloc({
                    bloc: newBloc,
                    id,
                    parent: localProviderKey
                });
            }
            else {
                console.error(`BLoC is undefined`);
            }
            return newBloc;
        }, []);
        const context = React.useMemo(() => {
            return React__default["default"].createContext(bloc);
        }, [bloc]);
        React.useEffect(() => {
            return () => {
                this.removeLocalBloc(id, bloc);
            };
        }, []);
        return (React__default["default"].createElement(this._contextLocalProviderKey.Provider, { value: id },
            React__default["default"].createElement(context.Provider, { value: bloc }, props.children)));
    }
    ;
    withBlocProvider = (bloc) => (Component) => {
        const { BlocProvider } = this;
        return class WithBlocProvider extends React__default["default"].Component {
            render() {
                return (React__default["default"].createElement(BlocProvider, { bloc: bloc },
                    React__default["default"].createElement(Component, { ...this.props })));
            }
        };
    };
}

exports.Bloc = Bloc;
exports.BlocObserver = BlocObserver;
exports.BlocReact = BlocReact;
exports.Cubit = Cubit;
//# sourceMappingURL=bloc-react.js.map

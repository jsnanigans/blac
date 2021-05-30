'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

const LOCAL_STORAGE_PREFIX = "data.";
const cubitDefaultOptions = {
  persistKey: "",
  persistData: true
};

const createId = () => {
  return "_" + Math.random().toString(36).substr(2, 9);
};

class BehaviorSubject {
  constructor(initialValue) {
    this.isClosed = false;
    this.observers = [];
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
  constructor(initialValue, blocOptions = {}) {
    this.isClosed = false;
    this.removeListeners = [];
    this.removeRemoveListener = (index) => {
      this.removeListeners.splice(index, 1);
    };
    this.addRemoveListener = (method) => {
      const index = this.removeListeners.length;
      this.removeListeners.push(method);
      return () => this.removeRemoveListener(index);
    };
    this.subscribe = (observer) => this._subject.subscribe({
      next: observer.next
    });
    this.complete = () => {
      this.isClosed = true;
      this._subject.complete();
    };
    this.clearCache = () => {
      const key = this._options.persistKey;
      if (key) {
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
      }
    };
    this.next = (value) => {
      this._subject.next(value);
      this.updateCache();
    };
    this.getCachedValue = () => {
      const cachedValue = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${this._options.persistKey}`);
      if (cachedValue) {
        try {
          return this.jsonToState(cachedValue);
        } catch (e) {
          const error = new Error(`Failed to parse JSON in localstorage for the key: "${LOCAL_STORAGE_PREFIX}${this._options.persistKey}"`);
          console.error(error);
          return error;
        }
      }
      return new Error("Key not found");
    };
    this.updateCache = () => {
      const { persistData, persistKey } = this._options;
      if (persistData && persistKey) {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${persistKey}`, this.stateToJson(this.state));
      } else {
        this.clearCache();
      }
    };
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
  jsonToState(state) {
    return JSON.parse(state).state;
  }
  stateToJson(state) {
    return JSON.stringify({ state });
  }
}

class BlocBase extends StreamAbstraction {
  constructor(initialValue, blocOptions = {}) {
    super(initialValue, blocOptions);
    this.id = createId();
    this.createdAt = new Date();
    this.meta = {
      scope: "unknown"
    };
    this.changeListeners = [];
    this.registerListeners = [];
    this.valueChangeListeners = [];
    this.consumer = null;
    this.removeChangeListener = (index) => {
      this.changeListeners.splice(index, 1);
    };
    this.addChangeListener = (method) => {
      const index = this.changeListeners.length;
      this.changeListeners.push(method);
      return () => this.removeChangeListener(index);
    };
    this.removeValueChangeListener = (index) => {
      this.valueChangeListeners.splice(index, 1);
    };
    this.addValueChangeListener = (method) => {
      const index = this.valueChangeListeners.length;
      this.valueChangeListeners.push(method);
      return () => this.removeValueChangeListener(index);
    };
    this.removeRegisterListener = (index) => {
      this.registerListeners.splice(index, 1);
    };
    this.addRegisterListener = (method) => {
      const index = this.registerListeners.length;
      this.registerListeners.push(method);
      return () => this.removeRegisterListener(index);
    };
    this.notifyChange = (state) => {
      this.consumer?.notifyChange(this, state);
      this.changeListeners.forEach((fn) => fn({
        currentState: this.state,
        nextState: state
      }, this));
    };
    this.notifyValueChange = () => {
      this.consumer?.notifyValueChange(this);
      this.valueChangeListeners.forEach((fn) => fn(this.state, this));
    };
  }
}

class Bloc extends BlocBase {
  constructor(initialState, options) {
    super(initialState, options);
    this.onTransition = null;
    this.mapEventToState = null;
    this.add = (event) => {
      if (this.mapEventToState) {
        const newState = this.mapEventToState(event);
        this.notifyChange(newState);
        this.notifyTransition(newState, event);
        this.next(newState);
        this.notifyValueChange();
      } else {
        console.error(`"mapEventToState" not implemented for "${this.constructor.name}"`);
      }
    };
    this.notifyTransition = (state, event) => {
      this.consumer?.notifyTransition(this, state, event);
      this.onTransition?.({
        currentState: this.state,
        event,
        nextState: state
      });
    };
  }
}

class Cubit extends BlocBase {
  constructor() {
    super(...arguments);
    this.emit = (value) => {
      this.notifyChange(value);
      this.next(value);
      this.notifyValueChange();
    };
  }
}

class BlocObserver {
  constructor(methods = {}) {
    this.addChange = (bloc, state) => {
      this.onChange(bloc, this.createChangeEvent(bloc, state));
    };
    this.addTransition = (bloc, state, event) => {
      this.onTransition(bloc, this.createTransitionEvent(bloc, state, event));
    };
    this.addBlocAdded = (bloc) => {
      this.onBlocAdded(bloc);
    };
    this.addBlocRemoved = (bloc) => {
      this.onBlocRemoved(bloc);
    };
    this.defaultAction = () => {
    };
    this.onBlocAdded = this.defaultAction;
    this.onBlocRemoved = this.defaultAction;
    this.onChange = methods.onChange ? methods.onChange : this.defaultAction;
    this.onTransition = methods.onTransition ? methods.onTransition : this.defaultAction;
  }
  createTransitionEvent(bloc, state, event) {
    return {
      currentState: bloc.state,
      event,
      nextState: state
    };
  }
  createChangeEvent(bloc, state) {
    return {
      currentState: bloc.state,
      nextState: state
    };
  }
}

class BlocConsumer {
  constructor(blocs, options = {}) {
    this.mocksEnabled = false;
    this.providerList = [];
    this.blocChangeObservers = [];
    this.blocValueChangeObservers = [];
    this.mockBlocs = [];
    this.blocListGlobal = blocs;
    this.observer = options.observer || new BlocObserver();
    for (const b of blocs) {
      b.consumer = this;
      b.registerListeners.forEach((fn) => fn(this, b));
      b.meta.scope = "global";
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
      const matchesScope = scope === "all" || isGlobal && scope === "global" || !isGlobal && scope === "local";
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
      const matchesScope = scope === "all" || isGlobal && scope === "global" || !isGlobal && scope === "local";
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
    item.bloc.registerListeners.forEach((fn) => fn(this, item.bloc));
    item.bloc.meta.scope = "local";
    this.observer.addBlocAdded(item.bloc);
  }
  removeLocalBloc(id, bloc) {
    const item = this.providerList.find((i) => i.id === id && i.bloc === bloc);
    if (item) {
      item.bloc.complete();
      item.bloc.removeListeners.forEach((fn) => fn());
      this.observer.addBlocRemoved(item.bloc);
      this.providerList = this.providerList.filter((i) => i !== item);
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
    return this.blocListGlobal.find((c) => c instanceof blocClass);
  }
  getLocalBlocForProvider(id, blocClass) {
    for (const providerItem of this.providerList) {
      if (providerItem.id === id) {
        if (providerItem.bloc instanceof blocClass) {
          return providerItem.bloc;
        }
        let parent = providerItem.parent;
        while (parent) {
          const parentItem = this.providerList.find((i) => i.id === parent);
          if (parentItem?.bloc instanceof blocClass) {
            return parentItem.bloc;
          }
          parent = parentItem?.parent;
        }
      }
    }
    return void 0;
  }
  getBlocInstance(global, blocClass) {
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
  constructor(message) {
    this.error = new Error(message);
  }
}
class NoValue {
}
class BlocReact extends BlocConsumer {
  constructor(blocs, options) {
    super(blocs, options);
    this.providerCount = 0;
    this._contextLocalProviderKey = React__default['default'].createContext(0);
    this.useBloc = (blocClass, options = {}) => {
      const mergedOptions = {
        ...defaultBlocHookOptions,
        ...options
      };
      const localProviderKey = React.useContext(this._contextLocalProviderKey);
      const localBlocInstance = React.useMemo(() => this.getLocalBlocForProvider(localProviderKey, blocClass), []);
      const { subscribe, shouldUpdate = true } = mergedOptions;
      const blocInstance = React.useMemo(() => localBlocInstance || this.getBlocInstance(this._blocsGlobal, blocClass), []);
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
          const subscription = blocInstance.subscribe({
            next: updateData
          });
          return () => {
            subscription.unsubscribe();
          };
        }
      }, []);
      return [
        data,
        blocInstance
      ];
    };
    this._blocsGlobal = blocs;
    this.BlocProvider = this.BlocProvider.bind(this);
    this.BlocBuilder = this.BlocBuilder.bind(this);
  }
  BlocBuilder(props) {
    const hook = this.useBloc(props.blocClass, {
      shouldUpdate: props.shouldUpdate
    });
    return props.builder(hook);
  }
  BlocProvider(props) {
    const id = this.providerCount++;
    const localProviderKey = React.useContext(this._contextLocalProviderKey);
    const bloc = React.useMemo(() => {
      const newBloc = typeof props.bloc === "function" ? props.bloc(id) : props.bloc;
      if (newBloc) {
        this.addLocalBloc({
          bloc: newBloc,
          id,
          parent: localProviderKey
        });
      } else {
        console.error(`BLoC is undefined`);
      }
      return newBloc;
    }, []);
    const context = React.useMemo(() => {
      return React__default['default'].createContext(bloc);
    }, [bloc]);
    React.useEffect(() => {
      return () => {
        this.removeLocalBloc(id, bloc);
      };
    }, []);
    return /* @__PURE__ */ React__default['default'].createElement(this._contextLocalProviderKey.Provider, {
      value: id
    }, /* @__PURE__ */ React__default['default'].createElement(context.Provider, {
      value: bloc
    }, props.children));
  }
}

exports.Bloc = Bloc;
exports.BlocObserver = BlocObserver;
exports.BlocReact = BlocReact;
exports.Cubit = Cubit;
//# sourceMappingURL=bloc-react.js.map

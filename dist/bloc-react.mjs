import { BehaviorSubject } from 'rxjs';
import React, { useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { nanoid } from 'nanoid';

const LOCAL_STORAGE_PREFIX = "data.";
const cubitDefaultOptions = {
  persistKey: "",
  persistData: true
};

class StreamAbstraction {
  constructor(initialValue, blocOptions = {}) {
    this.subscribe = (next) => this._subject.subscribe(next);
    this.complete = () => this._subject.complete();
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
    this._localProviderRef = "";
    this.onRegister = null;
    this.onChange = null;
    this.onValueChange = null;
    this._consumer = null;
    this.notifyChange = (state) => {
      this._consumer?.notifyChange(this, state);
      this.onChange?.({
        currentState: this.state,
        nextState: state
      });
    };
    this.notifyValueChange = () => {
      this._consumer?.notifyValueChange(this);
      this.onValueChange?.(this.state);
    };
  }
  set consumer(consumer) {
    this._consumer = consumer;
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
      this._consumer?.notifyTransition(this, state, event);
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
    this.defaultAction = () => {
    };
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
  constructor(blocs) {
    this.mocksEnabled = false;
    this.providerList = [];
    this._blocMapLocal = {};
    this.blocChangeObservers = [];
    this.blocValueChangeObservers = [];
    this.mockBlocs = [];
    this.blocListGlobal = blocs;
    this.observer = new BlocObserver();
    for (const b of blocs) {
      b.consumer = this;
      b.onRegister?.(this);
    }
  }
  notifyChange(bloc, state) {
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
    for (const [blocClass, callback, scope] of this.blocValueChangeObservers) {
      const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
      const matchesScope = scope === "all" || isGlobal && scope === "global" || !isGlobal && scope === "local";
      if (matchesScope && bloc instanceof blocClass) {
        callback(bloc);
      }
    }
  }
  notifyTransition(bloc, state, event) {
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
    item.bloc.onRegister?.(this);
  }
  removeLocalBloc(key) {
    const item = this.providerList.find((i) => i.id !== key);
    item?.bloc.complete();
    this.providerList = this.providerList.filter((e) => e !== item);
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
  getLocalBlocForProvider(key, blocClass) {
    for (const providerItem of this.providerList) {
      if (providerItem.id === key) {
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
  constructor(blocs) {
    super(blocs);
    this._contextLocalProviderKey = React.createContext("");
    this.useBloc = (blocClass, options = {}) => {
      const mergedOptions = {
        ...defaultBlocHookOptions,
        ...options
      };
      const localProviderKey = useContext(this._contextLocalProviderKey);
      console.log({ localProviderKey });
      const localBlocInstance = this.getLocalBlocForProvider(localProviderKey, blocClass);
      console.log({ localBlocInstance });
      const { subscribe, shouldUpdate = true } = mergedOptions;
      const blocInstance = localBlocInstance || this.getBlocInstance(this._blocsGlobal, blocClass);
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
      const [data, setData] = useState(blocInstance.state);
      const updateData = useCallback((nextState) => {
        if (shouldUpdate === true || shouldUpdate({ nextState, currentState: data })) {
          setData(nextState);
        }
      }, []);
      useEffect(() => {
        if (subscribe) {
          const subscription = blocInstance.subscribe(updateData);
          return () => subscription.unsubscribe();
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
    const providerKey = useMemo(() => "p_" + nanoid(), []);
    const localProviderKey = useContext(this._contextLocalProviderKey);
    const bloc = useMemo(() => {
      const newBloc = typeof props.bloc === "function" ? props.bloc(providerKey) : props.bloc;
      if (newBloc) {
        newBloc._localProviderRef = providerKey;
        this.addLocalBloc({
          bloc: newBloc,
          id: providerKey,
          parent: localProviderKey
        });
      } else {
        console.error(`BLoC is undefined`);
      }
      return newBloc;
    }, []);
    const context = useMemo(() => {
      return React.createContext(bloc);
    }, [bloc]);
    useEffect(() => {
      return () => {
        this.removeLocalBloc(providerKey);
      };
    }, []);
    return /* @__PURE__ */ React.createElement(this._contextLocalProviderKey.Provider, {
      value: providerKey
    }, /* @__PURE__ */ React.createElement(context.Provider, {
      value: bloc
    }, props.children));
  }
}

export { Bloc, BlocObserver, BlocReact, Cubit };
//# sourceMappingURL=bloc-react.mjs.map

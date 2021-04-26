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
    this.subscribe = (next, error, complete) => this._subject.subscribe(next, error, complete);
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
    this.parseFromCache = (state) => {
      return JSON.parse(state).state;
    };
    this.parseToCache = (state) => {
      return JSON.stringify({state});
    };
    this.getCachedValue = () => {
      const cachedValue = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${this._options.persistKey}`);
      if (cachedValue) {
        try {
          return this.parseFromCache(cachedValue);
        } catch (e) {
          const error = new Error(`Failed to parse JSON in localstorage for the key: "${LOCAL_STORAGE_PREFIX}${this._options.persistKey}"`);
          console.error(error);
          return error;
        }
      }
      return new Error("Key not found");
    };
    this.updateCache = () => {
      const {persistData, persistKey} = this._options;
      if (persistData && persistKey) {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${persistKey}`, this.parseToCache(this.state));
      } else {
        this.clearCache();
      }
    };
    let value = initialValue;
    const options = {...cubitDefaultOptions, ...blocOptions};
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
}

class BlocBase extends StreamAbstraction {
  constructor(initialValue, blocOptions = {}) {
    super(initialValue, blocOptions);
    this._localProviderRef = "";
    this.onRegister = null;
    this.onChange = null;
    this._consumer = null;
    this.notifyChange = (state) => {
      this.onChange?.({
        currentState: this.state,
        nextState: state
      });
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
      } else {
        console.error(`"mapEventToState" not implemented for "${this.constructor.name}"`);
      }
    };
    this.notifyTransition = (value, event) => {
      this.onTransition?.({
        currentState: this.state,
        event,
        nextState: value
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
    };
  }
}

class BlocConsumer {
  constructor(blocs, options = {}) {
    this.observer = null;
    this.blocObservers = [];
    this.blocListGlobal = blocs;
    this.debug = options.debug || false;
    for (const b of blocs) {
      b.consumer = this;
      b.subscribe((v) => this.notify(b, v));
      b.onRegister?.(this);
    }
  }
  notify(bloc, state) {
    if (this.observer) {
      this.observer(bloc, state);
    }
    for (const [blocClass, callback, scope] of this.blocObservers) {
      const isGlobal = this.blocListGlobal.indexOf(bloc) !== -1;
      const matchesScope = scope === "all" || isGlobal && scope === "global" || !isGlobal && scope === "local";
      if (matchesScope && bloc instanceof blocClass) {
        callback(bloc, state);
      }
    }
  }
  addBlocObserver(blocClass, callback, scope = "all") {
    this.blocObservers.push([blocClass, callback, scope]);
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
class BlocReact extends BlocConsumer {
  constructor(blocs, options = {}) {
    super(blocs, options);
    this._contextLocalProviderKey = React.createContext("");
    this._blocMapLocal = {};
    this.useBloc = (blocClass, options = {}) => {
      const mergedOptions = {
        ...defaultBlocHookOptions,
        ...options
      };
      const localProviderKey = useContext(this._contextLocalProviderKey);
      const localBlocInstance = this._blocMapLocal[localProviderKey];
      const {subscribe, shouldUpdate = true} = mergedOptions;
      const blocs = useContext(this._contextGlobal);
      const blocInstance = localBlocInstance || blocs.find((c) => c instanceof blocClass);
      if (!blocInstance) {
        const name = blocClass.prototype.constructor.name;
        const error2 = new BlocRuntimeError(`"${name}" 
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
        
      and mame sure you add the global state provider to your app:
        const { GlobalBlocProvider } = state;
        ...
        <GlobalBlocProvider>
          <App />
        </GlobalBlocProvider>
      `);
        console.error(error2.error);
        return [
          (e) => e,
          {},
          {
            error: error2,
            complete: true
          }
        ];
      }
      const [data, setData] = useState(blocInstance.state);
      const [error, setError] = useState();
      const [complete, setComplete] = useState(false);
      const updateData = useCallback((newState) => {
        if (shouldUpdate === true || shouldUpdate(data, newState)) {
          setData(newState);
        }
      }, []);
      useEffect(() => {
        if (subscribe) {
          const subscription = blocInstance.subscribe(updateData, setError, () => setComplete(true));
          return () => subscription.unsubscribe();
        }
      }, [this._contextGlobal]);
      return [
        data,
        blocInstance,
        {
          error,
          complete
        }
      ];
    };
    this.BlocBuilder = (props) => {
      const hook = this.useBloc(props.blocClass, {
        shouldUpdate: props.shouldUpdate
      });
      return props.builder(hook);
    };
    this.GlobalBlocProvider = (props) => {
      return /* @__PURE__ */ React.createElement(this._contextGlobal.Provider, {
        value: this.blocListGlobal
      }, props.children);
    };
    this.BlocProvider = (props) => {
      const providerKey = useMemo(() => "p_" + nanoid(), []);
      const bloc = useMemo(() => {
        const newBloc = props.create(providerKey);
        newBloc._localProviderRef = providerKey;
        this._blocMapLocal[providerKey] = newBloc;
        if (this.debug) {
          newBloc.subscribe((v) => this.notify(newBloc, v));
        }
        return newBloc;
      }, []);
      const context = useMemo(() => {
        return React.createContext(bloc);
      }, [bloc]);
      useEffect(() => {
        return () => {
          bloc.complete();
          delete this._blocMapLocal[providerKey];
        };
      }, []);
      return /* @__PURE__ */ React.createElement(this._contextLocalProviderKey.Provider, {
        value: providerKey
      }, /* @__PURE__ */ React.createElement(context.Provider, {
        value: bloc
      }, props.children));
    };
    this._contextGlobal = React.createContext(blocs);
  }
}

export { Bloc, BlocReact, Cubit };
//# sourceMappingURL=my-lib.mjs.map

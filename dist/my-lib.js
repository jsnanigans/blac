'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var rxjs = require('rxjs');
var React = require('react');
var nanoid = require('nanoid');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

const cubitDefaultOptions = {
  persistKey: "",
  persistData: true
};
class BlocBase {
  constructor(initialValue, cubitOptions = {}) {
    this.onChange = null;
    this._localProviderRef = "";
    this.getValue = () => this._subject.getValue();
    this.subscribe = (next, error, complete) => this._subject.subscribe(next, error, complete);
    this.parseFromCache = (value) => {
      return JSON.parse(value).value;
    };
    this.parseToCache = (value) => {
      return JSON.stringify({value});
    };
    this.notifyChange = (value) => {
      this.onChange?.({
        currentState: this._subject.getValue(),
        nextState: value
      });
    };
    this.getCachedValue = () => {
      const cachedValue = localStorage.getItem(`data.${this._options.persistKey}`);
      if (cachedValue) {
        try {
          return this.parseFromCache(cachedValue);
        } catch (e) {
          console.error(e);
        }
      }
    };
    this.updateCache = () => {
      const {persistData, persistKey} = this._options;
      if (persistData && persistKey) {
        localStorage.setItem(`data.${persistKey}`, this.parseToCache(this.subject.getValue()));
      } else {
        this.clearCache();
      }
    };
    this.clearCache = () => {
      const key = this._options.persistKey;
      if (key && this._options.persistData) {
        localStorage.removeItem(`data.${key}`);
      }
    };
    const options = {...cubitDefaultOptions, ...cubitOptions};
    this._options = options;
    let value = initialValue;
    if (options.persistKey && options.persistData) {
      const cachedValue = this.getCachedValue();
      if (cachedValue) {
        value = cachedValue;
      }
    }
    this._subject = new rxjs.BehaviorSubject(value);
  }
  get subject() {
    return this._subject;
  }
  get state() {
    return this.subject.getValue();
  }
  set persistData(setTo) {
    const previousOptions = {...this._options};
    this._options.persistData = setTo;
    if (!setTo) {
      this.clearCache();
    } else if (previousOptions.persistData === false) {
      this.updateCache();
    }
  }
}

class Bloc extends BlocBase {
  constructor(initialState, options) {
    super(initialState, options);
    this.onTransition = null;
    this.add = (event) => {
      const newState = this.mapEventToState(event);
      this.notifyChange(newState);
      this.notifyTransition(newState, event);
      this.subject.next(newState);
      this.updateCache();
    };
    this.notifyTransition = (value, event) => {
      this.onTransition?.({
        currentState: this.getValue(),
        event,
        nextState: value
      });
    };
    this.mapEventToState = () => initialState;
  }
}

class Cubit extends BlocBase {
  constructor() {
    super(...arguments);
    this.emit = (value) => {
      this.notifyChange(value);
      this.subject.next(value);
      this.updateCache();
    };
  }
}

const defaultBlocHookOptions = {
  subscribe: true
};
class BlocReact {
  constructor(blocs, options = {}) {
    this.observer = null;
    this._contextLocalProviderKey = React__default['default'].createContext("");
    this._blocMapLocal = {};
    this.useBloc = (blocClass, options = {}) => {
      const mergedOptions = {
        ...defaultBlocHookOptions,
        ...options
      };
      const localProviderKey = React.useContext(this._contextLocalProviderKey);
      const localBlocInstance = this._blocMapLocal[localProviderKey];
      const {subscribe, shouldUpdate = true} = mergedOptions;
      const blocs = React.useContext(this._contextGlobal);
      const blocInstance = localBlocInstance || blocs.find((c) => c instanceof blocClass);
      if (!blocInstance) {
        throw new Error(`No block found for ${blocClass}`);
      }
      const [data, setData] = React.useState(blocInstance.getValue());
      const [error, setError] = React.useState();
      const [complete, setComplete] = React.useState(false);
      const updateData = React.useCallback((newState) => {
        if (shouldUpdate === true || shouldUpdate(data, newState)) {
          setData(newState);
        }
      }, []);
      React.useEffect(() => {
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
      return props.builder(this.useBloc(props.bloc, {
        shouldUpdate: props.shouldUpdate
      }));
    };
    this.GlobalBlocProvider = (props) => {
      return /* @__PURE__ */ React__default['default'].createElement(this._contextGlobal.Provider, {
        value: this._blocListGlobal
      }, props.children);
    };
    this.BlocProvider = (props) => {
      const providerKey = React.useMemo(() => "p_" + nanoid.nanoid(), []);
      const bloc = React.useMemo(() => {
        const newBloc = props.create(providerKey);
        newBloc._localProviderRef = providerKey;
        this._blocMapLocal[providerKey] = newBloc;
        if (this.debug) {
          newBloc.subject.subscribe((v) => this.notify(newBloc, v));
        }
        return newBloc;
      }, []);
      const context = React.useMemo(() => {
        return React__default['default'].createContext(bloc);
      }, [bloc]);
      React.useEffect(() => {
        return () => {
          bloc.subject.complete();
          delete this._blocMapLocal[providerKey];
        };
      }, []);
      return /* @__PURE__ */ React__default['default'].createElement(this._contextLocalProviderKey.Provider, {
        value: providerKey
      }, /* @__PURE__ */ React__default['default'].createElement(context.Provider, {
        value: bloc
      }, props.children));
    };
    this._blocListGlobal = blocs;
    this._contextGlobal = React__default['default'].createContext(blocs);
    this.debug = options.debug || false;
    if (this.debug) {
      for (const b of blocs) {
        b.subject.subscribe((v) => this.notify(b, v));
      }
    }
  }
  notify(bloc, value) {
    if (this.observer) {
      this.observer(bloc, value);
    }
  }
}

exports.Bloc = Bloc;
exports.BlocReact = BlocReact;
exports.Cubit = Cubit;
//# sourceMappingURL=my-lib.js.map

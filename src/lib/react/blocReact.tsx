import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import BlocBase from "../BlocBase";
import { BlocClass, BlocHookData, ValueType } from "../types";
import { BlocConsumer } from "../BlocConsumer";

interface ReactBlocOptions {
  /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
  debug?: boolean;
}

interface BlocHookOptions<T extends BlocBase<any>> {
  subscribe?: boolean;
  shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean;
}

const defaultBlocHookOptions: BlocHookOptions<any> = {
  subscribe: true,
};

class BlocRuntimeError {
  error: Error;

  constructor(message?: string) {
    this.error = new Error(message);
  }
}

export class BlocReact extends BlocConsumer {
  private readonly _contextGlobal: React.Context<BlocBase<any>[]>;
  private _contextLocalProviderKey = React.createContext("");

  // private _contextMapLocal: Record<string, React.Context<Cubit<any>>> = {}

  constructor(blocs: BlocBase<any>[], options: ReactBlocOptions = {}) {
    super(blocs, options);
    this._contextGlobal = React.createContext(blocs);
  }

  useBloc = <T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    options: BlocHookOptions<T> = {}
  ): BlocHookData<T> => {
    const mergedOptions: BlocHookOptions<T> = {
      ...defaultBlocHookOptions,
      ...options,
    };

    const localProviderKey = useContext(this._contextLocalProviderKey);
    const localBlocInstance = this._blocMapLocal[localProviderKey];

    const { subscribe, shouldUpdate = true } = mergedOptions;
    const blocs = useContext(this._contextGlobal);
    const blocInstance =
      localBlocInstance || blocs.find((c) => c instanceof blocClass);

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
      return ([
        (e: null) => e,
        {},
        {
          error,
          complete: true,
        },
      ] as unknown) as BlocHookData<T>;
    }

    const [data, setData] = useState(blocInstance.state);
    const [error, setError] = useState();
    const [complete, setComplete] = useState(false);

    const updateData = useCallback((newState: ValueType<T>) => {
      if (shouldUpdate === true || shouldUpdate(data, newState)) {
        setData(newState);
      }
    }, []);

    useEffect(() => {
      if (subscribe) {
        const subscription = blocInstance.subscribe(updateData, setError, () =>
          setComplete(true)
        );
        return () => subscription.unsubscribe();
      }
    }, [this._contextGlobal]);

    return [
      data,
      blocInstance as T,
      {
        error,
        complete,
      },
    ];
  };

  // Components
  BlocBuilder = <T extends BlocBase<any>>(props: {
    blocClass: BlocClass<T>;
    builder: (data: BlocHookData<T>) => ReactElement;
    shouldUpdate?: (
      previousState: ValueType<T>,
      state: ValueType<T>
    ) => boolean;
  }): ReactElement | null => {
    const hook = this.useBloc(props.blocClass, {
      shouldUpdate: props.shouldUpdate,
    });
    return props.builder(hook);
  };

  GlobalBlocProvider = (props: {
    children?: ReactElement | ReactElement[];
  }): ReactElement => {
    return (
      <this._contextGlobal.Provider value={this.blocListGlobal}>
        {props.children}
      </this._contextGlobal.Provider>
    );
  };

  BlocProvider = <T extends BlocBase<any>>(props: {
    children?: ReactElement | ReactElement[];
    create: (providerKey: string) => T;
  }): ReactElement => {
    const providerKey = useMemo(() => "p_" + nanoid(), []);

    const bloc = useMemo<T>(() => {
      const newBloc = props.create(providerKey);
      newBloc._localProviderRef = providerKey;
      this.addLocalBloc(providerKey, newBloc);

      return newBloc;
    }, []);

    const context = useMemo<React.Context<BlocBase<any>>>(() => {
      return React.createContext<BlocBase<any>>(bloc);
      // this._contextMapLocal[providerKey] = newContext;
    }, [bloc]);

    useEffect(() => {
      return () => {
        this.removeLocalBloc(providerKey);
      };
    }, []);

    return (
      <this._contextLocalProviderKey.Provider value={providerKey}>
        <context.Provider value={bloc}>{props.children}</context.Provider>
      </this._contextLocalProviderKey.Provider>
    );
  };
}

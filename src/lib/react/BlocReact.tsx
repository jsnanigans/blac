import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import BlocBase from "../BlocBase";
import { BlocClass, BlocHookData, ChangeEvent, ValueType } from "../types";
import { BlocConsumer } from "../BlocConsumer";

interface ReactBlocOptions {
}

interface BlocHookOptions<T extends BlocBase<any>> {
  /*
  Boolean value if the hook should update the returned state value when the BLoC state changes.
  Set it to false if you only need access to the methods of a Cubit, or the `add` method on a Bloc
   */
  subscribe?: boolean;
  /*
  Decide weather the returned state value should be updated or not. Will have no effect if `subscribe` is false.
  Receives a ChangeEvent<T> as a parameter and expects a boolean return value.
   */
  shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
}

const defaultBlocHookOptions: BlocHookOptions<any> = {
  subscribe: true
};

class BlocRuntimeError {
  error: Error;

  constructor(message?: string) {
    this.error = new Error(message);
  }
}

class NoValue {
}

export class BlocReact extends BlocConsumer {
  private readonly _blocsGlobal: BlocBase<any>[];
  private _contextLocalProviderKey = React.createContext("");

  constructor(blocs: BlocBase<any>[]) {
    super(blocs);
    this._blocsGlobal = blocs;
    this.BlocProvider = this.BlocProvider.bind(this);
    this.BlocBuilder = this.BlocBuilder.bind(this);
  }

  useBloc = <T extends BlocBase<any>>(
    blocClass: BlocClass<T>,
    options: BlocHookOptions<T> = {}
  ): BlocHookData<T> => {
    const mergedOptions: BlocHookOptions<T> = {
      ...defaultBlocHookOptions,
      ...options
    };

    const localProviderKey = useContext(this._contextLocalProviderKey);
    const localBlocInstance = this._blocMapLocal[localProviderKey];

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
      return ([
        NoValue,
        {},
        {
          error,
          complete: true
        }
      ] as unknown) as BlocHookData<T>;
    }

    const [data, setData] = useState(blocInstance.state);

    const updateData = useCallback((nextState: ValueType<T>) => {
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
      blocInstance as T
    ];
  };

  // Components
  BlocBuilder<T extends BlocBase<any>>(props: {
    blocClass: BlocClass<T>;
    builder: (data: BlocHookData<T>) => ReactElement;
    shouldUpdate?: (event: ChangeEvent<ValueType<T>>) => boolean;
  }): ReactElement | null {
    const hook = this.useBloc(props.blocClass, {
      shouldUpdate: props.shouldUpdate
    });
    return props.builder(hook);
  };

  BlocProvider<T extends BlocBase<any>>(props: {
    children?: ReactElement | ReactElement[];
    create: (providerKey: string) => T;
  }): ReactElement {
    const providerKey = useMemo(() => "p_" + nanoid(), []);

    const bloc = useMemo<T>(() => {
      const newBloc = props.create(providerKey);
      newBloc._localProviderRef = providerKey;
      this.addLocalBloc(providerKey, newBloc);

      return newBloc;
    }, []);

    const context = useMemo<React.Context<BlocBase<any>>>(() => {
      return React.createContext<BlocBase<any>>(bloc);
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

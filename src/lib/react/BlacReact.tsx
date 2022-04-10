import React, { ReactElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import BlocBase from "../BlocBase";
import { BlocClass, BlocHookData, ChangeEvent, ValueType } from "../types";
import { BlacConsumer, ConsumerOptions } from "../BlocConsumer";
import createId from "../createId";

export interface BlocHookOptions<T extends BlocBase<any>> {
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
  /*
  Create a new instance of the bloc, this bloc is not added to the global or any local state.
   */
  create?: () => T;
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

export class BlacReact extends BlacConsumer {
  private readonly _blocsGlobal: BlocBase<any>[];
  private _contextLocalProviderKey = React.createContext<string>('none');

  constructor(blocs: BlocBase<any>[], options?: ConsumerOptions) {
    super(blocs, options);
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
    let blocInstance: BlocBase<T> | undefined = useMemo(() => options.create ? options.create() : undefined, []);

    if (!blocInstance) {
      const localProviderKey = useContext(this._contextLocalProviderKey);
      const localBlocInstance = useMemo(() => this.getLocalBlocForProvider(localProviderKey, blocClass), []);
      blocInstance = useMemo(() => localBlocInstance || this.getGlobalBlocInstance(this._blocsGlobal, blocClass), []);
    }

    const { subscribe, shouldUpdate = true } = mergedOptions;

    if (!blocInstance) {
      const name = blocClass.prototype.constructor.name;
      const error = new BlocRuntimeError(`"${name}" 
      no bloc with this name was found in the global context.
      
      # Solutions:

      1. Wrap your code in a BlocProvider.
      
      2. Add "${name}" to the "Blac" constructor:
        const state = new Blac(
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

    const [data, setData] = useState<ValueType<T>>(blocInstance.state as ValueType<T>);

    const updateData = useCallback((nextState: ValueType<T>) => {
      if (shouldUpdate === true || shouldUpdate({ nextState, currentState: data })) {
        setData(nextState);
      }
    }, []);

    useEffect(() => {
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
    children?: ReactElement | ReactElement[] | false;
    bloc: T | ((id: string) => T);
  }): ReactElement {
    const id = useMemo(() => createId(), []);
    const localProviderKey = useContext(this._contextLocalProviderKey);
    const bloc = useMemo<T>(() => {
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

    const context = useMemo<React.Context<BlocBase<any>>>(() => {
      return React.createContext<BlocBase<any>>(bloc);
    }, [bloc]);

    useEffect(() => {
      return () => {
        this.removeLocalBloc(id, bloc);
      };
    }, []);

    return (
      <this._contextLocalProviderKey.Provider value={id}>
        <context.Provider value={bloc}>{props.children}</context.Provider>
      </this._contextLocalProviderKey.Provider>
    );
  };

  withBlocProvider = <P extends object>(bloc: BlocBase<any> | (() => BlocBase<any>)) => (Component: React.FC<P>): React.FC<P> => {
    const {BlocProvider} = this;
    const WithBlocProvider: React.FC<P> = (props: P) => {
      return (
        <BlocProvider bloc={bloc}>
          <Component {...(props as P)} />
        </BlocProvider>
      );
    };
    return WithBlocProvider;
  }  
}


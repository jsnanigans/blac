import React, {ReactElement, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import Cubit from "./cubit";
import {BehaviorSubject} from "rxjs";

interface BlocLordOptions {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}

type ValueType<T extends Cubit<any>> = T extends Cubit<infer U> ? U : never;

type BlocHookData<T extends Cubit<any>> = [
    value: ValueType<T>,
    instance: T,
    stream: {
        stream: BehaviorSubject<T>,
        error: any,
        complete: boolean,
    }]

interface BlocHookOptions<T extends Cubit<any>> {
    subscribe?: boolean;
    shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean;
}

const defaultBlocHookOptions: BlocHookOptions<any> = {
    subscribe: true,
};

export class BlocReact {
    observer: null | ((bloc: Cubit<any>, value: any) => void) = null;
    debug: boolean;
    private _blocListGlobal: Cubit<any>[];
    private _contextGlobal: React.Context<Cubit<any>[]>;
    private _contextLocalProviderKey = React.createContext('');

    private _blocMapLocal: Record<string, Cubit<any>> = {};
    // private _contextMapLocal: Record<string, React.Context<Cubit<any>>> = {}

    constructor(blocs: Cubit<any>[], options: BlocLordOptions = {}) {
        this._blocListGlobal = blocs;
        this._contextGlobal = React.createContext(blocs);
        this.debug = options.debug || false;

        if (this.debug) {
            for (const b of blocs) {
                b.subject.subscribe((v: any) => this.notify(b, v));
            }
        }
    }

    notify(bloc: Cubit<any>, value: any) {
        if (this.observer) {
            this.observer(bloc, value);
        }
    }

    useBloc = <T extends Cubit<any>>(blocClass: new (...args: never[]) => T, options: BlocHookOptions<T> = {}): BlocHookData<T> => {
        const mergedOptions: BlocHookOptions<T> = {
            ...defaultBlocHookOptions,
            ...options,
        };

        const localProviderKey = useContext(this._contextLocalProviderKey);
        const localBlocInstance = this._blocMapLocal[localProviderKey];
        console.log({localBlocInstance})

        const {subscribe, shouldUpdate = true} = mergedOptions;
        const blocs = useContext(this._contextGlobal);
        const blocInstance = localBlocInstance || blocs.find(c => c instanceof blocClass)

        if (!blocInstance) {
            throw new Error(`No block found for ${blocClass}`);
        }

        const streamRef = useRef(blocInstance.subject);
        const [data, setData] = useState(streamRef.current.getValue());
        const [error, setError] = useState();
        const [complete, setComplete] = useState(false);

        const updateData = useCallback((newState: ValueType<T>) => {
            if (shouldUpdate === true || shouldUpdate(data, newState)) {
                setData(newState);
            }
        }, []);

        useEffect(() => {
            if (subscribe) {
                const subscription = streamRef.current.subscribe(updateData, setError, () =>
                    setComplete(true),
                );
                return () => subscription.unsubscribe();
            }
        }, [this._contextGlobal]);

        return [
            data,
            blocInstance as T,
            {
                stream: streamRef.current,
                error,
                complete,
            }];
    };

    // Components
    BlocBuilder = <T extends Cubit<any>>(props: {
        bloc: new (...args: never[]) => T;
        builder: (data: BlocHookData<T>) => ReactElement;
        shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean,
    }): ReactElement => {
        return props.builder(this.useBloc(props.bloc, {
            shouldUpdate: props.shouldUpdate,
        }));
    };

    GlobalBlocProvider = (props: {
        children?: ReactElement | ReactElement[],
    }) => {
        return (
            <this._contextGlobal.Provider value={this._blocListGlobal}>{props.children}</this._contextGlobal.Provider>);
    };

    BlocProvider = <T extends Cubit<any>>(props: {
        children?: ReactElement | ReactElement[],
        create: () => T
    }) => {
        const providerRef = useMemo<string>(() => `${Math.random()}`, []);

        const bloc = useMemo<T>(() => {
            const newBloc = props.create();
            newBloc.localProviderRef = providerRef;
            this._blocMapLocal[providerRef] = newBloc;
            return newBloc;
        }, []);

        const context = useMemo<React.Context<Cubit<any>>>(() => {
            const newContext = React.createContext<Cubit<any>>(bloc);
            // this._contextMapLocal[providerRef] = newContext;
            return newContext;
        }, [bloc]);

        console.log({providerRef, context})

        return (
            <this._contextLocalProviderKey.Provider value={providerRef}>
                <context.Provider value={bloc}>{props.children}</context.Provider>
            </this._contextLocalProviderKey.Provider>
        )
    };
}


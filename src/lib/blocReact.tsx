import React, {ReactElement, useCallback, useContext, useEffect, useRef, useState} from 'react';
import Cubit from "./cubit";
import {BehaviorSubject} from "rxjs";

interface BlocLordOptions {
    /** Enables debugging which calls BlocReact.observer every time a Subject is updated. Defaults to false */
    debug?: boolean;
}

type ValueType<T extends Cubit<any>> = T extends Cubit<infer U> ? U : never;

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

    constructor(createBlocs: () => Cubit<any>[], options: BlocLordOptions = {}) {
        const blocs = createBlocs();
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

    useBloc = <T extends Cubit<any>>(blocClass: new (...args: never[]) => T, options: BlocHookOptions<T> = {}): [
        value: ValueType<T>,
        instance: T,
        stream: {
            stream: BehaviorSubject<T>,
            error: any,
            complete: boolean,
        }] => {
        const mergedOptions: BlocHookOptions<T> = {
            ...defaultBlocHookOptions,
            ...options,
        };

        const {subscribe, shouldUpdate = true} = mergedOptions;
        const blocs = useContext(this._contextGlobal);
        const blocInstance = blocs.find(c => c instanceof blocClass);

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
        builder: (state: ValueType<T>) => ReactElement;
        shouldUpdate?: (previousState: ValueType<T>, state: ValueType<T>) => boolean,
    }): ReactElement => {
        const [value] = this.useBloc(props.bloc, {
            shouldUpdate: props.shouldUpdate,
        });
        return props.builder(value);
    };

    GlobalBlocProvider = (props: {
        children: ReactElement | ReactElement[],
    }) => {
        console.log('rerender');
        return (
            <this._contextGlobal.Provider value={this._blocListGlobal}>{props.children}</this._contextGlobal.Provider>);
    };
}


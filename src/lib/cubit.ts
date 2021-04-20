import {BehaviorSubject} from "rxjs";

export interface CubitOptions {
    persistKey?: string;
    persistData?: boolean;
}

export const cubitDefaultOptions: CubitOptions = {
    persistKey: '',
    persistData: true,
};

export default class Cubit<T> {
    protected readonly _subject: BehaviorSubject<T>;
    private readonly _options: CubitOptions;
    localProviderRef: string = '';
    onChange: null | ((change: {currentState: T, nextState: T}) => void) = null;

    constructor(initialValue: T, cubitOptions: CubitOptions = {}) {
        const options = {...cubitDefaultOptions, ...cubitOptions};
        this._options = options;
        let value = initialValue;

        if (options.persistKey && options.persistData) {
            const cachedValue = this.getCachedValue();
            if (cachedValue) {
                value = cachedValue;
            }
        }

        this._subject = new BehaviorSubject(value);
    }

    protected emit = (value: T): void => {
        this.notifyChange(value);
        this.subject.next(value);
        this.updateCache();
    }

    protected notifyChange(value: T) {
        this.onChange?.({
            currentState: this._subject.getValue(),
            nextState: value,
        })
    }

    get subject(): BehaviorSubject<T> {
        return this._subject;
    }

    get state(): T {
        return this.subject.getValue();
    }

    set persistData(setTo: boolean) {
        const previousOptions = {...this._options};
        this._options.persistData = setTo;
        if (!setTo) {
            this.clearCache();
        } else if (previousOptions.persistData === false) {
            this.updateCache();
        }
    }

    parseFromCache(value: string): T {
        return JSON.parse(value).value;
    }

    parseToCache(value: T): string {
        return JSON.stringify({value});
    }

    // caching
    protected getCachedValue(): T | undefined {
        const cachedValue = localStorage.getItem(`data.${this._options.persistKey}`);
        if (cachedValue) {
            try {
                return this.parseFromCache(cachedValue);
            } catch (e) {
                console.error(e);
            }
        }
        return;
    }

    protected updateCache(): void {
        const {persistData, persistKey} = this._options;
        if (persistData && persistKey) {
            localStorage.setItem(`data.${persistKey}`, this.parseToCache(this.subject.getValue()));
        } else {
            this.clearCache();
        }
    }

    protected clearCache(): void {
        const key = this._options.persistKey;
        if (key && this._options.persistData) {
            localStorage.removeItem(`data.${key}`);
        }
    }
}